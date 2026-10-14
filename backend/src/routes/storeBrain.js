const express = require("express");
const db = require("../db/database");
const {
  processExpiry,
  receiveReplenishment,
  inspectAndReplenish,
} = require("../services/storeBrain");

const router = express.Router();

function validateRunDay(req, res) {
  const dayNumber = Number(req.params.dayNumber);

  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 60) {
    res.status(400).json({
      error: "dayNumber must be an integer between 1 and 60.",
    });
    return null;
  }

  const run = db
    .prepare(
      `
    SELECT id, status
    FROM simulation_runs
    WHERE id = ?
  `,
    )
    .get(req.params.runId);

  if (!run) {
    res.status(404).json({ error: "Simulation run not found." });
    return null;
  }

  if (!["created", "running"].includes(run.status)) {
    res.status(409).json({
      error: "The run is not open for Store Brain operations.",
    });
    return null;
  }

  return { runId: run.id, dayNumber };
}

// Start-of-day operations: receive yesterday's orders, then expire stock.
router.post("/:runId/days/:dayNumber/start", (req, res) => {
  try {
    const context = validateRunDay(req, res);
    if (!context) return;

    const { runId, dayNumber } = context;

    const result = db.transaction(() => {
      const received = receiveReplenishment(runId, dayNumber);
      const expiry = processExpiry(runId, dayNumber);

      return { received, expiry };
    })();

    res.json({
      message: "Start-of-day operations completed.",
      ...result,
    });
  } catch (error) {
    console.error("Start-of-day operations failed:", error);
    res.status(400).json({ error: error.message });
  }
});

// End-of-day operations: inspect stock and place next-day orders.
router.post("/:runId/days/:dayNumber/close", (req, res) => {
  try {
    const context = validateRunDay(req, res);
    if (!context) return;

    const result = inspectAndReplenish(context.runId, context.dayNumber);

    res.json({
      message: "End-of-day Store Brain review completed.",
      result,
    });
  } catch (error) {
    console.error("Store Brain review failed:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Read-only Store Brain report for a completed or active run.
 * Returns recorded events and a summary of autonomous operations.
 */
router.get("/:runId/report", (req, res) => {
  try {
    const { runId } = req.params;

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
        error: "Simulation run not found.",
      });
    }

    const inventory = db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE
             WHEN movement_type = 'opening'
             THEN quantity_change ELSE 0
           END), 0) AS openingUnits,
           COALESCE(SUM(CASE
             WHEN movement_type = 'replenishment_received'
             THEN quantity_change ELSE 0
           END), 0) AS receivedUnits,
           COALESCE(SUM(CASE
             WHEN movement_type = 'sale'
             THEN -quantity_change ELSE 0
           END), 0) AS soldUnits,
           COALESCE(SUM(CASE
             WHEN movement_type = 'expiry_writeoff'
             THEN -quantity_change ELSE 0
           END), 0) AS expiredUnits
         FROM inventory_movements
         WHERE run_id = ?`,
      )
      .get(runId);

    const closing = db
      .prepare(
        `SELECT
           COALESCE(SUM(remaining_quantity), 0) AS remainingUnits,
           COALESCE(SUM(remaining_quantity * unit_cost_cents), 0)
             AS remainingValueCents
         FROM inventory_lots
         WHERE run_id = ?`,
      )
      .get(runId);

    const replenishment = db
      .prepare(
        `SELECT
           COUNT(*) AS orderCount,
           COALESCE(SUM(CASE
             WHEN status = 'received' THEN 1 ELSE 0
           END), 0) AS receivedOrderCount,
           COALESCE(SUM(total_cost_cents), 0) AS totalCostCents
         FROM replenishment_orders
         WHERE run_id = ?`,
      )
      .get(runId);

    const eventSummary = db
      .prepare(
        `SELECT
           event_type AS eventType,
           severity,
           COUNT(*) AS count
         FROM store_brain_events
         WHERE run_id = ?
         GROUP BY event_type, severity
         ORDER BY event_type, severity`,
      )
      .all(runId);

    const events = db
      .prepare(
        `SELECT
           e.id,
           e.day_number AS dayNumber,
           e.product_id AS productId,
           p.name AS productName,
           e.event_type AS eventType,
           e.severity,
           e.description,
           e.action_taken AS actionTaken,
           e.outcome,
           e.created_at AS createdAt
         FROM store_brain_events e
         LEFT JOIN products p ON p.id = e.product_id
         WHERE e.run_id = ?
         ORDER BY e.day_number ASC, e.created_at ASC`,
      )
      .all(runId);

    return res.json({
      success: true,
      runId,
      runStatus: run.status,
      inventory: {
        ...inventory,
        ...closing,
        calculatedRemainingUnits:
          inventory.openingUnits +
          inventory.receivedUnits -
          inventory.soldUnits -
          inventory.expiredUnits,
      },
      replenishment,
      eventSummary,
      events,
    });
  } catch (error) {
    console.error("Store Brain report failed:", error);
    return res.status(500).json({
      success: false,
      error: "Could not retrieve the Store Brain report.",
    });
  }
});

module.exports = router;
