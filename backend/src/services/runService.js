const { randomUUID } = require("node:crypto");
const db = require("../db/database");
const { products, openingInventoryCostCents } = require("../db/seedProducts");

const OPENING_CASH_CENTS = 1_500_000;
const MAX_INVENTORY_BUDGET_CENTS = 4_000_000;
const SIMULATION_DAYS = 60;
const MODEL_VERSION = "1.0.0";

function initializeRun({ startDate = "2026-01-01" } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    throw new Error("startDate must use YYYY-MM-DD format.");
  }

  const parsedDate = new Date(`${startDate}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== startDate
  ) {
    throw new Error("startDate must be a valid calendar date.");
  }

  if (openingInventoryCostCents > MAX_INVENTORY_BUDGET_CENTS) {
    throw new Error("Opening inventory exceeds the A$40,000 budget.");
  }

  const runId = randomUUID();

  const configuration = {
    simulationDays: SIMULATION_DAYS,
    startDate,
    openingInventoryBudgetCents: MAX_INVENTORY_BUDGET_CENTS,
    openingInventoryCostCents,
    openingCashCents: OPENING_CASH_CENTS,
    modelVersion: MODEL_VERSION,
    demandModel: {
      status: "pending",
      description:
        "Customer and product demand rules will be implemented in Step 5.",
    },
    storeBrain: {
      status: "pending",
      replenishmentLeadTimeDays: 1,
    },
    expiryConvention:
      "A lot expires at the start of its expiry day and cannot be sold that day.",
  };

  const insertRun = db.prepare(`
    INSERT INTO simulation_runs (
      id,
      status,
      opening_inventory_budget_cents,
      opening_cash_cents,
      config_json,
      model_version
    )
    VALUES (?, 'created', ?, ?, ?, ?)
  `);

  const insertRunProduct = db.prepare(`
    INSERT INTO run_products (
      run_id,
      product_id,
      name,
      category,
      unit_cost_cents,
      unit_price_cents,
      is_perishable,
      shelf_life_days,
      initial_quantity
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDailyReport = db.prepare(`
    INSERT INTO daily_reports (
      run_id,
      day_number,
      simulated_date,
      closing_cash_cents
    )
    VALUES (?, ?, ?, ?)
  `);

  const insertLot = db.prepare(`
    INSERT INTO inventory_lots (
      id,
      run_id,
      product_id,
      received_day,
      expiry_day,
      original_quantity,
      remaining_quantity,
      unit_cost_cents
    )
    VALUES (?, ?, ?, 1, ?, ?, ?, ?)
  `);

  const insertMovement = db.prepare(`
    INSERT INTO inventory_movements (
      run_id,
      day_number,
      product_id,
      movement_type,
      quantity_change,
      unit_cost_cents,
      reference_id
    )
    VALUES (?, 1, ?, 'opening', ?, ?, ?)
  `);

  const insertOpeningCash = db.prepare(`
    INSERT INTO cash_ledger (
      run_id,
      day_number,
      entry_type,
      amount_cents,
      reference_id
    )
    VALUES (?, 1, 'opening', ?, ?)
  `);

  const createRun = db.transaction(() => {
    insertRun.run(
      runId,
      MAX_INVENTORY_BUDGET_CENTS,
      OPENING_CASH_CENTS,
      JSON.stringify(configuration),
      MODEL_VERSION,
    );

    // Save the complete 60-day reporting timeline.
    for (let day = 1; day <= SIMULATION_DAYS; day++) {
      const date = new Date(parsedDate);
      date.setUTCDate(date.getUTCDate() + day - 1);

      insertDailyReport.run(
        runId,
        day,
        date.toISOString().slice(0, 10),
        OPENING_CASH_CENTS,
      );
    }

    // Freeze the catalogue and initial quantities for this run.
    for (const product of products) {
      const costCents = Math.round(product.cost * 100);
      const priceCents = Math.round(product.price * 100);
      const quantity = product.qty;

      insertRunProduct.run(
        runId,
        product.id,
        product.name,
        product.category,
        costCents,
        priceCents,
        product.perishable ? 1 : 0,
        product.shelf,
        quantity,
      );

      // Opening stock is received on Day 1.
      // Expiry day is exclusive: stock cannot be sold on that day.
      const expiryDay = product.perishable ? 1 + product.shelf : null;

      if (quantity > 0) {
        insertLot.run(
          randomUUID(),
          runId,
          product.id,
          expiryDay,
          quantity,
          quantity,
          costCents,
        );

        insertMovement.run(
          runId,
          product.id,
          quantity,
          costCents,
          `opening:${runId}:${product.id}`,
        );
      }
    }

    insertOpeningCash.run(runId, OPENING_CASH_CENTS, `opening-cash:${runId}`);
  });

  createRun();

  return getRunSummary(runId);
}

function getRunSummary(runId) {
  const run = db
    .prepare(
      `
    SELECT
      id,
      status,
      opening_inventory_budget_cents AS openingInventoryBudgetCents,
      opening_cash_cents AS openingCashCents,
      config_json AS configJson,
      model_version AS modelVersion,
      created_at AS createdAt,
      completed_at AS completedAt
    FROM simulation_runs
    WHERE id = ?
  `,
    )
    .get(runId);

  if (!run) {
    return null;
  }

  const inventory = db
    .prepare(
      `
    SELECT
      COUNT(*) AS productCount,
      SUM(initial_quantity) AS totalOpeningUnits,
      SUM(initial_quantity * unit_cost_cents) AS openingInventoryCostCents
    FROM run_products
    WHERE run_id = ?
  `,
    )
    .get(runId);

  const history = db
    .prepare(
      `
    SELECT
      COUNT(*) AS dailyReportsCreated,
      MIN(day_number) AS firstDay,
      MAX(day_number) AS lastDay
    FROM daily_reports
    WHERE run_id = ?
  `,
    )
    .get(runId);

  const openingCash = db
    .prepare(
      `
    SELECT COALESCE(SUM(amount_cents), 0) AS recordedOpeningCashCents
    FROM cash_ledger
    WHERE run_id = ? AND entry_type = 'opening'
  `,
    )
    .get(runId);

  return {
    ...run,
    config: JSON.parse(run.configJson),
    configJson: undefined,
    inventory,
    history,
    recordedOpeningCashCents: openingCash.recordedOpeningCashCents,
  };
}

module.exports = {
  initializeRun,
  getRunSummary,
};
