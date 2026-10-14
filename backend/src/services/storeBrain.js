const { randomUUID } = require("node:crypto");
const db = require("../db/database");

const SETTINGS = {
  targetDaysOfStock: 4,
  lowStockDaysOfCover: 2,
  expiryWarningDays: 2,
  slowMovingWindowDays: 7,
  slowMovingMaximumUnitsSold: 2,
};

function recordEvent({
  runId,
  dayNumber,
  productId = null,
  eventType,
  severity = "info",
  description,
  actionTaken = null,
  outcome = null,
}) {
  db.prepare(
    `
    INSERT INTO store_brain_events (
      id, run_id, day_number, product_id,
      event_type, severity, description, action_taken, outcome
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    randomUUID(),
    runId,
    dayNumber,
    productId,
    eventType,
    severity,
    description,
    actionTaken,
    outcome,
  );
}

function getProductStock(runId, dayNumber) {
  return db
    .prepare(
      `
    SELECT
      rp.product_id AS productId,
      rp.name,
      rp.category,
      rp.unit_cost_cents AS unitCostCents,
      rp.unit_price_cents AS unitPriceCents,
      rp.is_perishable AS isPerishable,
      rp.shelf_life_days AS shelfLifeDays,
      COALESCE(SUM(
        CASE
          WHEN l.remaining_quantity > 0
            AND (l.expiry_day IS NULL OR l.expiry_day > ?)
          THEN l.remaining_quantity
          ELSE 0
        END
      ), 0) AS availableStock
    FROM run_products rp
    LEFT JOIN inventory_lots l
      ON l.run_id = rp.run_id
      AND l.product_id = rp.product_id
    WHERE rp.run_id = ?
    GROUP BY
      rp.product_id, rp.name, rp.category,
      rp.unit_cost_cents, rp.unit_price_cents,
      rp.is_perishable, rp.shelf_life_days
    ORDER BY rp.product_id
  `,
    )
    .all(dayNumber, runId);
}

function getRecentSales(runId, productId, dayNumber) {
  const firstDay = Math.max(1, dayNumber - SETTINGS.slowMovingWindowDays + 1);

  return db
    .prepare(
      `
    SELECT
      COALESCE(SUM(-quantity_change), 0) AS unitsSold
    FROM inventory_movements
    WHERE run_id = ?
      AND product_id = ?
      AND movement_type = 'sale'
      AND day_number >= ?
      AND day_number <= ?
  `,
    )
    .get(runId, productId, firstDay, dayNumber).unitsSold;
}

// Run at the start of each day, before customers arrive.
// Expiry day is exclusive: a lot with expiry_day = dayNumber
// cannot be sold on that day.
function processExpiry(runId, dayNumber) {
  const expiredLots = db
    .prepare(
      `
    SELECT
      id,
      product_id AS productId,
      remaining_quantity AS quantity,
      unit_cost_cents AS unitCostCents
    FROM inventory_lots
    WHERE run_id = ?
      AND expiry_day IS NOT NULL
      AND expiry_day <= ?
      AND remaining_quantity > 0
    ORDER BY expiry_day, id
  `,
    )
    .all(runId, dayNumber);

  const expireLot = db.prepare(`
    UPDATE inventory_lots
    SET remaining_quantity = 0
    WHERE id = ?
      AND remaining_quantity = ?
  `);

  const insertMovement = db.prepare(`
    INSERT INTO inventory_movements (
      run_id, day_number, product_id, movement_type,
      quantity_change, unit_cost_cents, reference_id
    )
    VALUES (?, ?, ?, 'expiry_writeoff', ?, ?, ?)
  `);

  const updateDaily = db.prepare(`
    UPDATE daily_reports
    SET expiry_writeoff_cents =
      expiry_writeoff_cents + ?
    WHERE run_id = ? AND day_number = ?
  `);

  let totalUnits = 0;
  let totalValueCents = 0;

  for (const lot of expiredLots) {
    const result = expireLot.run(lot.id, lot.quantity);

    if (result.changes !== 1) {
      throw new Error(`Could not expire inventory lot ${lot.id}.`);
    }

    const writeoffValue = lot.quantity * lot.unitCostCents;

    insertMovement.run(
      runId,
      dayNumber,
      lot.productId,
      -lot.quantity,
      lot.unitCostCents,
      `expiry:${lot.id}`,
    );

    totalUnits += lot.quantity;
    totalValueCents += writeoffValue;

    recordEvent({
      runId,
      dayNumber,
      productId: lot.productId,
      eventType: "expiry_writeoff",
      severity: "warning",
      description:
        `${lot.quantity} units expired; inventory cost ` +
        `${writeoffValue} cents.`,
      actionTaken: "Removed expired units from sale.",
      outcome: "Expired stock written off.",
    });
  }

  if (totalValueCents > 0) {
    updateDaily.run(totalValueCents, runId, dayNumber);
  }

  return { totalUnits, totalValueCents };
}

// Receive orders placed on the previous day.
function receiveReplenishment(runId, dayNumber) {
  if (dayNumber <= 1) return [];

  const orders = db
    .prepare(
      `
    SELECT id, total_cost_cents AS totalCostCents
    FROM replenishment_orders
    WHERE run_id = ?
      AND expected_delivery_day = ?
      AND status = 'ordered'
  `,
    )
    .all(runId, dayNumber);

  const getItems = db.prepare(`
    SELECT
      product_id AS productId,
      quantity,
      unit_cost_cents AS unitCostCents
    FROM replenishment_items
    WHERE order_id = ?
  `);

  const insertLot = db.prepare(`
    INSERT INTO inventory_lots (
      id, run_id, product_id, received_day, expiry_day,
      original_quantity, remaining_quantity, unit_cost_cents
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMovement = db.prepare(`
    INSERT INTO inventory_movements (
      run_id, day_number, product_id, movement_type,
      quantity_change, unit_cost_cents, reference_id
    )
    VALUES (?, ?, ?, 'replenishment_received', ?, ?, ?)
  `);

  const markReceived = db.prepare(`
    UPDATE replenishment_orders
    SET status = 'received'
    WHERE id = ? AND status = 'ordered'
  `);

  const getShelfLife = db.prepare(`
    SELECT is_perishable, shelf_life_days
    FROM run_products
    WHERE run_id = ? AND product_id = ?
  `);

  const receive = db.transaction(() => {
    const received = [];

    for (const order of orders) {
      for (const item of getItems.all(order.id)) {
        const product = getShelfLife.get(runId, item.productId);

        if (!product) {
          throw new Error(
            `Product ${item.productId} is missing from run ${runId}.`,
          );
        }

        const expiryDay = product.is_perishable
          ? dayNumber + product.shelf_life_days
          : null;

        insertLot.run(
          randomUUID(),
          runId,
          item.productId,
          dayNumber,
          expiryDay,
          item.quantity,
          item.quantity,
          item.unitCostCents,
        );

        insertMovement.run(
          runId,
          dayNumber,
          item.productId,
          item.quantity,
          item.unitCostCents,
          order.id,
        );

        recordEvent({
          runId,
          dayNumber,
          productId: item.productId,
          eventType: "replenishment_received",
          description: `Received ${item.quantity} units.`,
          actionTaken: "Added delivery to inventory.",
          outcome: "Stock available for sale.",
        });

        received.push({
          productId: item.productId,
          quantity: item.quantity,
        });
      }

      const result = markReceived.run(order.id);

      if (result.changes !== 1) {
        throw new Error(`Could not mark order ${order.id} received.`);
      }
    }

    return received;
  });

  return receive();
}

// Inspect stock and make replenishment decisions at end of day.
function inspectAndReplenish(runId, dayNumber) {
  const products = getProductStock(runId, dayNumber);
  const orders = [];
  const alerts = [];

  const openingCash = db
    .prepare(
      `
    SELECT opening_cash_cents AS amount
    FROM simulation_runs
    WHERE id = ?
  `,
    )
    .get(runId);

  if (!openingCash) throw new Error("Simulation run not found.");

  // Ledger convention:
  // opening + sales revenue - replenishment spending.
  const cash = db
    .prepare(
      `
    SELECT COALESCE(SUM(
      CASE
        WHEN entry_type IN ('opening', 'sales_revenue') THEN amount_cents
        WHEN entry_type = 'replenishment' THEN -amount_cents
        ELSE 0
      END
    ), 0) AS balance
    FROM cash_ledger
    WHERE run_id = ?
  `,
    )
    .get(runId).balance;

  const pendingOrders = db
    .prepare(
      `
    SELECT COALESCE(SUM(total_cost_cents), 0) AS amount
    FROM replenishment_orders
    WHERE run_id = ? AND status = 'ordered'
  `,
    )
    .get(runId).amount;

  // Pending orders have already been paid for. The ledger balance
  // therefore already excludes them; do not deduct them twice.
  let availableCash = cash;
  const closingStock = [];

  for (const product of products) {
    const soldRecently = getRecentSales(runId, product.productId, dayNumber);

    const dailyDemand = soldRecently / SETTINGS.slowMovingWindowDays;

    const reorderThreshold = Math.max(
      2,
      Math.ceil(dailyDemand * SETTINGS.lowStockDaysOfCover),
    );

    const targetStock = Math.max(
      reorderThreshold,
      Math.ceil(dailyDemand * SETTINGS.targetDaysOfStock),
    );

    const lotsApproachingExpiry = db
      .prepare(
        `
      SELECT id, expiry_day, remaining_quantity
      FROM inventory_lots
      WHERE run_id = ?
        AND product_id = ?
        AND remaining_quantity > 0
        AND expiry_day IS NOT NULL
        AND expiry_day > ?
        AND expiry_day <= ?
    `,
      )
      .all(
        runId,
        product.productId,
        dayNumber,
        dayNumber + SETTINGS.expiryWarningDays,
      );

    for (const lot of lotsApproachingExpiry) {
      alerts.push({
        productId: product.productId,
        type: "expiry_warning",
        message: `${lot.remaining_quantity} units are approaching expiry.`,
      });

      recordEvent({
        runId,
        dayNumber,
        productId: product.productId,
        eventType: "expiry_warning",
        severity: "warning",
        description: `${lot.remaining_quantity} units expire on day ${lot.expiry_day}.`,
        actionTaken: "Flagged for remote manager attention.",
        outcome: "Expiry warning recorded.",
      });
    }

    if (product.availableStock === 0) {
      alerts.push({
        productId: product.productId,
        type: "sold_out",
        message: "No unexpired stock remains available.",
      });

      recordEvent({
        runId,
        dayNumber,
        productId: product.productId,
        eventType: "sold_out",
        severity: "critical",
        description: "No unexpired stock remains available for sale.",
        actionTaken: "Considered for replenishment.",
        outcome: "Stockout recorded.",
      });
    } else if (product.availableStock <= reorderThreshold) {
      alerts.push({
        productId: product.productId,
        type: "low_stock",
        message: `Available stock: ${product.availableStock}.`,
      });

      recordEvent({
        runId,
        dayNumber,
        productId: product.productId,
        eventType: "low_stock",
        severity: "warning",
        description: `Stock is at or below the reorder threshold of ${reorderThreshold}.`,
        actionTaken: "Reviewed for replenishment.",
        outcome: "Low-stock event recorded.",
      });
    }

    if (
      soldRecently <= SETTINGS.slowMovingMaximumUnitsSold &&
      product.availableStock > targetStock
    ) {
      alerts.push({
        productId: product.productId,
        type: "slow_moving",
        message: `${soldRecently} units sold in the recent observation window.`,
      });

      recordEvent({
        runId,
        dayNumber,
        productId: product.productId,
        eventType: "slow_moving",
        severity: "info",
        description: `${soldRecently} units sold over the recent observation window.`,
        actionTaken: "Reduced replenishment priority.",
        outcome: "Slow-moving stock identified.",
      });
    }

    closingStock.push({
      productId: product.productId,
      availableStock: product.availableStock,
      recentUnitsSold: soldRecently,
      reorderThreshold,
      targetStock,
    });
  }

  // Day 60 has no following day, so no replenishment order is placed.
  if (dayNumber === 60) {
    return {
      dayNumber,
      cashBeforeOrdersCents: availableCash,
      pendingOrdersCents: pendingOrders,
      alerts,
      closingStock,
      orders,
      note: "No orders placed after Day 60.",
    };
  }

  const insertOrder = db.prepare(`
    INSERT INTO replenishment_orders (
      id, run_id, order_day, expected_delivery_day,
      status, total_cost_cents
    )
    VALUES (?, ?, ?, ?, 'ordered', ?)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO replenishment_items (
      order_id, product_id, quantity,
      unit_cost_cents, line_cost_cents
    )
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertCash = db.prepare(`
    INSERT INTO cash_ledger (
      run_id, day_number, entry_type, amount_cents, reference_id
    )
    VALUES (?, ?, 'replenishment', ?, ?)
  `);

  const updateDailyCash = db.prepare(`
    UPDATE daily_reports
    SET closing_cash_cents = closing_cash_cents - ?
    WHERE run_id = ? AND day_number = ?
  `);

  const createOrders = db.transaction(() => {
    for (const product of products) {
      const soldRecently = getRecentSales(runId, product.productId, dayNumber);

      const dailyDemand = soldRecently / SETTINGS.slowMovingWindowDays;

      const reorderThreshold = Math.max(
        2,
        Math.ceil(dailyDemand * SETTINGS.lowStockDaysOfCover),
      );

      const targetStock = Math.max(
        reorderThreshold,
        Math.ceil(dailyDemand * SETTINGS.targetDaysOfStock),
      );

      const quantityToOrder = Math.max(0, targetStock - product.availableStock);

      if (quantityToOrder === 0) continue;

      const unitCost = product.unitCostCents;
      const desiredCost = quantityToOrder * unitCost;

      if (desiredCost === 0) continue;

      // Never place an order that exceeds remaining cash.
      const affordableQuantity = Math.min(
        quantityToOrder,
        Math.floor(availableCash / unitCost),
      );

      if (affordableQuantity <= 0) {
        recordEvent({
          runId,
          dayNumber,
          productId: product.productId,
          eventType: "cash_constraint",
          severity: "warning",
          description: `Insufficient operating cash to replenish ${product.name}.`,
          actionTaken: "Replenishment skipped.",
          outcome: "No order placed.",
        });

        alerts.push({
          productId: product.productId,
          type: "cash_constraint",
          message: "Insufficient cash for replenishment.",
        });

        continue;
      }

      const orderCost = affordableQuantity * unitCost;
      const orderId = randomUUID();

      insertOrder.run(orderId, runId, dayNumber, dayNumber + 1, orderCost);

      insertOrderItem.run(
        orderId,
        product.productId,
        affordableQuantity,
        unitCost,
        orderCost,
      );

      insertCash.run(runId, dayNumber, orderCost, orderId);

      updateDailyCash.run(orderCost, runId, dayNumber);

      availableCash -= orderCost;

      orders.push({
        orderId,
        productId: product.productId,
        quantity: affordableQuantity,
        totalCostCents: orderCost,
        expectedDeliveryDay: dayNumber + 1,
      });

      recordEvent({
        runId,
        dayNumber,
        productId: product.productId,
        eventType: "replenishment_ordered",
        severity: "info",
        description: `Ordered ${affordableQuantity} units for ${orderCost} cents.`,
        actionTaken: "Placed replenishment order.",
        outcome: `Expected on Day ${dayNumber + 1}.`,
      });

      if (affordableQuantity < quantityToOrder) {
        recordEvent({
          runId,
          dayNumber,
          productId: product.productId,
          eventType: "cash_constraint",
          severity: "warning",
          description: `Requested ${quantityToOrder} units but only ${affordableQuantity} were affordable.`,
          actionTaken: "Reduced the order to the affordable quantity.",
          outcome: "Cash constraint respected.",
        });
      }
    }
  });

  createOrders();

  return {
    dayNumber,
    cashBeforeOrdersCents: cash,
    cashAfterOrdersCents: availableCash,
    pendingOrdersCents: pendingOrders,
    alerts,
    closingStock,
    orders,
  };
}

module.exports = {
  SETTINGS,
  processExpiry,
  receiveReplenishment,
  inspectAndReplenish,
};
