const db = require("./backend/src/db/database");

const runId = "c29cb5e9-0544-4c84-bc38-0439aeb66d92";

console.log(
  "Orders placed on Day 60:",
  db
    .prepare(
      `
    SELECT COUNT(*) AS count
    FROM replenishment_orders
    WHERE run_id = ? AND order_day >= 60
  `,
    )
    .get(runId).count,
);

console.log(
  "Incorrect delivery days:",
  db
    .prepare(
      `
    SELECT COUNT(*) AS count
    FROM replenishment_orders
    WHERE run_id = ?
      AND expected_delivery_day <> order_day + 1
  `,
    )
    .get(runId).count,
);

console.log(
  "Orders not received:",
  db
    .prepare(
      `
    SELECT COUNT(*) AS count
    FROM replenishment_orders
    WHERE run_id = ? AND status <> 'received'
  `,
    )
    .get(runId).count,
);

console.log(
  "Opening inventory budget (cents):",
  db
    .prepare(
      `
    SELECT opening_inventory_budget_cents
    FROM simulation_runs
    WHERE id = ?
  `,
    )
    .get(runId).opening_inventory_budget_cents,
);

console.log(
  "Opening inventory cost (cents):",
  db
    .prepare(
      `
    SELECT SUM(unit_cost_cents * initial_quantity) AS cost_cents
    FROM run_products
    WHERE run_id = ?
  `,
    )
    .get(runId).cost_cents,
);

db.close();
