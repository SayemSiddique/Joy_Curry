// ============================================================================
// frontend/js/data/menu/dinner-specials.js — Phase 7
// Configurable bundle model for Dinner Specials.
// Source: Roadmap §4c, §6 "Dinner Specials".
//
// Each special includes: rice + 1 naan + 1 appetizer choice + 1 dessert choice
// + 1 entrée choice (category-restricted per special).
//
// Constraint ID pools are imported from constants.js — never duplicate them here.
// ============================================================================

import {
  COMBO_VEG_IDS,
  DINNER_SPECIAL_APPETIZER_IDS,
  DINNER_SPECIAL_DESSERT_IDS,
} from '../config/constants.js';

// All vegetable entrée IDs eligible for the Vegetable Dinner Special.
// Covers both vegetable-entrees.js and vegan-entrees.js categories.
const DINNER_SPECIAL_VEG_ENTREE_IDS = [
  'malai-kofta',
  'navrattan-korma',
  'paneer-makhni',
  'mattar-paneer',
  'palak-paneer',
  'daal-makhni',
  'aloo-gobi-mattar',
  'chana-masala',
  'bhindi-masala',
  'chana-saag',
  'baingan-bharta',
  'tarka-daal',
  'mixed-vegetables',
  'mushroom-masala',
];

// All chicken entrée IDs eligible for the Chicken Dinner Special.
const DINNER_SPECIAL_CHICKEN_ENTREE_IDS = [
  'chk-tikka-masala',
  'chk-makhni',
  'chk-curry',
  'chk-vindaloo',
  'chk-korma',
  'chk-karahi',
  'chk-saag',
  'chk-jhalfrezi',
  'chk-chili',
  'chk-keema-aloo',
];

// Lamb, goat, beef, and flounder fish entrée IDs eligible for the
// Lamb/Goat/Beef/Fish Dinner Special.
const DINNER_SPECIAL_MEAT_FISH_ENTREE_IDS = [
  'lamb-curry-entree',
  'lamb-vindaloo-entree',
  'lamb-korma-entree',
  'lamb-karahi-entree',
  'lamb-saag-entree',
  'lamb-bhuna-entree',
  'goat-curry-entree',
  'goat-bhuna-entree',
  'goat-karahi-entree',
  'beef-curry-entree',
  'fish-curry',       // Flounder — the only fish option per the physical menu
];

export const dinnerSpecials = [
  {
    id:           'dinner-special-veg',
    name:         'Vegetable Dinner Special',
    type:         'dinner-special',
    category:     'dinner-special',
    subcategory:  null,
    description:  'Rice, naan, your choice of vegetable entrée, appetizer, and dessert.',
    basePrice:    18.95,
    isVegan:      false,   // entrée options include dairy (paneer dishes)
    isVegetarian: true,
    isGlutenFree: false,
    spiceLevel:   null,
    allergens:    [],
    allergenNote: null,
    tags:         ['bundle', 'dinner-special'],
    imageUrl:     '/images/dishes/dinner-special-veg.jpg',
    inStock:      true,
    isActive:     true,
    includes:     ['rice', '1 naan'],
    fixedItemIds: [],
    slots: [
      {
        id:        'appetizer',
        label:     'Appetizer',
        choose:    1,
        optionIds: DINNER_SPECIAL_APPETIZER_IDS,
      },
      {
        id:        'entree',
        label:     'Vegetable Entrée',
        choose:    1,
        optionIds: DINNER_SPECIAL_VEG_ENTREE_IDS,
      },
      {
        id:        'dessert',
        label:     'Dessert',
        choose:    1,
        optionIds: DINNER_SPECIAL_DESSERT_IDS,
      },
    ],
  },

  {
    id:           'dinner-special-chicken',
    name:         'Chicken Dinner Special',
    type:         'dinner-special',
    category:     'dinner-special',
    subcategory:  null,
    description:  'Rice, naan, your choice of chicken entrée, appetizer, and dessert.',
    basePrice:    21.95,
    isVegan:      false,
    isVegetarian: false,
    isGlutenFree: false,
    spiceLevel:   null,
    allergens:    ['cashew', 'dairy'],  // chicken sauce contains cashew and dairy
    allergenNote: null,
    tags:         ['bundle', 'dinner-special'],
    imageUrl:     '/images/dishes/dinner-special-chicken.jpg',
    inStock:      true,
    isActive:     true,
    includes:     ['rice', '1 naan'],
    fixedItemIds: [],
    slots: [
      {
        id:        'appetizer',
        label:     'Appetizer',
        choose:    1,
        optionIds: DINNER_SPECIAL_APPETIZER_IDS,
      },
      {
        id:        'entree',
        label:     'Chicken Entrée',
        choose:    1,
        optionIds: DINNER_SPECIAL_CHICKEN_ENTREE_IDS,
      },
      {
        id:        'dessert',
        label:     'Dessert',
        choose:    1,
        optionIds: DINNER_SPECIAL_DESSERT_IDS,
      },
    ],
  },

  {
    id:           'dinner-special-meat-fish',
    name:         'Dinner with Lamb, Goat, Beef or Fish',
    type:         'dinner-special',
    category:     'dinner-special',
    subcategory:  null,
    description:  'Rice, naan, your choice of lamb, goat, beef, or fish entrée, appetizer, and dessert.',
    basePrice:    22.95,
    isVegan:      false,
    isVegetarian: false,
    isGlutenFree: false,
    spiceLevel:   null,
    allergens:    [],
    allergenNote: null,
    tags:         ['bundle', 'dinner-special'],
    imageUrl:     '/images/dishes/dinner-special-meat-fish.jpg',
    inStock:      true,
    isActive:     true,
    includes:     ['rice', '1 naan'],
    fixedItemIds: [],
    slots: [
      {
        id:        'appetizer',
        label:     'Appetizer',
        choose:    1,
        optionIds: DINNER_SPECIAL_APPETIZER_IDS,
      },
      {
        id:        'entree',
        label:     'Entrée',
        choose:    1,
        optionIds: DINNER_SPECIAL_MEAT_FISH_ENTREE_IDS,
      },
      {
        id:        'dessert',
        label:     'Dessert',
        choose:    1,
        optionIds: DINNER_SPECIAL_DESSERT_IDS,
      },
    ],
  },
];
