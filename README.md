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

## 6. Customer/demand model and Store Brain

### Customer and demand model

The simulation generates customer activity and sales over the simulated
days, then records customers, transactions, units sold, revenue, cost of
goods sold, and gross profit in the daily reports.

**\[VERIFY from `simulationService.js` and the demand-model
implementation before submission: document the actual demand-generation
method, any randomness or fixed probabilities, how customer counts are
selected, how products are chosen, and how selling prices and purchase
costs are applied. Do not claim a statistical distribution or
forecasting method unless the code implements it.\]**

### Store Brain

The Store Brain service includes start-of-day replenishment receipt and
expiry processing, and end-of-day stock inspection and replenishment
decisions. The database event schema supports events such as low stock,
sold out, expiry warning, expiry write-off, slow-moving stock,
replenishment ordered/received, and cash constraint.

The replenishment order schema enforces a one-day expected delivery
relationship (`expected_delivery_day = order_day + 1`). Commercial
Assurance checks the lead-time rule, inventory reconciliation, cash
reconciliation, and that orders are received and not placed on or after
Day 60.

**\[VERIFY\]** Document the actual thresholds and ordering formula from
`backend/src/services/storeBrain.js`, including expiry warning timing,
target stock/reorder quantities, slow-moving product treatment, and cash
constraints.

## 7. Application report navigation

The main dashboard is rendered by `frontend/src/App.tsx`. The intended
report areas are:

1.  **Submitted Run / Run Summary** --- the summary at the top of the
    dashboard.
2.  **Business Performance** --- business metrics, shopper activity,
    categories, and product performance.
3.  **Daily Reports** --- select a day to inspect its recorded results.
4.  **Inventory & Autonomous Operations** --- inventory movement,
    replenishment and Store Brain events.
5.  **Commercial Diagnosis & Recommendations** --- evidence-based
    findings and suggested actions.
6.  **Commercial Assurance** --- validation checks and reconciliation
    evidence.
7.  **Product Catalogue** --- catalogue information.

## 8. Commercial Assurance

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

## 9. AI collaboration

AI assistance was used during development to help explain implementation
issues, code review, write sql tables/queries, css designs, html layouts, recommend file structures and prepare documentation.

Examples of AI-assisted work and human review:

- **Commercial Assurance:** AI helped turn the existing assurance
  response into a frontend view. The code was reviewed and tested for UI to display figures
  returned from backend rather than treating the untested output as proof.
- **Documentation:** AI drafted document was reviewed and changed significantly. It was treated
  as a template rather than an actual draft.

## 10. Known technical and modelling limitations

- This is a simulation, not a real-world supermarket forecasting
  system. Results depend on the implemented rules and assumptions.
- The realism of the demand model, product-selection process, and
  replenishment thresholds must be assessed against the actual service
  implementation.
- This is a single page application and all components are displayed in the dashboard.
  This can cause the page to be too long.

