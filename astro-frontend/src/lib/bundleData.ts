// Client-side bundle slot definitions.
// The DB holds the bundle items (price, name, etc.) but not slot configs,
// which remain here as a static client-side data layer.

export interface BundleSlot {
  id: string;
  label: string;
  choose: number;
  optionIds: string[];
}

export interface BundleDefinition {
  id: string;
  includes: string[];
  fixedItemIds: string[];
  slots: BundleSlot[];
}

// ── Combo option pools ──────────────────────────────────────────────────────

const COMBO_VEG_IDS = [
  'mixed-vegetables',
  'palak-paneer',
  'aloo-gobi-mattar',
  'chana-masala',
  'bhindi-masala',
  'chana-saag',
  'baingan-bharta',
  'tarka-daal',
];

const COMBO_MEAT_IDS = [
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

const COMBO_CHICKEN_LIMITED_IDS = ['chk-curry', 'chk-korma', 'chk-vindaloo'];

const COMBO_LAMB_LIMITED_IDS = [
  'lamb-curry-entree',
  'lamb-vindaloo-entree',
  'lamb-saag-entree',
];

// ── Dinner Special option pools ─────────────────────────────────────────────

const DINNER_SPECIAL_APPETIZER_IDS = [
  'veg-samosa',
  'meat-samosa',
  'pakora',
  'aloo-tikki',
  'papadum',
  'aloo-papri-chaat',
];

const DINNER_SPECIAL_DESSERT_IDS = [
  'gulab-jamun-dessert',
  'rasmalai-dessert',
  'kheer-dessert',
];

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
  'fish-curry',
];

// ── Bundle definitions ──────────────────────────────────────────────────────

