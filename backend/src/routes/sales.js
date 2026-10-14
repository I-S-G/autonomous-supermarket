const express = require("express");
const { checkoutCustomer } = require("../services/salesService");

const router = express.Router();

router.post("/:runId/days/:dayNumber/checkout", (req, res) => {
  try {
    const dayNumber = Number(req.params.dayNumber);

    if (!Number.isInteger(dayNumber)) {
      return res.status(400).json({
        error: "dayNumber must be an integer.",
      });
    }

    const { customerType, shoppingMission, basket } = req.body ?? {};

    const result = checkoutCustomer({
      runId: req.params.runId,
      dayNumber,
      customerType,
      shoppingMission,
      basket,
    });

    res.status(201).json({
      message: "Checkout processed successfully.",
      result,
    });
  } catch (error) {
    console.error("Checkout failed:", error);

    res.status(400).json({
      error: error.message || "Unable to process checkout.",
    });
  }
});

module.exports = router;
