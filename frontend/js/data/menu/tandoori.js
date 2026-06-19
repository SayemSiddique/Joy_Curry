// ============================================================================
// frontend/js/data/menu/tandoori.js
// Tandoori Dishes Category Data Sheet — Fresh From the Clay Oven
// Uses the Shared Modifier Pattern to merge base data with unique entries.
// Source of truth: Roadmap §6 — served with raita and rice.
// Seekh Kabab Chicken (3 pcs) 14 · Seekh Kabab Lamb (3 pcs) 16 ·
// Tandoori Chicken Half 12 / Full 21 · Chicken Tikka (7 pcs) 15.50 ·
// Chicken Boti Kabab 15.95 · Chicken Shashlik 16.50 · Malai Kabab 16.50 ·
// Tandoori Lamb Chop 21.95 · Tandoori Fish 15.50 · Fish Tikka 20.95 ·
// Tandoori Shrimp 20.95 · Mixed Grill 22.95.
//
// Most complex schema surface: the only file using sizeOptions (Tandoori
// Chicken Half/Full) AND pieceCount (Seekh Kabab 3 pcs, Chicken Tikka 7 pcs).
// Per §4b, Tandoori Chicken is modelled with sizeOptions = [Half, Full] on a
// SINGLE item (the customer picks size at order time), NOT as two items. This
// matches the menu's "Half 12 / Full 21" notation on one line.
//
// All items baked in the tandoor (clay oven). All non-veg. Served with raita
// (dairy) + rice. Allergens: dairy from the yogurt marinade + raita on most;
// shellfish on shrimp items; fish on fish items.
// ============================================================================

const BASE_TANDOORI = {
  category:       'tandoori',
  subcategory:    null,
  isVegan:        false,
  isVegetarian:   false,
  isGlutenFree:   true,
  allergens:      ['dairy'],         // yogurt marinade + raita; overridden where none
  allergenNote:   null,
  servedWith:     'raita',           // §6: served with raita and rice
  proteinChoice:  null,
  sizeOptions:    null,              // overridden for tandoori chicken (Half/Full)
  modifiers:      null,
  pieceCount:     null,              // overridden where piece count is meaningful
  spiceLevel:     'Medium',
  tags:           [],
  inStock:        true,
  isActive:       true,
};

