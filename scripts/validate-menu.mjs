// ============================================================================
// scripts/validate-menu.mjs
// Phase 1 schema + integrity validator for the Joy Curry menu data layer.
//
// Purpose:
//   Enforces the Roadmap §4a schema contract on every menu item and catches
//   cross-file integrity violations (duplicate ids, unknown categories) before
//   they reach the seeded database in Phase 5. This is the dependency that makes
//   each category file independently reviewable and verifiable (directives D6/D8).
//
// Contract:
//   - Reads the aggregated `menu` array exported by data/menu/index.js.
//   - Reads the per-file export map below so violations can be reported per-file.
//   - Exits 0 on full conformance; exits 1 on any violation.
//   - Self-test mode (`--self-test`) runs the suite against an intentionally
//     broken fixture and asserts that at least one violation is caught.
//
// Run:
//   node scripts/validate-menu.mjs            # validate real dataset
//   node scripts/validate-menu.mjs --self-test# prove it fails on bad data
// ============================================================================

import { menu } from '../apps/api/db/data/menu/index.js';

// ----------------------------------------------------------------------------
// Configuration: per-file export-name map mirrors index.js exactly.
// Single source of truth for which category each item "belongs" to for
// reporting purposes. Items carry their own `category` field, validated below.
// ----------------------------------------------------------------------------
const FILE_EXPORT_MAP = {
  appetizers: 'appetizers',
  'salads-soups': 'saladsAndSoups',
  'vegetable-entrees': 'vegetableEntrees',
  'vegan-entrees': 'veganEntrees',
  'chicken-entrees': 'chickenEntrees',
  'meat-entrees': 'meatEntrees',
  'fish-shrimp': 'fishAndShrimp',
  tandoori: 'tandooriDishes',
  'rice-biryani': 'riceAndBiryani',
  'express-lunch': 'expressLunch',
  sides: 'sides',
  condiments: 'condiments',
  breads: 'breads',
  desserts: 'desserts',
  beverages: 'beverages',
};

// The authoritative set of known category slugs. Items may only carry one of
// these. Multi-context items reuse the same category slug across files (e.g.
// lamb-curry-entree and lamb-curry-side both use 'meat-entree' / 'sides').
const KNOWN_CATEGORIES = new Set([
  'appetizer', 'salad', 'soup', 'vegetable-entree', 'vegan-entree',
  'chicken-entree', 'meat-entree', 'fish-shrimp', 'tandoori', 'rice-biryani',
  'express-lunch', 'side', 'condiment', 'bread', 'dessert', 'beverage',
  'dinner-special', 'combo',  // Phase 7 bundle categories
]);

const SPICE_LEVELS = new Set([null, 'Mild', 'Medium', 'Hot']);
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Expected item count per category slug. If the aggregated menu deviates, a
// violation is raised — this catches the silent-data-loss bug class where a
// file exports the correct name but not the full union of items (see D17
// defect log: salads-soups.js incident). Updated when new categories are added.
// NOTE: some files export items across multiple category slugs (e.g.
// salads-soups.js exports both 'salad' and 'soup'), so the map key is the
// category slug, not the file name.
const EXPECTED_COUNTS = {
  appetizer:           12,  // +1 Pakora added in Phase 7
  salad:                2,
  soup:                 1,
  'vegetable-entree':   6,
  'vegan-entree':       8,
  'chicken-entree':    10,
  'meat-entree':       10,
  'fish-shrimp':        4,
  tandoori:            12,
  'rice-biryani':       9,
  'express-lunch':      9,
  side:                16,
  condiment:            6,
  bread:               11,
  dessert:              3,
  beverage:             8,
  'dinner-special':     3,  // Phase 7 bundles
  combo:               15,  // Phase 7 Joy Combos
};

// Required scalar fields with their expected JS type (typeof result, or a
// custom predicate key resolved in assertType()). Every §4a field is enforced.
const REQUIRED_FIELDS = [
  ['id', 'string'],
  ['name', 'string'],
  ['category', 'string'],
  ['description', 'string'],
  ['basePrice', 'finiteNumber'],
  ['isVegan', 'boolean'],
  ['isVegetarian', 'boolean'],
  ['isGlutenFree', 'boolean'],
  ['spiceLevel', 'spiceEnum'],
  ['allergens', 'array'],
  ['allergenNote', 'stringOrNull'],
  ['servedWith', 'servedWithValue'],
  ['proteinChoice', 'stringArrayOrNull'],
  ['sizeOptions', 'sizeOptionsOrNull'],
  ['modifiers', 'modifiersValue'],
  ['pieceCount', 'integerOrNull'],
  ['tags', 'stringArray'],
  ['searchKeywords', 'stringArray'],
  ['imageUrl', 'imageUrl'],
  ['inStock', 'boolean'],
  ['isActive', 'boolean'],
];

