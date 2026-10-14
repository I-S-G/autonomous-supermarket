const express = require("express");
const db = require("../db/database");
const { generateDailyCustomerPlans } = require("../services/customerModel");

const router = express.Router();

router.get("/preview", (req, res) => {
  try {
    const date =
      typeof req.query.date === "string" ? req.query.date : "2026-01-01";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: "date must use YYYY-MM-DD format.",
      });
    }

    const parsedDate = new Date(`${date}T12:00:00Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({
        error: "Please provide a valid calendar date.",
      });
    }

    const products = db
      .prepare(
        `
      SELECT id, name, category
      FROM products
      ORDER BY id
    `,
      )
      .all();

    if (products.length === 0) {
      return res.status(409).json({
        error: "No products found. Run npm run seed first.",
      });
    }

    const customers = generateDailyCustomerPlans(products, date);

    const missionCounts = {};
    const customerTypeCounts = {};
    const productDemand = {};

    for (const customer of customers) {
      missionCounts[customer.shoppingMission] =
        (missionCounts[customer.shoppingMission] || 0) + 1;

      customerTypeCounts[customer.customerType] =
        (customerTypeCounts[customer.customerType] || 0) + 1;

      for (const item of customer.basket) {
        productDemand[item.productId] =
          (productDemand[item.productId] || 0) + item.requestedQuantity;
      }
    }

    const productLookup = new Map(
      products.map((product) => [product.id, product.name]),
    );

    const topDemandedProducts = Object.entries(productDemand)
      .map(([productId, requestedUnits]) => ({
        productId,
        productName: productLookup.get(productId),
        requestedUnits,
      }))
      .sort((a, b) => b.requestedUnits - a.requestedUnits)
      .slice(0, 10);

    res.json({
      date,
      customerCount: customers.length,
      plannedBasketCount: customers.filter(
        (customer) => customer.basket.length > 0,
      ).length,
      missionCounts,
      customerTypeCounts,
      topDemandedProducts,
      sampleCustomers: customers.slice(0, 5),
      note: "This is a demand preview. It does not create transactions or change inventory.",
    });
  } catch (error) {
    console.error("Simulation preview failed:", error);

    res.status(500).json({
      error: "Unable to generate simulation preview.",
    });
  }
});

module.exports = router;
