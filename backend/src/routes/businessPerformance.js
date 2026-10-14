const express = require("express");
const db = require("../db/database");

const router = express.Router();

function money(value) {
  return Number(value || 0);
}

router.get("/:runId/business-performance", (req, res) => {
  const { runId } = req.params;

  try {
    const run = db
      .prepare(
        `SELECT id, status
         FROM simulation_runs
         WHERE id = ?`,
      )
      .get(runId);

    if (!run) {
      return res.status(404).json({
        success: false,
        message: "Simulation run not found.",
      });
    }

    const businessPerformance = db
      .prepare(
        `SELECT
           COUNT(*) AS daysRecorded,
           COALESCE(SUM(customers), 0) AS totalCustomers,
           COALESCE(SUM(transaction_count), 0) AS totalTransactions,
           COALESCE(SUM(units_sold), 0) AS totalUnitsSold,
           COALESCE(SUM(revenue_cents), 0) AS revenueCents,
           COALESCE(SUM(cogs_cents), 0) AS cogsCents,
           COALESCE(SUM(gross_profit_cents), 0) AS grossProfitCents,
           COALESCE(SUM(expiry_writeoff_cents), 0)
             AS expiryWriteoffCents
         FROM daily_reports
         WHERE run_id = ?`,
      )
      .get(runId);

    const cash = db
      .prepare(
        `SELECT
           COALESCE(
             SUM(
               CASE
                 WHEN entry_type = 'opening' THEN amount_cents
                 ELSE 0
               END
             ),
             0
           ) AS openingCashCents
         FROM cash_ledger
         WHERE run_id = ?`,
      )
      .get(runId);

    const closingCash = db
      .prepare(
        `SELECT closing_cash_cents AS closingCashCents
         FROM daily_reports
         WHERE run_id = ?
         ORDER BY day_number DESC
         LIMIT 1`,
      )
      .get(runId);

    const closingInventory = db
      .prepare(
        `SELECT
           COALESCE(SUM(remaining_quantity), 0)
             AS closingInventoryUnits,
           COALESCE(
             SUM(remaining_quantity * unit_cost_cents),
             0
           ) AS closingInventoryValueCents
         FROM inventory_lots
         WHERE run_id = ?`,
      )
      .get(runId);

    const shopperSummary = db
      .prepare(
        `SELECT
           COALESCE(AVG(customers), 0)
             AS averageCustomersPerDay,
           COALESCE(AVG(transaction_count), 0)
             AS averageTransactionsPerDay
         FROM daily_reports
         WHERE run_id = ?`,
      )
      .get(runId);

    const basketSummary = db
      .prepare(
        `SELECT
           COALESCE(SUM(ti.quantity), 0) AS totalUnits,
           COUNT(DISTINCT t.id) AS transactionCount,
           COALESCE(SUM(ti.line_total_cents), 0)
             AS transactionRevenueCents
         FROM transactions t
         LEFT JOIN transaction_items ti
           ON ti.transaction_id = t.id
         WHERE t.run_id = ?`,
      )
      .get(runId);

    const averageBasketUnits =
      basketSummary.transactionCount > 0
        ? basketSummary.totalUnits / basketSummary.transactionCount
        : 0;

    const averageTransactionValueCents =
      basketSummary.transactionCount > 0
        ? basketSummary.transactionRevenueCents / basketSummary.transactionCount
        : 0;

    const weekdayWeekend = db
      .prepare(
        `SELECT
           CASE
             WHEN CAST(
               strftime('%w', simulated_date) AS INTEGER
             ) IN (0, 6)
             THEN 'Weekend'
             ELSE 'Weekday'
           END AS period,
           COUNT(*) AS days,
           COALESCE(SUM(customers), 0) AS customers,
           COALESCE(SUM(transaction_count), 0)
             AS transactions,
           COALESCE(SUM(units_sold), 0) AS unitsSold,
           COALESCE(SUM(revenue_cents), 0) AS revenueCents
         FROM daily_reports
         WHERE run_id = ?
         GROUP BY period
         ORDER BY period`,
      )
      .all(runId);

    const dailyActivity = db
      .prepare(
        `SELECT
           day_number AS dayNumber,
           simulated_date AS simulatedDate,
           customers,
           transaction_count AS transactions,
           units_sold AS unitsSold,
           revenue_cents AS revenueCents
         FROM daily_reports
         WHERE run_id = ?
         ORDER BY day_number`,
      )
      .all(runId);

    /*
     * Important: transactions are scoped to the selected run
     * before their items are aggregated by product.
     */
    const categoryPerformance = db
      .prepare(
        `SELECT
           rp.category AS category,
           COALESCE(SUM(ti.quantity), 0) AS unitsSold,
           COALESCE(SUM(ti.line_total_cents), 0)
             AS revenueCents,
           COALESCE(
             SUM(
               ti.quantity *
               (ti.unit_price_cents - ti.unit_cost_cents)
             ),
             0
           ) AS grossProfitCents
         FROM run_products rp
         LEFT JOIN transactions t
           ON t.run_id = rp.run_id
         LEFT JOIN transaction_items ti
           ON ti.transaction_id = t.id
           AND ti.product_id = rp.product_id
         WHERE rp.run_id = ?
         GROUP BY rp.category
         ORDER BY revenueCents DESC`,
      )
      .all(runId);

    const productRows = db
      .prepare(
        `SELECT
           rp.product_id AS productId,
           rp.name AS name,
           rp.category AS category,
           rp.unit_cost_cents AS unitCostCents,
           rp.unit_price_cents AS unitPriceCents,
           rp.initial_quantity AS initialQuantity,
           COALESCE(SUM(ti.quantity), 0) AS unitsSold,
           COALESCE(SUM(ti.line_total_cents), 0)
             AS revenueCents,
           COALESCE(
             SUM(
               ti.quantity *
               (ti.unit_price_cents - ti.unit_cost_cents)
             ),
             0
           ) AS grossProfitCents
         FROM run_products rp
         LEFT JOIN transactions t
           ON t.run_id = rp.run_id
         LEFT JOIN transaction_items ti
           ON ti.transaction_id = t.id
           AND ti.product_id = rp.product_id
         WHERE rp.run_id = ?
         GROUP BY
           rp.product_id,
           rp.name,
           rp.category,
           rp.unit_cost_cents,
           rp.unit_price_cents,
           rp.initial_quantity
         ORDER BY unitsSold DESC`,
      )
      .all(runId);

    const productPerformance = {
      productsInCatalogue: productRows.length,
      productsWithNoSales: productRows.filter(
        (product) => product.unitsSold === 0,
      ),
      topSellingProducts: productRows.slice(0, 10),
      slowSellingProducts: [...productRows]
        .sort((a, b) => a.unitsSold - b.unitsSold)
        .slice(0, 10),
    };

    const revenueReconciliation = db
      .prepare(
        `SELECT
           COALESCE(
             (
               SELECT SUM(revenue_cents)
               FROM daily_reports
               WHERE run_id = ?
             ),
             0
           ) AS dailyReportRevenueCents,
           COALESCE(
             (
               SELECT SUM(ti.line_total_cents)
               FROM transactions t
               JOIN transaction_items ti
                 ON ti.transaction_id = t.id
               WHERE t.run_id = ?
             ),
             0
           ) AS transactionRevenueCents,
           (
             SELECT COUNT(*)
             FROM transactions t
             WHERE t.run_id = ?
               AND NOT EXISTS (
                 SELECT 1
                 FROM transaction_items ti
                 WHERE ti.transaction_id = t.id
               )
           ) AS transactionsWithoutItems`,
      )
      .get(runId, runId, runId);

    const revenueChecks = [
      {
        name: "Daily report revenue matches transaction revenue",
        status:
          revenueReconciliation.dailyReportRevenueCents ===
          revenueReconciliation.transactionRevenueCents
            ? "PASS"
            : "FAIL",
        dailyReportRevenueCents: revenueReconciliation.dailyReportRevenueCents,
        transactionRevenueCents: revenueReconciliation.transactionRevenueCents,
      },
      {
        name: "Transactions have recorded items",
        status:
          revenueReconciliation.transactionsWithoutItems === 0
            ? "PASS"
            : "FAIL",
        transactionsWithoutItems:
          revenueReconciliation.transactionsWithoutItems,
      },
    ];

    return res.json({
      success: true,
      runId: run.id,
      runStatus: run.status,
      businessPerformance: {
        ...businessPerformance,
        openingCashCents: money(cash.openingCashCents),
        closingCashCents: money(closingCash?.closingCashCents),
        closingInventoryUnits: money(closingInventory.closingInventoryUnits),
        closingInventoryValueCents: money(
          closingInventory.closingInventoryValueCents,
        ),
      },
      shopperPerformance: {
        averageCustomersPerDay: Number(
          shopperSummary.averageCustomersPerDay.toFixed(2),
        ),
        averageTransactionsPerDay: Number(
          shopperSummary.averageTransactionsPerDay.toFixed(2),
        ),
        averageBasketUnits,
        averageTransactionValueCents,
        weekdayWeekend,
        dailyActivity,
      },
      categoryPerformance,
      productPerformance,
      revenueReconciliation: {
        dailyReportRevenueCents: revenueReconciliation.dailyReportRevenueCents,
        transactionRevenueCents: revenueReconciliation.transactionRevenueCents,
        checks: revenueChecks,
      },
    });
  } catch (error) {
    console.error("Business performance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate business performance report.",
      error: error.message,
    });
  }
});

module.exports = router;