// ----------------------------------------------------------------------------
// Type predicates. Each returns true if the value conforms.
// ----------------------------------------------------------------------------
const isStringArray = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isStringArrayOrNull = (v) => v === null || isStringArray(v);

const isSizeOptionsOrNull = (v) => {
  if (v === null) return true;
  if (!Array.isArray(v) || v.length === 0) return false;
  return v.every(
    (opt) =>
      opt &&
      typeof opt === 'object' &&
      typeof opt.label === 'string' &&
      typeof opt.price === 'number' &&
      Number.isFinite(opt.price)
  );
};

const isModifiersValue = (v) => {
  if (v === null) return true;
  if (!Array.isArray(v)) return false;
  // Empty array is allowed but the convention is `null` for "no modifiers".
  return v.every(
    (mod) =>
      mod &&
      typeof mod === 'object' &&
      typeof mod.id === 'string' &&
      KEBAB_CASE.test(mod.id) &&
      typeof mod.label === 'string' &&
      typeof mod.priceDelta === 'number' &&
      Number.isFinite(mod.priceDelta)
  );
};

const SERVED_WITH_VALUES = new Set([null, 'rice', 'raita', 'naan']);
const isServedWithValue = (v) => SERVED_WITH_VALUES.has(v);

function assertType(value, expected) {
  switch (expected) {
    case 'string':
      return typeof value === 'string' && value.length > 0;
    case 'boolean':
      return typeof value === 'boolean';
    case 'finiteNumber':
      return typeof value === 'number' && Number.isFinite(value) && value >= 0;
    case 'spiceEnum':
      return SPICE_LEVELS.has(value);
    case 'array':
      return Array.isArray(value);
    case 'stringArray':
      return isStringArray(value);
    case 'stringOrNull':
      return value === null || (typeof value === 'string' && value.length > 0);
    case 'stringArrayOrNull':
      return isStringArrayOrNull(value);
    case 'servedWithValue':
      return isServedWithValue(value);
    case 'sizeOptionsOrNull':
      return isSizeOptionsOrNull(value);
    case 'modifiersValue':
      return isModifiersValue(value);
    case 'integerOrNull':
      return value === null || (Number.isInteger(value) && value > 0);
    case 'imageUrl':
      return typeof value === 'string' && value.startsWith('/images/');
    default:
      throw new Error(`Unknown type predicate: ${expected}`);
  }
}

// Bundle items (type: 'dinner-special' | 'combo') follow §4c schema, not §4a.
// Required bundle fields — validated separately from REQUIRED_FIELDS.
const BUNDLE_REQUIRED_FIELDS = [
  ['id',           'string'],
  ['name',         'string'],
  ['type',         'string'],
  ['category',     'string'],
  ['description',  'string'],
  ['basePrice',    'finiteNumber'],
  ['isVegan',      'boolean'],
  ['isVegetarian', 'boolean'],
  ['inStock',      'boolean'],
  ['isActive',     'boolean'],
  ['tags',         'stringArray'],
  ['imageUrl',     'imageUrl'],
];

const BUNDLE_TYPES = new Set(['dinner-special', 'combo']);

// ----------------------------------------------------------------------------
// Bundle slot validation: each slot must have id, label, choose ≥ 1, optionIds.
// ----------------------------------------------------------------------------
function validateBundleSlots(item) {
  const violations = [];
  if (!Array.isArray(item.slots)) {
    violations.push({ field: 'slots', message: 'slots must be an array' });
    return violations;
  }
  for (const slot of item.slots) {
    if (!slot || typeof slot !== 'object') {
      violations.push({ field: 'slots', message: 'each slot must be an object' });
      continue;
    }
    if (typeof slot.id !== 'string' || !KEBAB_CASE.test(slot.id)) {
      violations.push({ field: 'slots', message: `slot.id "${slot.id}" is not valid kebab-case` });
    }
    if (typeof slot.label !== 'string' || slot.label.length === 0) {
      violations.push({ field: 'slots', message: `slot "${slot.id}" missing label` });
    }
    if (!Number.isInteger(slot.choose) || slot.choose < 1) {
      violations.push({ field: 'slots', message: `slot "${slot.id}" choose must be a positive integer` });
    }
    if (!Array.isArray(slot.optionIds) || slot.optionIds.length === 0) {
      violations.push({ field: 'slots', message: `slot "${slot.id}" optionIds must be a non-empty array` });
    }
  }
  return violations;
}

