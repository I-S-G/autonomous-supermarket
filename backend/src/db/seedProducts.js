const db = require("./database");

const products = [
  // Pantry and grocery
  {
    id: "P001",
    name: "White Bread 700g",
    category: "Bakery",
    cost: 2.2,
    price: 3.8,
    qty: 45,
    perishable: true,
    shelf: 5,
  },
  {
    id: "P002",
    name: "Full Cream Milk 2L",
    category: "Dairy",
    cost: 3.1,
    price: 4.8,
    qty: 55,
    perishable: true,
    shelf: 10,
  },
  {
    id: "P003",
    name: "Eggs 12 Pack",
    category: "Dairy",
    cost: 4.0,
    price: 6.0,
    qty: 35,
    perishable: true,
    shelf: 28,
  },
  {
    id: "P004",
    name: "Butter 250g",
    category: "Dairy",
    cost: 3.0,
    price: 4.7,
    qty: 30,
    perishable: true,
    shelf: 45,
  },
  {
    id: "P005",
    name: "Cheddar Cheese 500g",
    category: "Dairy",
    cost: 5.0,
    price: 7.5,
    qty: 25,
    perishable: true,
    shelf: 35,
  },
  {
    id: "P006",
    name: "Greek Yoghurt 1kg",
    category: "Dairy",
    cost: 4.2,
    price: 6.5,
    qty: 25,
    perishable: true,
    shelf: 21,
  },
  {
    id: "P007",
    name: "White Rice 1kg",
    category: "Pantry",
    cost: 2.0,
    price: 3.5,
    qty: 45,
    perishable: false,
    shelf: null,
  },
  {
    id: "P008",
    name: "Pasta 500g",
    category: "Pantry",
    cost: 1.4,
    price: 2.5,
    qty: 45,
    perishable: false,
    shelf: null,
  },
  {
    id: "P009",
    name: "Pasta Sauce 500g",
    category: "Pantry",
    cost: 2.1,
    price: 3.8,
    qty: 30,
    perishable: false,
    shelf: null,
  },
  {
    id: "P010",
    name: "Breakfast Cereal 500g",
    category: "Pantry",
    cost: 3.4,
    price: 5.5,
    qty: 25,
    perishable: false,
    shelf: null,
  },
  {
    id: "P011",
    name: "Rolled Oats 1kg",
    category: "Pantry",
    cost: 2.5,
    price: 4.0,
    qty: 25,
    perishable: false,
    shelf: null,
  },
  {
    id: "P012",
    name: "Peanut Butter 375g",
    category: "Pantry",
    cost: 3.2,
    price: 5.0,
    qty: 20,
    perishable: false,
    shelf: null,
  },
  {
    id: "P013",
    name: "Cooking Oil 1L",
    category: "Pantry",
    cost: 3.5,
    price: 5.5,
    qty: 25,
    perishable: false,
    shelf: null,
  },
  {
    id: "P014",
    name: "Canned Baked Beans 420g",
    category: "Pantry",
    cost: 1.2,
    price: 2.2,
    qty: 40,
    perishable: false,
    shelf: null,
  },
  {
    id: "P015",
    name: "Canned Tuna 95g",
    category: "Pantry",
    cost: 1.5,
    price: 2.8,
    qty: 40,
    perishable: false,
    shelf: null,
  },
  {
    id: "P016",
    name: "Instant Noodles 5 Pack",
    category: "Pantry",
    cost: 2.8,
    price: 4.5,
    qty: 35,
    perishable: false,
    shelf: null,
  },

  // Drinks
  {
    id: "P017",
    name: "Bottled Water 600mL",
    category: "Drinks",
    cost: 0.6,
    price: 1.5,
    qty: 100,
    perishable: false,
    shelf: null,
  },
  {
    id: "P018",
    name: "Orange Juice 2L",
    category: "Drinks",
    cost: 3.0,
    price: 4.8,
    qty: 30,
    perishable: true,
    shelf: 14,
  },
  {
    id: "P019",
    name: "Cola 1.25L",
    category: "Drinks",
    cost: 2.0,
    price: 3.5,
    qty: 45,
    perishable: false,
    shelf: null,
  },
  {
    id: "P020",
    name: "Energy Drink 500mL",
    category: "Drinks",
    cost: 2.2,
    price: 3.8,
    qty: 45,
    perishable: false,
    shelf: null,
  },
  {
    id: "P021",
    name: "Instant Coffee 100g",
    category: "Drinks",
    cost: 4.5,
    price: 7.0,
    qty: 20,
    perishable: false,
    shelf: null,
  },

  // Snacks and confectionery
  {
    id: "P022",
    name: "Potato Chips 170g",
    category: "Snacks",
    cost: 2.0,
    price: 3.5,
    qty: 45,
    perishable: false,
    shelf: null,
  },
  {
    id: "P023",
    name: "Chocolate Bar 50g",
    category: "Snacks",
    cost: 1.1,
    price: 2.0,
    qty: 60,
    perishable: false,
    shelf: null,
  },
  {
    id: "P024",
    name: "Mixed Nuts 150g",
    category: "Snacks",
    cost: 3.0,
    price: 4.8,
    qty: 25,
    perishable: false,
    shelf: null,
  },
  {
    id: "P025",
    name: "Muesli Bar 6 Pack",
    category: "Snacks",
    cost: 2.5,
    price: 4.0,
    qty: 30,
    perishable: false,
    shelf: null,
  },

  // Fresh food
  {
    id: "P026",
    name: "Bananas 1kg",
    category: "Fresh Food",
    cost: 2.2,
    price: 3.5,
    qty: 35,
    perishable: true,
    shelf: 6,
  },
  {
    id: "P027",
    name: "Apples 1kg",
    category: "Fresh Food",
    cost: 3.0,
    price: 4.8,
    qty: 30,
    perishable: true,
    shelf: 14,
  },
  {
    id: "P028",
    name: "Tomatoes 500g",
    category: "Fresh Food",
    cost: 2.5,
    price: 4.0,
    qty: 25,
    perishable: true,
    shelf: 7,
  },
  {
    id: "P029",
    name: "Potatoes 2kg",
    category: "Fresh Food",
    cost: 3.5,
    price: 5.5,
    qty: 25,
    perishable: true,
    shelf: 21,
  },
  {
    id: "P030",
    name: "Bagged Salad 120g",
    category: "Fresh Food",
    cost: 2.0,
    price: 3.5,
    qty: 20,
    perishable: true,
    shelf: 5,
  },

  // Ready-to-eat
  {
    id: "P031",
    name: "Chicken Sandwich",
    category: "Ready-to-Eat",
    cost: 4.0,
    price: 7.0,
    qty: 18,
    perishable: true,
    shelf: 2,
  },
  {
    id: "P032",
    name: "Ham Sandwich",
    category: "Ready-to-Eat",
    cost: 3.5,
    price: 6.5,
    qty: 18,
    perishable: true,
    shelf: 2,
  },
  {
    id: "P033",
    name: "Sushi Pack",
    category: "Ready-to-Eat",
    cost: 5.0,
    price: 8.5,
    qty: 15,
    perishable: true,
    shelf: 1,
  },
  {
    id: "P034",
    name: "Muffin 2 Pack",
    category: "Bakery",
    cost: 2.0,
    price: 3.8,
    qty: 25,
    perishable: true,
    shelf: 4,
  },

  // Household
  {
    id: "P035",
    name: "Dishwashing Liquid 500mL",
    category: "Household",
    cost: 2.5,
    price: 4.0,
    qty: 20,
    perishable: false,
    shelf: null,
  },
  {
    id: "P036",
    name: "Laundry Detergent 1L",
    category: "Household",
    cost: 5.0,
    price: 8.0,
    qty: 15,
    perishable: false,
    shelf: null,
  },
  {
    id: "P037",
    name: "Toilet Paper 4 Pack",
    category: "Household",
    cost: 3.5,
    price: 5.5,
    qty: 25,
    perishable: false,
    shelf: null,
  },

  // Personal care and convenience
  {
    id: "P038",
    name: "Toothpaste 100g",
    category: "Personal Care",
    cost: 2.0,
    price: 3.5,
    qty: 20,
    perishable: false,
    shelf: null,
  },
  {
    id: "P039",
    name: "Shampoo 400mL",
    category: "Personal Care",
    cost: 4.0,
    price: 6.5,
    qty: 15,
    perishable: false,
    shelf: null,
  },
  {
    id: "P040",
    name: "AA Batteries 4 Pack",
    category: "Convenience",
    cost: 3.0,
    price: 5.0,
    qty: 15,
    perishable: false,
    shelf: null,
  },
];

