const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db/database");
const productsRouter = require("./routes/products");
const runsRouter = require("./routes/runs");
const simulationRouter = require("./routes/simulation");
const salesRouter = require("./routes/sales");
const storeBrainRouter = require("./routes/storeBrain");
const businessPerformanceRouter = require("./routes/businessPerformance");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  const tables = db
    .prepare(
      `
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `,
    )
    .all();

  res.json({
    status: "ok",
    application: "Autonomous Supermarket API",
    database: "connected",
    tablesCreated: tables.length,
  });
});

app.use("/api/products", productsRouter);
app.use("/api/runs", runsRouter);
app.use("/api/simulation", simulationRouter);
app.use("/api/sales", salesRouter);
app.use("/api/store-brain", storeBrainRouter);
app.use("/api/runs", businessPerformanceRouter);

app.listen(PORT, () => {
  console.log(`Supermarket API running at http://localhost:${PORT}`);
});
