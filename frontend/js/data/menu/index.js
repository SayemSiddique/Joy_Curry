// ============================================================================
// frontend/js/data/menu/index.js — Menu Data Aggregator
// Imports all category files and re-exports as a single menu array
// ============================================================================

import { appetizers } from './appetizers.js';
import { saladsAndSoups } from './salads-soups.js';
import { vegetableEntrees } from './vegetable-entrees.js';
import { veganEntrees } from './vegan-entrees.js';
import { chickenEntrees } from './chicken-entrees.js';
import { meatEntrees } from './meat-entrees.js';
import { fishAndShrimp } from './fish-shrimp.js';
import { tandooriDishes } from './tandoori.js';
import { riceAndBiryani } from './rice-biryani.js';
import { expressLunch } from './express-lunch.js';
import { sides } from './sides.js';
import { condiments } from './condiments.js';
import { breads } from './breads.js';
import { desserts } from './desserts.js';
import { beverages } from './beverages.js';

// Stubs for Phase 7 bundles
import { dinnerSpecials } from './dinner-specials.js';
import { joyCombos } from './joy-combos.js';

export const menu = [
  ...appetizers,
  ...saladsAndSoups,
  ...vegetableEntrees,
  ...veganEntrees,
  ...chickenEntrees,
  ...meatEntrees,
  ...fishAndShrimp,
  ...tandooriDishes,
  ...riceAndBiryani,
  ...expressLunch,
  ...sides,
  ...condiments,
  ...breads,
  ...desserts,
  ...beverages,
  ...dinnerSpecials,  // Phase 7
  ...joyCombos        // Phase 7
];

console.log(`✓ Menu aggregated: ${menu.length} items`);