const toCents = (amount) => Math.round(amount * 100);

const openingInventoryCostCents = products.reduce(
  (total, product) => total + toCents(product.cost) * product.qty,
  0,
);

const MAX_OPENING_BUDGET_CENTS = 4_000_000;

if (openingInventoryCostCents > MAX_OPENING_BUDGET_CENTS) {
  throw new Error(
    `Opening inventory exceeds A$40,000: A$${(
      openingInventoryCostCents / 100
    ).toFixed(2)}`,
  );
}

const insertProduct = db.prepare(`
  INSERT INTO products (
    id, name, category, unit_cost_cents, unit_price_cents,
    is_perishable, shelf_life_days
  )
  VALUES (
    @id, @name, @category, @cost, @price,
    @perishable, @shelf
  )
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    category = excluded.category,
    unit_cost_cents = excluded.unit_cost_cents,
    unit_price_cents = excluded.unit_price_cents,
    is_perishable = excluded.is_perishable,
    shelf_life_days = excluded.shelf_life_days
`);

const seed = db.transaction(() => {
  for (const product of products) {
    insertProduct.run({
      id: product.id,
      name: product.name,
      category: product.category,
      cost: toCents(product.cost),
      price: toCents(product.price),
      perishable: product.perishable ? 1 : 0,
      shelf: product.shelf,
    });
  }
});

seed();

console.log(`Seeded ${products.length} supermarket products.`);
console.log(
  `Opening inventory cost: A$${(openingInventoryCostCents / 100).toFixed(2)}`,
);
console.log(
  `Remaining inventory budget: A$${(
    (MAX_OPENING_BUDGET_CENTS - openingInventoryCostCents) /
    100
  ).toFixed(2)}`,
);

// Keep quantities available for the run-initialization service.
module.exports = { products, openingInventoryCostCents, toCents };
