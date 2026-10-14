const { randomUUID } = require("node:crypto");
const db = require("../db/database");

function checkoutCustomer({
  runId,
  dayNumber,
  customerType,
  shoppingMission,
  basket,
}) {
  if (!runId) throw new Error("runId is required.");

  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 60) {
    throw new Error("dayNumber must be between 1 and 60.");
  }

  if (!Array.isArray(basket)) {
    throw new Error("basket must be an array.");
  }

  const run = db
    .prepare(
      `
    SELECT id, status
    FROM simulation_runs
    WHERE id = ?
  `,
    )
    .get(runId);

  if (!run) throw new Error("Simulation run not found.");

  if (!["created", "running"].includes(run.status)) {
    throw new Error("This simulation run is not open for sales.");
  }

  const dailyReport = db
    .prepare(
      `
    SELECT day_number
    FROM daily_reports
    WHERE run_id = ? AND day_number = ?
  `,
    )
    .get(runId, dayNumber);

  if (!dailyReport) {
    throw new Error("Daily report does not exist for this run and day.");
  }

  if (typeof customerType !== "string" || !customerType.trim()) {
    throw new Error("customerType is required.");
  }

  if (typeof shoppingMission !== "string" || !shoppingMission.trim()) {
    throw new Error("shoppingMission is required.");
  }

  // Validate the whole basket before making any changes.
  const requested = new Map();

  for (const item of basket) {
    if (
      typeof item.productId !== "string" ||
      !Number.isInteger(item.requestedQuantity) ||
      item.requestedQuantity <= 0
    ) {
      throw new Error(
        "Each basket item requires a productId and a positive integer requestedQuantity.",
      );
    }

    requested.set(
      item.productId,
      (requested.get(item.productId) || 0) + item.requestedQuantity,
    );
  }

  const findRunProduct = db.prepare(`
    SELECT
      product_id AS productId,
      name,
      unit_cost_cents AS unitCostCents,
      unit_price_cents AS unitPriceCents,
      is_perishable AS isPerishable,
      shelf_life_days AS shelfLifeDays
    FROM run_products
    WHERE run_id = ? AND product_id = ?
  `);

  for (const productId of requested.keys()) {
    if (!findRunProduct.get(runId, productId)) {
      throw new Error(
        `Product ${productId} is not part of this run's catalogue.`,
      );
    }
  }

  const insertCustomer = db.prepare(`
    INSERT INTO customers (
      id, run_id, day_number, customer_type, shopping_mission
    )
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertTransaction = db.prepare(`
    INSERT INTO transactions (
      id, run_id, day_number, customer_id, total_cents
    )
    VALUES (?, ?, ?, ?, ?)
  `);

  const updateTransactionTotal = db.prepare(`
    UPDATE transactions SET total_cents = ? WHERE id = ?
  `);

  const insertTransactionItem = db.prepare(`
    INSERT INTO transaction_items (
      transaction_id, product_id, quantity,
      unit_price_cents, unit_cost_cents, line_total_cents
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertDemand = db.prepare(`
    INSERT INTO demand_records (
      id, run_id, day_number, customer_id, product_id,
      requested_quantity, fulfilled_quantity
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const findAvailableLots = db.prepare(`
    SELECT id, remaining_quantity, unit_cost_cents
    FROM inventory_lots
    WHERE run_id = ?
      AND product_id = ?
      AND remaining_quantity > 0
      AND (
        expiry_day IS NULL
        OR expiry_day > ?
      )
    ORDER BY
      CASE WHEN expiry_day IS NULL THEN 1 ELSE 0 END,
      expiry_day ASC,
      received_day ASC,
      id ASC
  `);

  const consumeLot = db.prepare(`
    UPDATE inventory_lots
    SET remaining_quantity = remaining_quantity - ?
    WHERE id = ?
      AND remaining_quantity >= ?
  `);

  const insertMovement = db.prepare(`
    INSERT INTO inventory_movements (
      run_id, day_number, product_id,
      movement_type, quantity_change,
      unit_cost_cents, reference_id
    )
    VALUES (?, ?, ?, 'sale', ?, ?, ?)
  `);

  const insertCash = db.prepare(`
    INSERT INTO cash_ledger (
      run_id, day_number, entry_type, amount_cents, reference_id
    )
    VALUES (?, ?, 'sales_revenue', ?, ?)
  `);

  const updateDailyReport = db.prepare(`
    UPDATE daily_reports
    SET
      customers = customers + 1,
      transaction_count = transaction_count + ?,
      units_sold = units_sold + ?,
      revenue_cents = revenue_cents + ?,
      cogs_cents = cogs_cents + ?,
      gross_profit_cents = gross_profit_cents + ?
    WHERE run_id = ? AND day_number = ?
  `);

  const addCashToDailyReport = db.prepare(`
    UPDATE daily_reports
    SET closing_cash_cents = closing_cash_cents + ?
    WHERE run_id = ? AND day_number = ?
  `);

  const performCheckout = db.transaction(() => {
    const customerId = randomUUID();
    const transactionId = randomUUID();

    insertCustomer.run(
      customerId,
      runId,
      dayNumber,
      customerType.trim(),
      shoppingMission.trim(),
    );

    let revenueCents = 0;
    let cogsCents = 0;
    let unitsSold = 0;

    const soldItems = [];
    const unmetDemand = [];

    for (const [productId, requestedQuantity] of requested) {
      const product = findRunProduct.get(runId, productId);

      let remainingDemand = requestedQuantity;
      let fulfilledQuantity = 0;

      // A transaction is recorded only if at least one unit is sold.
      const lots = findAvailableLots.all(runId, productId, dayNumber);

      for (const lot of lots) {
        if (remainingDemand <= 0) break;

        const quantity = Math.min(remainingDemand, lot.remaining_quantity);

        const result = consumeLot.run(quantity, lot.id, quantity);

        if (result.changes !== 1) {
          throw new Error(
            `Concurrent inventory change detected for ${productId}.`,
          );
        }

        const lineRevenue = quantity * product.unitPriceCents;
        const lineCogs = quantity * lot.unit_cost_cents;

        insertMovement.run(
          runId,
          dayNumber,
          productId,
          -quantity,
          lot.unit_cost_cents,
          transactionId,
        );

        revenueCents += lineRevenue;
        cogsCents += lineCogs;
        unitsSold += quantity;
        fulfilledQuantity += quantity;
        remainingDemand -= quantity;

        soldItems.push({
          productId,
          productName: product.name,
          quantity,
          unitPriceCents: product.unitPriceCents,
          unitCostCents: lot.unit_cost_cents,
          lineTotalCents: lineRevenue,
        });
      }

      insertDemand.run(
        randomUUID(),
        runId,
        dayNumber,
        customerId,
        productId,
        requestedQuantity,
        fulfilledQuantity,
      );

      if (remainingDemand > 0) {
        unmetDemand.push({
          productId,
          requestedQuantity,
          fulfilledQuantity,
          unmetQuantity: remainingDemand,
        });
      }
    }

    const completedTransaction = soldItems.length > 0;

    if (completedTransaction) {
      // Insert the parent transaction first to satisfy the foreign key.
      insertTransaction.run(
        transactionId,
        runId,
        dayNumber,
        customerId,
        revenueCents,
      );

      // Then insert its individual product lines.
      for (const item of soldItems) {
        insertTransactionItem.run(
          transactionId,
          item.productId,
          item.quantity,
          item.unitPriceCents,
          item.unitCostCents,
          item.lineTotalCents,
        );
      }
    }

    // The customer is counted even if no purchase is completed.
    // Only completed purchases count as transactions.
    updateDailyReport.run(
      completedTransaction ? 1 : 0,
      unitsSold,
      revenueCents,
      cogsCents,
      revenueCents - cogsCents,
      runId,
      dayNumber,
    );

    if (revenueCents > 0) {
      insertCash.run(runId, dayNumber, revenueCents, transactionId);

      addCashToDailyReport.run(revenueCents, runId, dayNumber);
    }

    return {
      runId,
      dayNumber,
      customerId,
      transactionId: completedTransaction ? transactionId : null,
      transactionCompleted: completedTransaction,
      revenueCents,
      cogsCents,
      grossProfitCents: revenueCents - cogsCents,
      unitsSold,
      soldItems,
      unmetDemand,
    };
  });

  return performCheckout();
}

module.exports = { checkoutCustomer };
