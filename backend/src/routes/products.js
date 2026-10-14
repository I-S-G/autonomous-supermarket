const express = require("express");
const db = require("../db/database");

const router = express.Router();

router.get("/", (req, res) => {
  try {
    const products = db
      .prepare(
        `
        SELECT
          id,
          name,
          category,
          unit_cost_cents AS unitCostCents,
          unit_price_cents AS unitPriceCents,
          is_perishable AS isPerishable,
          shelf_life_days AS shelfLifeDays
        FROM products
        ORDER BY category, name
      `,
      )
      .all()
      .map((product) => ({
        ...product,
        isPerishable: Boolean(product.isPerishable),
      }));

    res.json({
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    res.status(500).json({ error: "Failed to fetch products." });
  }
});

router.get("/summary", (req, res) => {
  try {
    const summary = db
      .prepare(
        `
      SELECT
        COUNT(*) AS productCount,
        COUNT(DISTINCT category) AS categoryCount,
        SUM(CASE WHEN is_perishable = 1 THEN 1 ELSE 0 END)
          AS perishableCount,
        SUM(CASE WHEN is_perishable = 0 THEN 1 ELSE 0 END)
          AS nonPerishableCount
      FROM products
    `,
      )
      .get();

    res.json(summary);
  } catch (error) {
    console.error("Failed to fetch catalogue summary:", error);
    res.status(500).json({ error: "Failed to fetch catalogue summary." });
  }
});

module.exports = router;
