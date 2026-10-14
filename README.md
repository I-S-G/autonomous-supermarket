# Autonomous Supermarket Simulation

## 1. Purpose and technology stack

This project simulates a fictional IGA-style supermarket near Swanston
Street and Melbourne Town Hall, Melbourne, over 60 consecutive simulated
days. It provides a commercial reporting dashboard for business
performance, daily results, inventory and replenishment activity,
commercial diagnosis, and assurance checks.

**Technology:** React, TypeScript, Tailwind CSS, Node.js, Express, and
SQLite.

## 2. Install and run locally

Run the backend and frontend in separate terminals from the repository
root.

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

## 3. SQLite database and submitted run

The backend uses SQLite.

- **SQLite file path:** `backend/data/supermarket.db
- **Schema:** `backend/src/db/schema.sql`
- **Submitted Run ID:** `c29cb5e9-0544-4c84-bc38-0439aeb66d92`

### Inspect or create a new run

The backend routes in `backend/src/routes/runs.js` include:

- `GET /api/runs/:runId` --- retrieve a run summary.
- `GET /api/runs/:runId/daily-reports` --- retrieve daily reports.
- `GET /api/runs/:runId/daily-reports/:dayNumber` --- retrieve a
  single day's report.
- `GET /api/runs/:runId/commercial-assurance` --- retrieve assurance
  checks.
- `POST /api/runs` --- create a run.
- `POST /api/runs/:runId/simulate` --- execute the simulation.

To create a test run, send a POST request to `/api/runs` with the
request body expected by the current route. The current route accepts a
`startDate` field. Eg:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/runs" `
  -ContentType "application/json" `
  -Body '{"startDate":"2026-01-01"}'
```

Use the returned run ID to run the simulation by sending a POST request to `/api/runs/[RUN_ID]/simulate. Replace [RUN_ID] with the run id returned from the previous request. Eg:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/runs/[RUN_ID]/simulate"
```

Update `frontend/src/config/app.ts` to replace ACTIVE_RUN_ID to use this new run id value.

## 4. Architecture and data flow

1.  **Configuration and run creation:** the backend creates a simulation
    run with its start date and configured opening inventory budget and
    operating cash.
2.  **Simulation execution:** the simulation service processes the
    simulated days and records daily results and business transactions.
3.  **Persistence:** SQLite stores run configuration, daily reports,
    transactions, inventory movements and lots, replenishment
    orders/items, cash-ledger entries, and Store Brain events.
4.  **Store Brain operations:** the Store Brain service handles
    start-of-day receipts and expiry processing, then reviews stock and
    may place replenishment orders at the end of the day.
5.  **Reporting API:** Express routes read the persisted history and
    return run summaries, daily reports, business-performance results,
    and Commercial Assurance checks.
6.  **Frontend:** React components request the API data and present the
    report sections. The frontend displayf recorded data and
    backend validation outcomes.

Main backend files include `backend/src/routes/runs.js`,
`backend/src/routes/storeBrain.js`,
`backend/src/services/simulationService.js`,
`backend/src/services/runService.js`,
`backend/src/services/storeBrain.js`, and `backend/src/db/schema.sql`.

## 5. Customer/Demand Model and Store Brain

### Customer and Demand Model

The customer model generates daily shopping activity using weighted random selection.

Customer volume: 58 customers on weekdays and 42 on weekends, with approximately ±20% daily variation.

Customer types: Commuters (35%), local residents (25%), office workers (25%), and visitors (15%).

Shopping missions: Quick convenience (35%), meal purchase (30%), and small grocery trip (35%).

Basket generation: Mission-specific category weights and relative product popularity influence product selection. Each selected product has a requested quantity of 1–2 units.

The model uses programmed assumptions rather than real supermarket sales data. Actual sales depend on product availability and checkout processing.

### Store Brain

The Store Brain autonomously manages inventory and replenishment through backend/src/services/storeBrain.js.

Start of day: Receives previous-day replenishment orders and processes expired inventory.

Stock monitoring: Detects low stock, stockouts, approaching expiry, and slow-moving products.

Replenishment: Uses recent sales to estimate demand, targets four days of stock, and applies a two-day low-stock threshold with a minimum reorder threshold of two units.

Cash constraints: Limits orders to quantities affordable with available operating cash.

Delivery rules: Orders are scheduled for next-day delivery, with no new orders placed on Day 60.

## 6. Application report navigation

The main dashboard is rendered by `frontend/src/App.tsx`. The intended
report areas are:

1.  **Submitted Run / Run Summary** --- the summary at the top of the
    dashboard.
2.  **Business Performance** --- business metrics, shopper activity,
    categories, and product performance.
3.  **Commercial Diagnosis & Recommendations** --- evidence-based
    findings and suggested actions.
4.  **Daily Reports** --- select a day to inspect its recorded results.
5.  **Inventory & Autonomous Operations** --- inventory movement,
    replenishment and Store Brain events.
6.  **Commercial Assurance** --- validation checks and reconciliation
    evidence.
7.  **Product Catalogue** --- catalogue information.

## 7. Commercial Assurance

The assurance endpoint checks whether:

- The run is completed.
- Exactly 60 unique daily reports cover Days 1--60.
- Opening inventory cost is within the configured budget.
- Opening cash, sales revenue, replenishment spending, and closing
  cash reconcile.
- Opening stock + received stock − sold stock − expired stock equals
  remaining stock.
- Replenishment orders follow the one-day lead-time rule.
- No orders are placed on or after Day 60.
- All replenishment orders have been received.

## 8. AI collaboration

AI assistance was used during development to help explain implementation
issues, code review, write sql tables/queries, css designs, html layouts, recommend file structures and prepare documentation.

Examples of AI-assisted work and human review:

- **Commercial Assurance:** AI helped turn the existing assurance
  response into a frontend view. The code was reviewed and tested for UI to display figures
  returned from backend rather than treating the untested output as proof.
- **Documentation:** AI drafted document was reviewed and changed significantly. It was treated
  as a template rather than an actual draft.

## 9. Known technical and modelling limitations

- This is a simulation, not a real-world supermarket forecasting
  system. Results depend on the implemented rules and assumptions.
- The realism of the demand model, product-selection process, and
  replenishment thresholds must be assessed against the actual service
  implementation.
- This is a single page application and all components are displayed in the dashboard.
  This can cause the page to be too long.