// ----------------------------------------------------------------------------
// Core validation: routes to bundle or regular schema based on item.type.
// Returns an array of {item, field, message} violations.
// ----------------------------------------------------------------------------
function validateItem(item) {
  const violations = [];

  const isBundle = typeof item.type === 'string' && BUNDLE_TYPES.has(item.type);
  const fieldsToCheck = isBundle ? BUNDLE_REQUIRED_FIELDS : REQUIRED_FIELDS;

  for (const [field, expected] of fieldsToCheck) {
    if (!(field in item)) {
      violations.push({ field, message: `missing required field "${field}"` });
      continue;
    }
    if (!assertType(item[field], expected)) {
      violations.push({
        field,
        message: `field "${field}" has invalid value ${JSON.stringify(item[field])} (expected ${expected})`,
      });
    }
  }

  if (isBundle) {
    for (const v of validateBundleSlots(item)) violations.push(v);
    if (!Array.isArray(item.fixedItemIds)) {
      violations.push({ field: 'fixedItemIds', message: 'fixedItemIds must be an array' });
    }
    if (!Array.isArray(item.includes)) {
      violations.push({ field: 'includes', message: 'includes must be an array' });
    }
  }

  // Structural rule: id must be kebab-case. Checked separately so the message
  // is specific even though it overlaps with the string type check.
  if (typeof item.id === 'string' && !KEBAB_CASE.test(item.id)) {
    violations.push({ field: 'id', message: `id "${item.id}" is not kebab-case` });
  }

  // Structural rule: category must be a known slug.
  if (typeof item.category === 'string' && !KNOWN_CATEGORIES.has(item.category)) {
    violations.push({
      field: 'category',
      message: `category "${item.category}" is not in KNOWN_CATEGORIES`,
    });
  }

  // basePrice currency discipline: the locked Phase 1 decision allows floats in
  // JS data files (integer cents is a Phase 5 seed.js concern). We DO enforce
  // that the value has no more than 2 decimal places — anything finer is a
  // data-entry error that would corrupt pricing downstream.
  if (
    typeof item.basePrice === 'number' &&
    Number.isFinite(item.basePrice) &&
    Math.round(item.basePrice * 100) !== item.basePrice * 100
  ) {
    violations.push({
      field: 'basePrice',
      message: `basePrice ${item.basePrice} has more than 2 decimal places`,
    });
  }

  return violations;
}

// ----------------------------------------------------------------------------
// Cross-file integrity: id uniqueness across the entire aggregated menu.
// Multi-context collisions (two objects with the same id) are a hard fail —
// the Roadmap mandates context suffixes (e.g. -entree / -side / -lunch).
// The detection itself runs inline in run() below so the first-seen index is
// reported with the violation. No standalone function is needed.
// ----------------------------------------------------------------------------
// Reporter: groups violations by category file (best-effort via category slug)
// and prints a readable PASS/FAIL summary. Returns the total violation count.
// ----------------------------------------------------------------------------
function report(violations, totalItems) {
  if (violations.length === 0) {
    console.log(`\n✓ PASS — ${totalItems} items validated, 0 violations.\n`);
    return 0;
  }

  console.error(`\n✗ FAIL — ${totalItems} items, ${violations.length} violation(s):\n`);
  for (const v of violations) {
    const id = typeof v.item?.id === 'string' ? v.item.id : '(invalid id)';
    console.error(`  [${id}] ${v.message}`);
  }
  console.error('');
  return violations.length;
}

function run(dataset) {
  const violations = [];
  const seenIds = new Map(); // id -> index
  dataset.forEach((item, index) => {
    if (item === null || typeof item !== 'object') {
      violations.push({ item: { id: `index:${index}` }, message: `item at index ${index} is not an object` });
      return;
    }
    for (const v of validateItem(item)) {
      violations.push({ item, message: v.message });
    }
    if (typeof item.id === 'string') {
      if (seenIds.has(item.id)) {
        violations.push({
          item,
          message: `duplicate id "${item.id}" (first seen at index ${seenIds.get(item.id)})`,
        });
      } else {
        seenIds.set(item.id, index);
      }
    }
  });
  return violations;
}

