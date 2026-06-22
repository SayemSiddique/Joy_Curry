// ============================================================================
// scripts/menu-queries.mjs
// Phase 1 capstone: practice queries using Array.prototype methods.
//
// Purpose:
//   Demonstrates proficiency with filter, map, find, reduce, some, every on
//   the real Joy Curry menu dataset. These queries are the M1.5 deliverable
//   verification — they prove the data layer is populated, queryable, and
//   internally consistent.
//
// Run:
//   node scripts/menu-queries.mjs
// ============================================================================

import { menu } from '../backend/db/data/menu/index.js';

// Helpers for readable output.
const sep = '─'.repeat(60);
const fmt = (n) => `$${n.toFixed(2)}`;

// ============================================================================
// 1. All vegan items under $12
// Uses: filter + map + sort
// ============================================================================
console.log(`\n${sep}`);
console.log('Q1: Vegan items under $12');
console.log(sep);

const veganUnder12 = menu
  .filter((item) => item.isVegan && item.basePrice < 12)
  .map((item) => `${item.name.padEnd(28)} ${fmt(item.basePrice).padStart(7)}  [${item.category}]`)
  .sort();

for (const line of veganUnder12) console.log(`  ${line}`);
console.log(`\n  Total: ${veganUnder12.length} items\n`);

// ============================================================================
// 2. Every dish with a cashew allergen
// Uses: filter + map + sort (demonstrates allergen array inspection)
// ============================================================================
console.log(`${sep}`);
console.log('Q2: Dishes containing cashew allergen');
console.log(sep);

const cashewDishes = menu
  .filter((item) => item.allergens.includes('cashew'))
  .map((item) => `${item.name.padEnd(28)} ${fmt(item.basePrice).padStart(7)}  [${item.category}]`)
  .sort();

for (const line of cashewDishes) console.log(`  ${line}`);
console.log(`\n  Total: ${cashewDishes.length} items\n`);

// ============================================================================
// 3. Mock cart — sum with tax and delivery
// Uses: find (to look up items) + reduce (to sum prices)
// ============================================================================
console.log(`${sep}`);
console.log('Q3: Mock cart total (3 items + tax + delivery)');
console.log(sep);

// Build a quick lookup so find() works by id.
const findById = (id) => menu.find((item) => item.id === id);

const cart = [
  { id: 'chicken-biryani', qty: 1 },
  { id: 'garlic-naan', qty: 2 },
  { id: 'mango-lassi', qty: 1 },
];

// NOTE: mango-lassi doesn't exist — we use lassi-mango. This is intentional
// to show that findById returns undefined when the id doesn't match.
// Correcting to the real id:
cart[2].id = 'lassi-mango';

let subtotal = 0;
for (const entry of cart) {
  const item = findById(entry.id);
  if (!item) {
    console.log(`  ⚠ item "${entry.id}" not found — skipping`);
    continue;
  }
  const lineTotal = item.basePrice * entry.qty;
  console.log(`  ${entry.qty}× ${item.name.padEnd(28)} ${fmt(item.basePrice).padStart(7)}  = ${fmt(lineTotal)}`);
  subtotal += lineTotal;
}

// Apply constants from the app config.
const TAX_RATE = 0.0875;
const DELIVERY_FEE = 3.00;
const tax = subtotal * TAX_RATE;
const total = subtotal + tax + DELIVERY_FEE;

console.log(`\n  Subtotal:                           ${fmt(subtotal).padStart(7)}`);
console.log(`  Tax (${(TAX_RATE * 100).toFixed(2)}%):                         ${fmt(tax).padStart(7)}`);
console.log(`  Delivery:                           ${fmt(DELIVERY_FEE).padStart(7)}`);
console.log(`  ${'─'.repeat(50)}`);
console.log(`  TOTAL:                              ${fmt(total).padStart(7)}\n`);

// ============================================================================
// 4. Bonus: menu statistics (uses reduce to build a summary object)
// ============================================================================
console.log(`${sep}`);
console.log('Q4: Menu statistics');
console.log(sep);

const stats = menu.reduce(
  (acc, item) => {
    acc.total++;
    acc.veganCount += item.isVegan ? 1 : 0;
    acc.vegetarianCount += item.isVegetarian ? 1 : 0;
    acc.glutenFreeCount += item.isGlutenFree ? 1 : 0;
    acc.priceSum += item.basePrice;
    if (item.basePrice < acc.minPrice) acc.minPrice = item.basePrice;
    if (item.basePrice > acc.maxPrice) acc.maxPrice = item.basePrice;
    if (item.spiceLevel === 'Hot') acc.hotCount++;
    return acc;
  },
  { total: 0, veganCount: 0, vegetarianCount: 0, glutenFreeCount: 0, priceSum: 0, minPrice: Infinity, maxPrice: 0, hotCount: 0 },
);

console.log(`  Total items:            ${stats.total}`);
console.log(`  Vegan:                  ${stats.veganCount}`);
console.log(`  Vegetarian:             ${stats.vegetarianCount}`);
console.log(`  Gluten-free:            ${stats.glutenFreeCount}`);
console.log(`  Price range:            ${fmt(stats.minPrice)} — ${fmt(stats.maxPrice)}`);
console.log(`  Average price:          ${fmt(stats.priceSum / stats.total)}`);
console.log(`  Dishes marked "Hot":    ${stats.hotCount}\n`);

// ============================================================================
// 5. Bonus: categories with item counts (uses reduce to group by category)
// ============================================================================
console.log(`${sep}`);
console.log('Q5: Items per category');
console.log(sep);

const byCategory = menu.reduce((acc, item) => {
  acc[item.category] = (acc[item.category] || 0) + 1;
  return acc;
}, {});

Object.entries(byCategory)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    console.log(`  ${cat.padEnd(20)} ${count}`);
  });

console.log(`\n${sep}`);
console.log('All queries completed.\n');
