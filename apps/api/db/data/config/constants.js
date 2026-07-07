// ============================================================================
// constants.js — Global configuration and business logic constants
// ============================================================================

export const CURRENCY = 'USD';
export const DELIVERY_FEE = 3.00;      // In dollars
export const TAX_RATE = 0.0875;        // NYC tax: 8.75%
export const MIN_ORDER = 10.00;        // Minimum order for delivery

// NOTE: This file is the original vanilla-frontend constants module, retained
// only as the source of the COMBO_*/DINNER_SPECIAL_* id arrays that the menu
// data files (dinner-specials.js, joy-combos.js) reference. The web app's API
// base URL lives in @joy-curry/core (initCore), not here.

// Allergen disclaimer — displayed as site-wide banner
export const ALLERGEN_NOTE_DEFAULT = 
  'Prepared in a kitchen that uses peanuts, tree nuts, and dairy. ' +
  'Cross-contact may occur. Confirm with staff before ordering if you have a severe allergy.';

// Spice level display names and icons
export const SPICE_LEVELS = {
  null: { label: 'Not specified', icon: '—' },
  'Mild': { label: 'Mild', icon: '🌶️' },
  'Medium': { label: 'Medium', icon: '🌶️🌶️' },
  'Hot': { label: 'Hot', icon: '🌶️🌶️🌶️' }
};

// ============================================================================
// Bundle constraint pools — single source of truth for Joy Combos and
// Dinner Specials. slot.optionIds in bundle files reference these arrays.
// Source: Roadmap §6 "Permitted entrées in combos".
// ============================================================================

export const COMBO_VEG_IDS = [
  'mixed-vegetables',
  'palak-paneer',
  'aloo-gobi-mattar',
  'chana-masala',
  'bhindi-masala',
  'chana-saag',
  'baingan-bharta',
  'tarka-daal',
];

export const COMBO_MEAT_IDS = [
  'chk-tikka-masala',
  'chk-curry',
  'chk-vindaloo',
  'chk-korma',
  'chk-karahi',
  'chk-saag',
  'lamb-curry-entree',
  'lamb-vindaloo-entree',
  'lamb-saag-entree',
  'goat-curry-entree',
  'beef-curry-entree',
];

export const DINNER_SPECIAL_APPETIZER_IDS = [
  'veg-samosa',
  'meat-samosa',
  'pakora',
  'aloo-tikki',
  'papadum',
  'aloo-papri-chaat',
];

export const DINNER_SPECIAL_DESSERT_IDS = [
  'gulab-jamun-dessert',
  'rasmalai-dessert',
  'kheer-dessert',
];
