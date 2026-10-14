const express = require("express");
const router = express.Router();

const db = require("../db/database");
const { initializeRun, getRunSummary } = require("../services/runService");
const { runSimulation } = require("../services/simulationService");

// Create a new run.
router.post("/", (req, res) => {
  try {
    const { startDate } = req.body;
    const run = initializeRun({ startDate });

    return res.status(201).json({ success: true, run });
  } catch (error) {
    console.error("Failed to create simulation run:", error);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Execute all 60 simulation days.
router.post("/:runId/simulate", (req, res) => {
  try {
    const result = runSimulation(req.params.runId);
    return res.json({ success: true, result });
  } catch (error) {
    console.error("Simulation failed:", error);

    const statusCode =
      error.message === "Simulation run not found." ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
});

// Get a run summary.
router.get("/:runId", (req, res) => {
  try {
    const run = getRunSummary(req.params.runId);

    if (!run) {
      return res.status(404).json({
        success: false,
        error: "Simulation run not found.",
      });
    }

    return res.json({ success: true, run });
  } catch (error) {
    console.error("Failed to get simulation run:", error);
    return res.status(500).json({
      success: false,
      error: "Could not retrieve the simulation run.",
    });
  }
});

// Get all daily reports for a run.
router.get("/:runId/daily-reports", (req, res) => {
  try {
    const { runId } = req.params;

    const run = db
      .prepare("SELECT id FROM simulation_runs WHERE id = ?")
      .get(runId);

    if (!run) {
      return res.status(404).json({
        success: false,
        error: "Simulation run not found.",
      });
    }

    const dailyReports = db
      .prepare(
        `
        SELECT
          day_number AS dayNumber,
          simulated_date AS simulatedDate,
          customers,
          transaction_count AS transactionCount,
          units_sold AS unitsSold,
          revenue_cents AS revenueCents,
          cogs_cents AS cogsCents,
          gross_profit_cents AS grossProfitCents,
          expiry_writeoff_cents AS expiryWriteoffCents,
          closing_cash_cents AS closingCashCents
        FROM daily_reports
        WHERE run_id = ?
        ORDER BY day_number ASC
      `,
      )
      .all(runId);

    return res.json({
      success: true,
      runId,
      count: dailyReports.length,
      dailyReports,
    });
  } catch (error) {
    console.error("Failed to retrieve daily reports:", error);
    return res.status(500).json({
      success: false,
      error: "Could not retrieve daily reports.",
    });
  }
});

// Get one selected day's report.
router.get("/:runId/daily-reports/:dayNumber", (req, res) => {
  try {
    const { runId } = req.params;
    const dayNumber = Number(req.params.dayNumber);

    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 60) {
      return res.status(400).json({
        success: false,
        error: "dayNumber must be an integer between 1 and 60.",
      });
    }

    const dailyReport = db
      .prepare(
        `
        SELECT
          day_number AS dayNumber,
          simulated_date AS simulatedDate,
          customers,
          transaction_count AS transactionCount,
          units_sold AS unitsSold,
          revenue_cents AS revenueCents,
          cogs_cents AS cogsCents,
          gross_profit_cents AS grossProfitCents,
          expiry_writeoff_cents AS expiryWriteoffCents,
          closing_cash_cents AS closingCashCents
        FROM daily_reports
        WHERE run_id = ? AND day_number = ?
      `,
      )
      .get(runId, dayNumber);

    if (!dailyReport) {
      return res.status(404).json({
        success: false,
        error: "Daily report not found for this run and day.",
      });
    }

    return res.json({ success: true, runId, dailyReport });
  } catch (error) {
    console.error("Failed to retrieve daily report:", error);
    return res.status(500).json({
      success: false,
      error: "Could not retrieve the daily report.",
    });
  }
});

// Get Commercial Assurance for a run.
router.get("/:runId/commercial-assurance", (req, res) => {
  try {
    const { runId } = req.params;

    const run = db
      .prepare(
        `
      SELECT
        id,
        status,
        opening_inventory_budget_cents AS openingInventoryBudgetCents,
        opening_cash_cents AS openingCashCents
      FROM simulation_runs
      WHERE id = ?
    `,
      )
      .get(runId);

    if (!run) {
      return res.status(404).json({
        success: false,
        error: "Simulation run not found.",
      });
    }

    const daily = db
      .prepare(
        `
      SELECT
        COUNT(*) AS reportCount,
        COUNT(DISTINCT day_number) AS distinctDays,
        MIN(day_number) AS firstDay,
        MAX(day_number) AS lastDay,
        COALESCE(SUM(revenue_cents), 0) AS revenueCents,
        COALESCE(SUM(cogs_cents), 0) AS cogsCents,
        COALESCE(SUM(expiry_writeoff_cents), 0) AS expiryWriteoffCents,
        MAX(CASE WHEN day_number = 60 THEN closing_cash_cents END)
          AS finalReportCashCents
      FROM daily_reports
      WHERE run_id = ?
    `,
      )
      .get(runId);

    const ledger = db
      .prepare(
        `
      SELECT
        COALESCE(SUM(CASE
          WHEN entry_type = 'opening' THEN amount_cents ELSE 0
        END), 0) AS openingLedgerCents,
        COALESCE(SUM(CASE
          WHEN entry_type = 'sales_revenue' THEN amount_cents ELSE 0
        END), 0) AS salesLedgerCents,
        COALESCE(SUM(CASE
          WHEN entry_type = 'replenishment' THEN amount_cents ELSE 0
        END), 0) AS replenishmentLedgerCents
      FROM cash_ledger
      WHERE run_id = ?
    `,
      )
      .get(runId);

    const movements = db
      .prepare(
        `
      SELECT
        COALESCE(SUM(CASE
          WHEN movement_type = 'opening' THEN quantity_change ELSE 0
        END), 0) AS openingUnits,
        COALESCE(SUM(CASE
          WHEN movement_type = 'replenishment_received'
            THEN quantity_change ELSE 0
        END), 0) AS receivedUnits,
        COALESCE(SUM(CASE
          WHEN movement_type = 'sale' THEN -quantity_change ELSE 0
        END), 0) AS soldUnits,
        COALESCE(SUM(CASE
          WHEN movement_type = 'expiry_writeoff'
            THEN -quantity_change ELSE 0
        END), 0) AS expiredUnits
      FROM inventory_movements
      WHERE run_id = ?
    `,
      )
      .get(runId);

    const remaining = db
      .prepare(
        `
      SELECT COALESCE(SUM(remaining_quantity), 0) AS remainingUnits
      FROM inventory_lots
      WHERE run_id = ?
    `,
      )
      .get(runId);

    const orders = db
      .prepare(
        `
      SELECT
        COUNT(*) AS orderCount,
        COALESCE(SUM(total_cost_cents), 0) AS orderCostCents,
        COALESCE(SUM(CASE
          WHEN status = 'received' THEN 1 ELSE 0
        END), 0) AS receivedOrderCount,
        COALESCE(SUM(CASE
          WHEN expected_delivery_day != order_day + 1 THEN 1 ELSE 0
        END), 0) AS incorrectLeadTimeCount,
        COALESCE(SUM(CASE
          WHEN order_day >= 60 THEN 1 ELSE 0
        END), 0) AS ordersOnOrAfterDay60
      FROM replenishment_orders
      WHERE run_id = ?
    `,
      )
      .get(runId);

    const openingStock = db
      .prepare(
        `
      SELECT
        COALESCE(SUM(initial_quantity), 0) AS openingUnits,
        COALESCE(SUM(initial_quantity * unit_cost_cents), 0)
          AS openingInventoryCostCents
      FROM run_products
      WHERE run_id = ?
    `,
      )
      .get(runId);

    const closingCashCents =
      ledger.openingLedgerCents +
      ledger.salesLedgerCents -
      ledger.replenishmentLedgerCents;

    const inventoryExpectedUnits =
      movements.openingUnits +
      movements.receivedUnits -
      movements.soldUnits -
      movements.expiredUnits;

    const inventoryActualUnits = remaining.remainingUnits;

    const checks = [
      {
        name: "Simulation completed",
        status: run.status === "completed" ? "PASS" : "FAIL",
        actual: run.status,
        expected: "completed",
      },
      {
        name: "60 daily reports exist",
        status:
          daily.reportCount === 60 &&
          daily.distinctDays === 60 &&
          daily.firstDay === 1 &&
          daily.lastDay === 60
            ? "PASS"
            : "FAIL",
        actual: {
          reportCount: daily.reportCount,
          distinctDays: daily.distinctDays,
          firstDay: daily.firstDay,
          lastDay: daily.lastDay,
        },
        expected: "60 unique reports covering Days 1–60",
      },
      {
        name: "Opening inventory within budget",
        status:
          openingStock.openingInventoryCostCents <=
          run.openingInventoryBudgetCents
            ? "PASS"
            : "FAIL",
        actualCents: openingStock.openingInventoryCostCents,
        budgetCents: run.openingInventoryBudgetCents,
      },
      {
        name: "Cash ledger reconciles",
        status:
          ledger.openingLedgerCents === run.openingCashCents &&
          ledger.salesLedgerCents === daily.revenueCents &&
          ledger.replenishmentLedgerCents === orders.orderCostCents &&
          closingCashCents === daily.finalReportCashCents
            ? "PASS"
            : "FAIL",
        openingCashCents: ledger.openingLedgerCents,
        openingCashExpectedCents: run.openingCashCents,
        salesLedgerCents: ledger.salesLedgerCents,
        reportedRevenueCents: daily.revenueCents,
        replenishmentLedgerCents: ledger.replenishmentLedgerCents,
        orderCostCents: orders.orderCostCents,
        calculatedClosingCashCents: closingCashCents,
        finalReportCashCents: daily.finalReportCashCents,
      },
      {
        name: "Inventory quantities reconcile",
        status:
          inventoryExpectedUnits === inventoryActualUnits ? "PASS" : "FAIL",
        openingUnits: movements.openingUnits,
        receivedUnits: movements.receivedUnits,
        soldUnits: movements.soldUnits,
        expiredUnits: movements.expiredUnits,
        calculatedRemainingUnits: inventoryExpectedUnits,
        actualRemainingUnits: inventoryActualUnits,
      },
      {
        name: "Replenishment lead time is one day",
        status: orders.incorrectLeadTimeCount === 0 ? "PASS" : "FAIL",
        incorrectOrders: orders.incorrectLeadTimeCount,
      },
      {
        name: "No orders placed on or after Day 60",
        status: orders.ordersOnOrAfterDay60 === 0 ? "PASS" : "FAIL",
        violatingOrders: orders.ordersOnOrAfterDay60,
      },
      {
        name: "All replenishment orders received",
        status:
          orders.orderCount === orders.receivedOrderCount ? "PASS" : "FAIL",
        totalOrders: orders.orderCount,
        receivedOrders: orders.receivedOrderCount,
      },
    ];

    const failedChecks = checks.filter((check) => check.status === "FAIL");

    return res.json({
      success: true,
      runId,
      overallStatus: failedChecks.length === 0 ? "PASS" : "FAIL",
      checks,
      financials: {
        openingCashCents: run.openingCashCents,
        revenueCents: daily.revenueCents,
        replenishmentCostCents: orders.orderCostCents,
        calculatedClosingCashCents: closingCashCents,
        finalReportCashCents: daily.finalReportCashCents,
        cogsCents: daily.cogsCents,
        expiryWriteoffCents: daily.expiryWriteoffCents,
      },
      inventory: {
        openingInventoryBudgetCents: run.openingInventoryBudgetCents,
        openingInventoryCostCents: openingStock.openingInventoryCostCents,
        openingUnits: movements.openingUnits,
        receivedUnits: movements.receivedUnits,
        soldUnits: movements.soldUnits,
        expiredUnits: movements.expiredUnits,
        remainingUnits: inventoryActualUnits,
        calculatedRemainingUnits: inventoryExpectedUnits,
      },
      replenishment: {
        orderCount: orders.orderCount,
        receivedOrderCount: orders.receivedOrderCount,
        totalCostCents: orders.orderCostCents,
        incorrectLeadTimeCount: orders.incorrectLeadTimeCount,
        ordersOnOrAfterDay60: orders.ordersOnOrAfterDay60,
      },
      failedChecks,
    });
  } catch (error) {
    console.error("Commercial Assurance failed:", error);
    return res.status(500).json({
      success: false,
      error: "Could not calculate Commercial Assurance.",
    });
  }
});

module.exports = router;
