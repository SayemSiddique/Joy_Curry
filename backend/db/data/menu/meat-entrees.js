// ============================================================================
// frontend/js/data/menu/meat-entrees.js
// Meat Entrées Category Data Sheet — Choice of Lamb / Beef / Goat
// Uses the Shared Modifier Pattern to merge base data with unique entries.
// Source of truth: Roadmap §6 — served with basmati rice.
// Lamb Curry 16.50 † · Lamb Vindaloo (Hot) 16.50 · Lamb Korma (Mild) 16.50 ·
// Lamb Karahi (Medium) 16.50 · Lamb Saag (Medium) 16.50 · Lamb Bhuna 17.50 ·
// Goat Curry 15.50 · Goat Bhuna 15.50 · Goat Karahi 15.50 · Beef Curry 15.50.
//
// † MULTI-CONTEXT: several dishes reappear in sides.js (-side suffix) and
// express-lunch.js (-lunch suffix) with different prices and serving context.
// Each context gets its own unique id — do not share objects across contexts.
//
// proteinChoice: ["Lamb", "Beef", "Goat"] — the customer selects at order
// time. The first five lamb dishes + Lamb Bhuna are labeled "Lamb" in the
// name; goat and beef dishes have their protein fixed in the name. However,
// the Roadmap §6 header says "CHOICE OF LAMB / BEEF / GOAT" — this applies
// to the CURRY-style dishes (the first 5 lamb entries). Goat Bhuna, Goat
// Karahi, and Beef Curry are specific-protein items (no choice). This is
// reflected in proteinChoice per dish.
//
// All non-veg, GF (grain-free curries). No dairy allergen in standard meat
// curry preparations. Cashew-free (unlike chicken entrees).
// ============================================================================

const BASE_MEAT_ENTREE = {
  category:       'meat-entree',
  subcategory:    null,
  isVegan:        false,
  isVegetarian:   false,
  isGlutenFree:   true,
  allergens:      [],
  allergenNote:   null,
  servedWith:     'rice',
  sizeOptions:    null,
  modifiers:      null,
  pieceCount:     null,
  tags:           [],
  inStock:        true,
  isActive:       true,
};

export const meatEntrees = [
  // ---- CURRY-STYLE LAMB (protein choice: lamb, beef, or goat) ----
  {
    id:             'lamb-curry-entree',
    name:           'Lamb Curry',
    description:    'Meat cooked in a traditional curry sauce.',
    basePrice:      16.50,
    proteinChoice:  ['Lamb', 'Beef', 'Goat'],
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/lamb-curry-entree.jpg',
    searchKeywords: ['mutton curry', 'meat curry', 'goat curry', 'beef curry', 'traditional curry', 'house curry', 'classic', 'hearty', 'non-veg', 'popular'],
  },
  {
    id:             'lamb-vindaloo-entree',
    name:           'Lamb Vindaloo',
    description:    'Meat in a spicy, tangy sauce with potatoes.',
    basePrice:      16.50,
    proteinChoice:  ['Lamb', 'Beef', 'Goat'],
    spiceLevel:     'Hot',
    imageUrl:       '/images/dishes/lamb-vindaloo-entree.jpg',
    searchKeywords: ['mutton vindaloo', 'spicy meat curry', 'hot curry', 'tangy', 'vinegar', 'potato', 'goan', 'fiery', 'non-veg'],
  },
  {
    id:             'lamb-korma-entree',
    name:           'Lamb Korma',
    description:    'Meat in a light creamy sauce.',
    basePrice:      16.50,
    proteinChoice:  ['Lamb', 'Beef', 'Goat'],
    spiceLevel:     'Mild',
    allergens:      ['dairy'],
    imageUrl:       '/images/dishes/lamb-korma-entree.jpg',
    searchKeywords: ['mutton korma', 'meat korma', 'cream sauce', 'mild meat', 'nutty gravy', 'mughlai', 'non-veg'],
  },
  {
    id:             'lamb-karahi-entree',
    name:           'Lamb Karahi',
    description:    'Meat cooked with tomatoes and fresh ginger.',
    basePrice:      16.50,
    proteinChoice:  ['Lamb', 'Beef', 'Goat'],
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/lamb-karahi-entree.jpg',
    searchKeywords: ['mutton karahi', 'meat karahi', 'kadai meat', 'ginger tomato', 'wok cooked', 'robust', 'non-veg'],
  },
  {
    id:             'lamb-saag-entree',
    name:           'Lamb Saag',
    description:    'Meat cooked in spinach with aromatic spices.',
    basePrice:      16.50,
    proteinChoice:  ['Lamb', 'Beef', 'Goat'],
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/lamb-saag-entree.jpg',
    searchKeywords: ['mutton saag', 'meat saag', 'spinach meat', 'palak meat', 'greens', 'earthy', 'healthy', 'non-veg'],
  },

  // ---- SPECIFIC-PROtein LAMB ----
  {
    id:             'lamb-bhuna-entree',
    name:           'Lamb Bhuna',
    description:    'Lamb cooked in a rich, thick gravy sauce with black pepper.',
    basePrice:      17.50,
    proteinChoice:  null,             // lamb only — no choice
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/lamb-bhuna-entree.jpg',
    searchKeywords: ['mutton bhuna', 'thick gravy', 'black pepper meat', 'rich sauce', 'concentrated', 'non-veg'],
  },

  // ---- GOAT ----
  {
    id:             'goat-curry-entree',
    name:           'Goat Curry',
    description:    'Goat cooked in a traditional curry sauce.',
    basePrice:      15.50,
    proteinChoice:  null,             // goat only
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/goat-curry-entree.jpg',
    searchKeywords: ['mutton curry', 'goat meat curry', 'traditional goat', 'classic', 'hearty', 'non-veg', 'popular'],
  },
  {
    id:             'goat-bhuna-entree',
    name:           'Goat Bhuna',
    description:    'Goat cooked in a rich, thick gravy sauce with black pepper.',
    basePrice:      15.50,
    proteinChoice:  null,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/goat-bhuna-entree.jpg',
    searchKeywords: ['mutton bhuna', 'goat bhuna', 'thick gravy', 'rich sauce', 'non-veg'],
  },
  {
    id:             'goat-karahi-entree',
    name:           'Goat Karahi',
    description:    'Goat cooked with onions, tomatoes, green peppers and fresh ginger.',
    basePrice:      15.50,
    proteinChoice:  null,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/goat-karahi-entree.jpg',
    searchKeywords: ['mutton karahi', 'goat karahi', 'ginger tomato', 'wok cooked', 'peppery', 'non-veg'],
  },

  // ---- BEEF ----
  {
    id:             'beef-curry-entree',
    name:           'Beef Curry',
    description:    'Boneless beef cooked in a traditional curry sauce.',
    basePrice:      15.50,
    proteinChoice:  null,             // beef only
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/beef-curry-entree.jpg',
    searchKeywords: ['beef curry', 'boneless beef', 'traditional beef', 'classic', 'hearty', 'non-veg'],
  },
].map((dish) => ({ ...BASE_MEAT_ENTREE, ...dish }));