export const tandooriDishes = [
  {
    id:             'seekh-kabab-chicken',
    name:           'Seekh Kabab (Chicken)',
    description:    'Three skewers of minced ground chicken, char-grilled in the clay oven.',
    basePrice:      14.00,
    pieceCount:     3,
    imageUrl:       '/images/dishes/seekh-kabab-chicken.jpg',
    searchKeywords: ['chicken seekh kebab', 'ground chicken skewer', 'minced chicken kabab', 'grilled skewers', 'starter', 'non-veg'],
  },
  {
    id:             'seekh-kabab-lamb',
    name:           'Seekh Kabab (Lamb)',
    description:    'Three skewers of minced ground lamb, char-grilled in the clay oven.',
    basePrice:      16.00,
    pieceCount:     3,
    imageUrl:       '/images/dishes/seekh-kabab-lamb.jpg',
    searchKeywords: ['lamb seekh kebab', 'ground lamb skewer', 'minced lamb kabab', 'mutton seekh', 'grilled skewers', 'starter', 'non-veg'],
  },
  {
    id:             'tandoori-chicken',
    name:           'Tandoori Chicken',
    description:    'Whole chicken marinated in yogurt and spices, roasted in the clay oven.',
    basePrice:      12.00,            // base = Half price; sizeOptions carries Full
    sizeOptions:    [
      { label: 'Half', price: 12.00 },
      { label: 'Full', price: 21.00 },
    ],
    imageUrl:       '/images/dishes/tandoori-chicken.jpg',
    searchKeywords: ['whole tandoori chicken', 'roasted chicken', 'red chicken', 'clay oven chicken', 'yogurt marinated', 'popular', 'non-veg'],
  },
  {
    id:             'chicken-tikka',
    name:           'Chicken Tikka',
    description:    'Seven pieces of boneless chicken marinated in yogurt, baked in the tandoor.',
    basePrice:      15.50,
    pieceCount:     7,
    imageUrl:       '/images/dishes/chicken-tikka.jpg',
    searchKeywords: ['tikka pieces', 'boneless tandoori chicken', 'grilled chicken chunks', 'chicken skewers', 'popular', 'non-veg'],
  },
  {
    id:             'chicken-boti-kabab',
    name:           'Chicken Boti Kabab',
    description:    'Boneless chicken cubes marinated in yogurt and grilled in the clay oven.',
    basePrice:      15.95,
    imageUrl:       '/images/dishes/chicken-boti-kabab.jpg',
    searchKeywords: ['chicken boti', 'chicken cube kabab', 'tandoori chicken bites', 'grilled chicken', 'non-veg'],
  },
  {
    id:             'chicken-shashlik',
    name:           'Chicken Shashlik',
    description:    'Marinated chicken breast broiled in the tandoor with onion, green peppers and tomatoes.',
    basePrice:      16.50,
    imageUrl:       '/images/dishes/chicken-shashlik.jpg',
    searchKeywords: ['shashlik', 'shashlyk', 'chicken skewers veg', 'bell pepper chicken', 'tomato chicken skewer', 'non-veg'],
  },
  {
    id:             'malai-kabab',
    name:           'Malai Kabab',
    description:    'Boneless white-meat chicken marinated with ginger and sour cream, grilled in the tandoor.',
    basePrice:      16.50,
    imageUrl:       '/images/dishes/malai-kabab.jpg',
    searchKeywords: ['malai chicken', 'creamy chicken kabab', 'white meat kabab', 'sour cream chicken', 'mild tandoori', 'non-veg'],
  },
  {
    id:             'tandoori-lamb-chop',
    name:           'Tandoori Lamb Chop',
    description:    'Lamb chops marinated in yogurt and spices, char-grilled in the clay oven.',
    basePrice:      21.95,
    imageUrl:       '/images/dishes/tandoori-lamb-chop.jpg',
    searchKeywords: ['lamb chops', 'grilled lamb chop', 'tandoori chops', 'rack of lamb', 'premium', 'non-veg'],
  },
  {
    id:             'tandoori-fish',
    name:           'Tandoori Fish',
    description:    'Marinated tilapia fillets grilled in the clay oven.',
    basePrice:      15.50,
    allergens:      ['dairy', 'fish'],
    imageUrl:       '/images/dishes/tandoori-fish.jpg',
    searchKeywords: ['grilled fish', 'tandoori tilapia', 'fish skewer', 'marinated fish', 'seafood', 'non-veg'],
  },
  {
    id:             'fish-tikka',
    name:           'Fish Tikka',
    description:    'Cubed salmon marinated and grilled in the clay oven.',
    basePrice:      20.95,
    allergens:      ['dairy', 'fish'],
    imageUrl:       '/images/dishes/fish-tikka.jpg',
    searchKeywords: ['salmon tikka', 'fish cubes', 'salmon skewer', 'grilled salmon', 'premium', 'seafood', 'non-veg'],
  },
  {
    id:             'tandoori-shrimp',
    name:           'Tandoori Shrimp',
    description:    'Jumbo shrimp marinated in yogurt and grilled in the clay oven.',
    basePrice:      20.95,
    allergens:      ['dairy', 'shellfish'],
    imageUrl:       '/images/dishes/tandoori-shrimp.jpg',
    searchKeywords: ['grilled shrimp', 'prawn tikka', 'tandoori prawn', 'jumbo shrimp skewer', 'premium', 'seafood', 'non-veg'],
  },
  {
    id:             'mixed-grill',
    name:           'Mixed Grill',
    description:    'Tandoori platter: tandoori chicken, lamb kabab, chicken tikka, malai kabab and fish tikka.',
    basePrice:      22.95,
    allergens:      ['dairy', 'fish'],
    tags:           ['popular'],
    imageUrl:       '/images/dishes/mixed-grill.jpg',
    searchKeywords: ['mixed tandoori', 'tandoori platter', 'assorted grill', 'combo grill', 'non-veg platter', 'popular', 'non-veg'],
  },
].map((dish) => ({ ...BASE_TANDOORI, ...dish }));
