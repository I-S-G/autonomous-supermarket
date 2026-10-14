const db = require("../db/database");
const { generateDailyCustomerPlans } = require("./customerModel");
const { checkoutCustomer } = require("./salesService");
const {
  receiveReplenishment,
  processExpiry,
  inspectAndReplenish,
} = require("./storeBrain");

function formatDate(startDate, dayNumber) {
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + dayNumber - 1);
  return date.toISOString().slice(0, 10);
}

function getRun(runId) {
  return db
    .prepare(
      `SELECT id, status, config_json
       FROM simulation_runs
       WHERE id = ?`,
    )
    .get(runId);
}

function getRunProducts(runId) {
  return db
    .prepare(
      `SELECT
         rp.product_id AS id,
         rp.name,
         rp.category,
         rp.unit_cost_cents,
         rp.unit_price_cents AS selling_price_cents,
         rp.is_perishable,
         rp.shelf_life_days,
         rp.initial_quantity
       FROM run_products rp
       WHERE rp.run_id = ?
       ORDER BY rp.product_id`,
    )
    .all(runId);
}

function getOpeningCashCents(runId) {
  const entry = db
    .prepare(
      `SELECT amount_cents
       FROM cash_ledger
       WHERE run_id = ?
         AND entry_type = 'opening'
       ORDER BY id
       LIMIT 1`,
    )
    .get(runId);

  if (!entry) {
    throw new Error("Opening cash ledger entry is missing.");
  }

  return entry.amount_cents;
}

function getClosingCashCents(runId, dayNumber, openingCashCents) {
  const report = db
    .prepare(
      `SELECT closing_cash_cents
       FROM daily_reports
       WHERE run_id = ? AND day_number = ?`,
    )
    .get(runId, dayNumber);

  if (!report) {
    throw new Error(`Daily report for Day ${dayNumber} is missing.`);
  }

  return report.closing_cash_cents ?? openingCashCents;
}

function runSimulation(runId) {
  const run = getRun(runId);

  if (!run) {
    throw new Error("Simulation run not found.");
  }

  if (run.status !== "created") {
    throw new Error(
      `This run cannot start because its status is "${run.status}". ` +
        "Create a new run to perform another simulation.",
    );
  }

  const config = JSON.parse(run.config_json || "{}");

  if (!config.startDate) {
    throw new Error("The run configuration must contain a startDate.");
  }

  const products = getRunProducts(runId);

  if (products.length === 0) {
    throw new Error("This run has no product snapshots.");
  }

  // Mark the run as started before processing any days.
  db.prepare(
    `UPDATE simulation_runs
     SET status = 'running'
     WHERE id = ? AND status = 'created'`,
  ).run(runId);

  try {
    let cashAtStartOfDay = getOpeningCashCents(runId);

    for (let dayNumber = 1; dayNumber <= 60; dayNumber += 1) {
      const date = formatDate(config.startDate, dayNumber);

      // Each day's database changes are committed together.
      const runDay = db.transaction(() => {
        // Set this day's cash baseline to the actual carried-forward
        // balance, not the original $15,000 placeholder.
        db.prepare(
          `UPDATE daily_reports
           SET simulated_date = ?, closing_cash_cents = ?
           WHERE run_id = ? AND day_number = ?`,
        ).run(date, cashAtStartOfDay, runId, dayNumber);

        // Opening sequence: receive yesterday's orders, then remove
        // stock whose expiry day has arrived.
        receiveReplenishment(runId, dayNumber);
        processExpiry(runId, dayNumber);

        // Generate the customer plans for this calendar date.
        const customerPlans = generateDailyCustomerPlans(products, date);

        for (const plan of customerPlans) {
          checkoutCustomer({
            runId,
            dayNumber,
            customerType: plan.customerType,
            shoppingMission: plan.shoppingMission,
            basket: plan.basket,
          });
        }

        // Closing sequence: assess stock and demand, then order
        // affordable replenishment for the next day. The Store Brain
        // must not place orders after Day 60.
        inspectAndReplenish(runId, dayNumber);

        const dailyReport = db
          .prepare(
            `SELECT closing_cash_cents
             FROM daily_reports
             WHERE run_id = ? AND day_number = ?`,
          )
          .get(runId, dayNumber);

        if (!dailyReport) {
          throw new Error(
            `Could not read the closing balance for Day ${dayNumber}.`,
          );
        }

        return dailyReport.closing_cash_cents;
      });

      // better-sqlite3 transactions are synchronous. The return value
      // becomes the next day's starting balance after this day commits.
      cashAtStartOfDay = runDay();
    }

    db.prepare(
      `UPDATE simulation_runs
       SET status = 'completed',
           completed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'running'`,
    ).run(runId);

    return {
      runId,
      status: "completed",
      daysSimulated: 60,
      finalCashCents: cashAtStartOfDay,
    };
  } catch (error) {
    db.prepare(
      `UPDATE simulation_runs
       SET status = 'failed'
       WHERE id = ? AND status = 'running'`,
    ).run(runId);

    throw error;
  }
}

module.exports = {
  runSimulation,
};
