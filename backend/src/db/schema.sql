
PRAGMA foreign_keys = ON;

-- One record for each simulation run.
CREATE TABLE IF NOT EXISTS simulation_runs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'running', 'completed', 'failed')),
  opening_inventory_budget_cents INTEGER NOT NULL
    CHECK (opening_inventory_budget_cents BETWEEN 0 AND 4000000),
  opening_cash_cents INTEGER NOT NULL DEFAULT 1500000
    CHECK (opening_cash_cents = 1500000),
  config_json TEXT NOT NULL,
  model_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- Reusable catalogue definitions.
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_cost_cents INTEGER NOT NULL CHECK (unit_cost_cents >= 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  is_perishable INTEGER NOT NULL DEFAULT 0
    CHECK (is_perishable IN (0, 1)),
  shelf_life_days INTEGER,
  CHECK (
    (is_perishable = 0 AND shelf_life_days IS NULL)
    OR
    (is_perishable = 1 AND shelf_life_days > 0)
  )
);

-- Frozen product and opening-stock snapshot for each run.
CREATE TABLE IF NOT EXISTS run_products (
  run_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_cost_cents INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  is_perishable INTEGER NOT NULL,
  shelf_life_days INTEGER,
  initial_quantity INTEGER NOT NULL CHECK (initial_quantity >= 0),
  PRIMARY KEY (run_id, product_id),
  FOREIGN KEY (run_id) REFERENCES simulation_runs(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- One daily summary per simulated day.
CREATE TABLE IF NOT EXISTS daily_reports (
  run_id TEXT NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 60),
  simulated_date TEXT NOT NULL,
  customers INTEGER NOT NULL DEFAULT 0 CHECK (customers >= 0),
  transaction_count INTEGER NOT NULL DEFAULT 0 CHECK (transaction_count >= 0),
  units_sold INTEGER NOT NULL DEFAULT 0 CHECK (units_sold >= 0),
  revenue_cents INTEGER NOT NULL DEFAULT 0 CHECK (revenue_cents >= 0),
  cogs_cents INTEGER NOT NULL DEFAULT 0 CHECK (cogs_cents >= 0),
  gross_profit_cents INTEGER NOT NULL DEFAULT 0,
  expiry_writeoff_cents INTEGER NOT NULL DEFAULT 0
    CHECK (expiry_writeoff_cents >= 0),
  closing_cash_cents INTEGER NOT NULL DEFAULT 1500000
    CHECK (closing_cash_cents >= 0),
  PRIMARY KEY (run_id, day_number),
  FOREIGN KEY (run_id) REFERENCES simulation_runs(id)
);

-- Simulated shoppers.
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  day_number INTEGER NOT NULL,
  customer_type TEXT NOT NULL,
  shopping_mission TEXT NOT NULL,
  FOREIGN KEY (run_id, day_number)
    REFERENCES daily_reports(run_id, day_number)
);

-- Completed purchases.
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  day_number INTEGER NOT NULL,
  customer_id TEXT NOT NULL,
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id, day_number)
    REFERENCES daily_reports(run_id, day_number),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  unit_cost_cents INTEGER NOT NULL CHECK (unit_cost_cents >= 0),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Every stock increase or decrease is recorded.
CREATE TABLE IF NOT EXISTS inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  day_number INTEGER NOT NULL,
  product_id TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK (
    movement_type IN (
      'opening',
      'replenishment_received',
      'sale',
      'expiry_writeoff'
    )
  ),
  quantity_change INTEGER NOT NULL CHECK (quantity_change != 0),
  unit_cost_cents INTEGER NOT NULL CHECK (unit_cost_cents >= 0),
  reference_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id, day_number)
    REFERENCES daily_reports(run_id, day_number),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Individual stock batches retain receipt and expiry information.
CREATE TABLE IF NOT EXISTS inventory_lots (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  received_day INTEGER NOT NULL CHECK (received_day BETWEEN 1 AND 60),
  expiry_day INTEGER,
  original_quantity INTEGER NOT NULL CHECK (original_quantity > 0),
  remaining_quantity INTEGER NOT NULL CHECK (
    remaining_quantity >= 0
    AND remaining_quantity <= original_quantity
  ),
  unit_cost_cents INTEGER NOT NULL CHECK (unit_cost_cents >= 0),
  FOREIGN KEY (run_id, product_id)
    REFERENCES run_products(run_id, product_id)
);

-- Replenishment orders are paid for when placed and received next day.
CREATE TABLE IF NOT EXISTS replenishment_orders (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  order_day INTEGER NOT NULL CHECK (order_day BETWEEN 1 AND 59),
  expected_delivery_day INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ordered'
    CHECK (status IN ('ordered', 'received')),
  total_cost_cents INTEGER NOT NULL CHECK (total_cost_cents >= 0),
  FOREIGN KEY (run_id, order_day)
    REFERENCES daily_reports(run_id, day_number),
  CHECK (expected_delivery_day = order_day + 1)
);

CREATE TABLE IF NOT EXISTS replenishment_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost_cents INTEGER NOT NULL CHECK (unit_cost_cents >= 0),
  line_cost_cents INTEGER NOT NULL CHECK (line_cost_cents >= 0),
  FOREIGN KEY (order_id) REFERENCES replenishment_orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Record every movement in operating cash.
CREATE TABLE IF NOT EXISTS cash_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  day_number INTEGER NOT NULL,
  entry_type TEXT NOT NULL CHECK (
    entry_type IN ('opening', 'sales_revenue', 'replenishment')
  ),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  reference_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id, day_number)
    REFERENCES daily_reports(run_id, day_number)
);

-- Detected conditions, decisions and outcomes.
CREATE TABLE IF NOT EXISTS store_brain_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  day_number INTEGER NOT NULL,
  product_id TEXT,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'low_stock',
      'sold_out',
      'expiry_warning',
      'expiry_writeoff',
      'slow_moving',
      'replenishment_ordered',
      'replenishment_received',
      'cash_constraint'
    )
  ),
  severity TEXT NOT NULL CHECK (
    severity IN ('info', 'warning', 'critical')
  ),
  description TEXT NOT NULL,
  action_taken TEXT,
  outcome TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id, day_number)
    REFERENCES daily_reports(run_id, day_number),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_run_day
  ON transactions(run_id, day_number);

CREATE INDEX IF NOT EXISTS idx_inventory_run_day
  ON inventory_movements(run_id, day_number);

CREATE INDEX IF NOT EXISTS idx_brain_events_run_day
  ON store_brain_events(run_id, day_number);

CREATE INDEX IF NOT EXISTS idx_lots_run_product
  ON inventory_lots(run_id, product_id);


-- Requested demand, including products that could not be supplied.
CREATE TABLE IF NOT EXISTS demand_records (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  day_number INTEGER NOT NULL,
  customer_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  requested_quantity INTEGER NOT NULL CHECK (requested_quantity > 0),
  fulfilled_quantity INTEGER NOT NULL DEFAULT 0
    CHECK (fulfilled_quantity >= 0),
  FOREIGN KEY (run_id, day_number)
    REFERENCES daily_reports(run_id, day_number),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  CHECK (fulfilled_quantity <= requested_quantity)
);

-- Inventory lot updates are auditable at the database level.
CREATE INDEX IF NOT EXISTS idx_demand_run_day
  ON demand_records(run_id, day_number);
