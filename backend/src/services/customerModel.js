const CUSTOMER_TYPES = [
  { type: "commuter", weight: 35 },
  { type: "local_resident", weight: 25 },
  { type: "office_worker", weight: 25 },
  { type: "visitor", weight: 15 },
];

const MISSIONS = [
  {
    mission: "quick_convenience",
    weight: 35,
    minItems: 1,
    maxItems: 3,
    categories: {
      Drinks: 5,
      Snacks: 5,
      Convenience: 2,
      "Ready-to-Eat": 2,
      Bakery: 1,
    },
  },
  {
    mission: "meal_purchase",
    weight: 30,
    minItems: 2,
    maxItems: 5,
    categories: {
      "Ready-to-Eat": 6,
      Drinks: 3,
      Snacks: 2,
      Bakery: 2,
      Dairy: 1,
      "Fresh Food": 1,
    },
  },
  {
    mission: "small_grocery_trip",
    weight: 35,
    minItems: 3,
    maxItems: 8,
    categories: {
      Pantry: 5,
      Dairy: 4,
      "Fresh Food": 3,
      Bakery: 2,
      Drinks: 2,
      Household: 1,
      "Personal Care": 1,
    },
  },
];

// Relative product popularity. These are modelling assumptions,
// not observed sales data from a real supermarket.
const PRODUCT_POPULARITY = {
  P001: 1.5, // bread
  P002: 1.8, // milk
  P003: 1.2, // eggs
  P017: 2.4, // bottled water
  P019: 1.5, // cola
  P020: 1.4, // energy drink
  P022: 1.7, // chips
  P023: 1.8, // chocolate
  P026: 1.2, // bananas
  P031: 1.6, // chicken sandwich
  P032: 1.3, // ham sandwich
  P033: 1.1, // sushi
};

function weightedChoice(items, getWeight, rng = Math.random) {
  const total = items.reduce(
    (sum, item) => sum + Math.max(0, getWeight(item)),
    0,
  );

  if (total <= 0) {
    throw new Error("Weighted choice requires a positive total weight.");
  }

  let threshold = rng() * total;

  for (const item of items) {
    threshold -= Math.max(0, getWeight(item));

    if (threshold < 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

function randomInteger(min, max, rng = Math.random) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function getDailyCustomerCount(date, rng = Math.random) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const isWeekend = weekday === 0 || weekday === 6;

  // An explicit demand assumption for a small CBD convenience store.
  const base = isWeekend ? 42 : 58;

  // Daily variation of approximately +/- 20%.
  const variation = 0.8 + rng() * 0.4;

  return Math.max(0, Math.round(base * variation));
}

function createCustomerProfile(rng = Math.random) {
  const customerType = weightedChoice(
    CUSTOMER_TYPES,
    (item) => item.weight,
    rng,
  );

  const mission = weightedChoice(MISSIONS, (item) => item.weight, rng);

  return {
    customerType: customerType.type,
    shoppingMission: mission.mission,
    missionConfig: mission,
  };
}

function getProductWeight(product, mission) {
  const categoryWeight = mission.categories[product.category] ?? 0;
  const popularity = PRODUCT_POPULARITY[product.id] ?? 1;

  return categoryWeight * popularity;
}

function generateBasketCandidates(products, mission, rng = Math.random) {
  const basket = [];
  const selectedProductIds = new Set();

  const itemCount = randomInteger(mission.minItems, mission.maxItems, rng);

  for (let i = 0; i < itemCount; i++) {
    const candidates = products.filter(
      (product) =>
        !selectedProductIds.has(product.id) &&
        getProductWeight(product, mission) > 0,
    );

    if (candidates.length === 0) {
      break;
    }

    const product = weightedChoice(
      candidates,
      (item) => getProductWeight(item, mission),
      rng,
    );

    selectedProductIds.add(product.id);

    basket.push({
      productId: product.id,
      requestedQuantity: randomInteger(1, 2, rng),
    });
  }

  return basket;
}

function generateDailyCustomerPlans(products, date, rng = Math.random) {
  const customerCount = getDailyCustomerCount(date, rng);
  const customers = [];

  for (let i = 0; i < customerCount; i++) {
    const profile = createCustomerProfile(rng);

    customers.push({
      customerType: profile.customerType,
      shoppingMission: profile.shoppingMission,
      basket: generateBasketCandidates(products, profile.missionConfig, rng),
    });
  }

  return customers;
}

module.exports = {
  getDailyCustomerCount,
  createCustomerProfile,
  generateBasketCandidates,
  generateDailyCustomerPlans,
};