// ----------------------------------------------------------------------------
// Self-test: an intentionally broken fixture. The validator MUST catch at
// least one violation of each major class. Exits non-zero if it fails to.
// ----------------------------------------------------------------------------
function selfTest() {
  const broken = [
    // Good item — should produce no violations.
    {
      id: 'good-item', name: 'Good', category: 'dessert', description: 'ok',
      basePrice: 4.0, isVegan: false, isVegetarian: true, isGlutenFree: false,
      spiceLevel: null, allergens: [], allergenNote: null, servedWith: null,
      proteinChoice: null, sizeOptions: null, modifiers: null, pieceCount: null,
      tags: [], searchKeywords: [], imageUrl: '/images/dishes/good.jpg',
      inStock: true, isActive: true,
    },
    // Bad item — many violations.
    {
      id: 'Bad_ID', // not kebab-case
      name: '', // empty string
      category: 'fictional', // unknown
      basePrice: 1.999, // >2 decimals
      isVegan: 'yes', // wrong type
      spiceLevel: 'Nuclear', // outside enum
      allergens: 'cashew', // not array
      imageUrl: 'http://example.com/x.jpg', // not /images/
      // missing: description, isVegetarian, isGlutenFree, allergenNote, servedWith,
      //          proteinChoice, sizeOptions, modifiers, pieceCount, tags,
      //          searchKeywords, inStock, isActive
    },
    // Duplicate of good-item's id — integrity violation.
    {
      id: 'good-item', name: 'Dup', category: 'dessert', description: 'dup',
      basePrice: 4.0, isVegan: false, isVegetarian: true, isGlutenFree: false,
      spiceLevel: null, allergens: [], allergenNote: null, servedWith: null,
      proteinChoice: null, sizeOptions: null, modifiers: null, pieceCount: null,
      tags: [], searchKeywords: [], imageUrl: '/images/dishes/dup.jpg',
      inStock: true, isActive: true,
    },
  ];

  const violations = run(broken);
  const classes = new Set();
  for (const v of violations) {
    if (v.message.includes('kebab-case')) classes.add('kebab');
    if (v.message.includes('not in KNOWN_CATEGORIES')) classes.add('category');
    if (v.message.includes('more than 2 decimal')) classes.add('decimals');
    if (v.message.includes('duplicate id')) classes.add('duplicate');
    if (v.message.includes('missing required')) classes.add('missing');
    if (v.message.includes('invalid value')) classes.add('type');
  }

  const required = ['kebab', 'category', 'decimals', 'duplicate', 'missing', 'type'];
  const missing = required.filter((c) => !classes.has(c));

  if (missing.length > 0) {
    console.error(`\n✗ SELF-TEST FAIL — validator did not catch: ${missing.join(', ')}`);
    console.error(`  (caught ${violations.length} violations of classes: ${[...classes].join(', ')})\n`);
    return 1;
  }
  console.log(`\n✓ SELF-TEST PASS — validator caught all ${required.length} violation classes`);
  console.log(`  (${violations.length} violations detected across ${broken.length} fixture items)\n`);
  return 0;
}

// ----------------------------------------------------------------------------
// Entry point.
// ----------------------------------------------------------------------------
function main() {
  if (process.argv.includes('--self-test')) {
    process.exit(selfTest());
  }

  const violations = run(menu);
  const count = report(violations, menu.length);

  // Per-category count check: catches silent data loss where a file exports
  // the right name but fewer items than expected (see D17 defect log).
  const actualCounts = {};
  for (const item of menu) {
    if (typeof item.category === 'string') {
      actualCounts[item.category] = (actualCounts[item.category] || 0) + 1;
    }
  }
  let countViolations = 0;
  for (const [cat, expected] of Object.entries(EXPECTED_COUNTS)) {
    const actual = actualCounts[cat] || 0;
    if (actual !== expected) {
      console.error(`  ✗ count mismatch: category "${cat}" has ${actual} items (expected ${expected})`);
      countViolations++;
    }
  }
  // Also flag categories that appear in the data but not in EXPECTED_COUNTS
  // (a new category was added without updating this map).
  for (const cat of Object.keys(actualCounts)) {
    if (!(cat in EXPECTED_COUNTS)) {
      console.error(`  ✗ unknown category in data: "${cat}" (${actualCounts[cat]} items) — add to EXPECTED_COUNTS`);
      countViolations++;
    }
  }

  if (count === 0 && countViolations === 0) {
    console.log('Per-category item counts (all match expected):');
    for (const [cat, expected] of Object.entries(EXPECTED_COUNTS)) {
      const actual = actualCounts[cat] || 0;
      const mark = actual === expected ? '✓' : '✗';
      console.log(`  ${mark} ${cat.padEnd(20)} ${actual} / ${expected}`);
    }
    console.log(`  ${'─'.repeat(40)}`);
    console.log(`  Total: ${menu.length} items`);
  }

  process.exit(count === 0 && countViolations === 0 ? 0 : 1);
}

main();