export const BUNDLE_DEFINITIONS: BundleDefinition[] = [
  // Dinner Specials
  {
    id: 'dinner-special-veg',
    includes: ['rice', '1 naan'],
    fixedItemIds: [],
    slots: [
      { id: 'appetizer', label: 'Appetizer',       choose: 1, optionIds: DINNER_SPECIAL_APPETIZER_IDS },
      { id: 'entree',    label: 'Vegetable Entrée', choose: 1, optionIds: DINNER_SPECIAL_VEG_ENTREE_IDS },
      { id: 'dessert',   label: 'Dessert',          choose: 1, optionIds: DINNER_SPECIAL_DESSERT_IDS },
    ],
  },
  {
    id: 'dinner-special-chicken',
    includes: ['rice', '1 naan'],
    fixedItemIds: [],
    slots: [
      { id: 'appetizer', label: 'Appetizer',      choose: 1, optionIds: DINNER_SPECIAL_APPETIZER_IDS },
      { id: 'entree',    label: 'Chicken Entrée', choose: 1, optionIds: DINNER_SPECIAL_CHICKEN_ENTREE_IDS },
      { id: 'dessert',   label: 'Dessert',         choose: 1, optionIds: DINNER_SPECIAL_DESSERT_IDS },
    ],
  },
  {
    id: 'dinner-special-meat-fish',
    includes: ['rice', '1 naan'],
    fixedItemIds: [],
    slots: [
      { id: 'appetizer', label: 'Appetizer', choose: 1, optionIds: DINNER_SPECIAL_APPETIZER_IDS },
      { id: 'entree',    label: 'Entrée',    choose: 1, optionIds: DINNER_SPECIAL_MEAT_FISH_ENTREE_IDS },
      { id: 'dessert',   label: 'Dessert',   choose: 1, optionIds: DINNER_SPECIAL_DESSERT_IDS },
    ],
  },

  // Every Day Lunch Combos
  {
    id: 'combo-platter-1',
    includes: ['rice', '1 naan'],
    fixedItemIds: [],
    slots: [
      { id: 'veg', label: 'Vegetable Dishes', choose: 2, optionIds: COMBO_VEG_IDS },
    ],
  },
  {
    id: 'combo-platter-2',
    includes: ['rice', '1 naan'],
    fixedItemIds: [],
    slots: [
      { id: 'chicken', label: 'Chicken Dish',   choose: 1, optionIds: COMBO_CHICKEN_LIMITED_IDS },
      { id: 'veg',     label: 'Vegetable Dish', choose: 1, optionIds: COMBO_VEG_IDS },
    ],
  },
  {
    id: 'combo-platter-3',
    includes: ['rice', '1 naan'],
    fixedItemIds: [],
    slots: [
      { id: 'chicken', label: 'Chicken Dishes', choose: 2, optionIds: COMBO_CHICKEN_LIMITED_IDS },
    ],
  },
  {
    id: 'combo-platter-4',
    includes: ['rice', '1 naan'],
    fixedItemIds: ['tandoori-chicken'],
    slots: [
      { id: 'veg', label: 'Vegetable Dish', choose: 1, optionIds: COMBO_VEG_IDS },
    ],
  },
  {
    id: 'combo-platter-5',
    includes: ['rice', '1 naan'],
    fixedItemIds: ['chk-tikka-masala'],
    slots: [
      { id: 'veg', label: 'Vegetable Dish', choose: 1, optionIds: COMBO_VEG_IDS },
    ],
  },
  {
    id: 'combo-platter-6',
    includes: ['rice', '1 naan'],
    fixedItemIds: [],
    slots: [
      { id: 'lamb', label: 'Lamb Dish',      choose: 1, optionIds: COMBO_LAMB_LIMITED_IDS },
      { id: 'veg',  label: 'Vegetable Dish', choose: 1, optionIds: COMBO_VEG_IDS },
    ],
  },
  {
    id: 'combo-platter-7',
    includes: ['rice', '1 naan'],
    fixedItemIds: ['seekh-kabab-chicken'],
    slots: [
      { id: 'veg', label: 'Vegetable Dish', choose: 1, optionIds: COMBO_VEG_IDS },
    ],
  },
  {
    id: 'combo-platter-8',
    includes: ['rice', '1 naan'],
    fixedItemIds: ['chicken-tikka', 'seekh-kabab-chicken'],
    slots: [
      { id: 'veg', label: 'Vegetable Dish', choose: 1, optionIds: COMBO_VEG_IDS },
    ],
  },
  {
    id: 'combo-platter-9',
    includes: ['rice', '1 naan'],
    fixedItemIds: ['goat-curry-entree'],
    slots: [
      { id: 'veg', label: 'Vegetable Dish', choose: 1, optionIds: COMBO_VEG_IDS },
    ],
  },
  {
    id: 'combo-platter-10',
    includes: ['rice', '1 naan'],
    fixedItemIds: ['fish-curry'],
    slots: [
      { id: 'veg', label: 'Vegetable Dish', choose: 1, optionIds: COMBO_VEG_IDS },
    ],
  },

  // Healthy Combos
  {
    id: 'combo-platter-11',
    includes: ['rice', 'whole wheat roti'],
    fixedItemIds: [],
    slots: [
      { id: 'veg', label: 'Vegetable Dishes', choose: 3, optionIds: COMBO_VEG_IDS },
    ],
  },
  {
    id: 'combo-platter-12',
    includes: ['rice', 'whole wheat roti'],
    fixedItemIds: [],
    slots: [
      { id: 'meat', label: 'Meat Dish',        choose: 1, optionIds: COMBO_MEAT_IDS },
      { id: 'veg',  label: 'Vegetable Dishes', choose: 2, optionIds: COMBO_VEG_IDS },
    ],
  },
  {
    id: 'combo-platter-13',
    includes: ['rice', 'whole wheat roti'],
    fixedItemIds: [],
    slots: [
      { id: 'meat', label: 'Meat Dishes',    choose: 2, optionIds: COMBO_MEAT_IDS },
      { id: 'veg',  label: 'Vegetable Dish', choose: 1, optionIds: COMBO_VEG_IDS },
    ],
  },
  {
    id: 'combo-platter-14',
    includes: ['rice', 'whole wheat roti'],
    fixedItemIds: ['tandoori-chicken', 'chicken-tikka', 'seekh-kabab-chicken'],
    slots: [],
  },
  {
    id: 'combo-platter-15',
    includes: ['rice', 'whole wheat roti'],
    fixedItemIds: ['chicken-tikka', 'seekh-kabab-chicken'],
    slots: [
      { id: 'veg', label: 'Vegetable Dish', choose: 1, optionIds: COMBO_VEG_IDS },
    ],
  },
];

export const BUNDLE_MAP = new Map<string, BundleDefinition>(
  BUNDLE_DEFINITIONS.map((b) => [b.id, b]),
);

// Smart defaults: pre-fill every slot with its first `choose` options so the
// bundle is valid the moment it opens — enabling the 2-click add path
// (Configure → Add to Order). Returns slotId -> optionId[].
export function buildDefaultSelections(
  definition: BundleDefinition,
): Record<string, string[]> {
  const selections: Record<string, string[]> = {};
  for (const slot of definition.slots) {
    selections[slot.id] = slot.optionIds.slice(0, slot.choose);
  }
  return selections;
}
