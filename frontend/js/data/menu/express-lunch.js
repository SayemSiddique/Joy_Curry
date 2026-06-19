// ============================================================================
// frontend/js/data/menu/express-lunch.js
// Express Lunch Category Data Sheet
// Uses the Shared Modifier Pattern to merge base data with unique entries.
// Source of truth: Roadmap §6.
// Lamb Curry/Rice 14.95 † · Goat/Rice 13.95 · Chicken Curry/Rice 12.95 ·
// Fish (Flounder)/Rice 13.95 · Low-Fat Chicken Tikka/Rice 12.95 ·
// 1 Pc. Tandoori Chicken/Rice 8 · Vegetable/Rice 10.50 · Daal/Rice 8 ·
// Chicken with Naan 11.
//
// † MULTI-CONTEXT: dishes here reappear in meat-entrees.js (-entree suffix),
// fish-shrimp.js, chicken-entrees.js, etc. with different prices and serving
// context. Each context is a separate object with its own unique id.
//
// All express-lunch items are served "over rice" (except Chicken with Naan,
// which comes with naan). Lower prices than their à-la-carte counterparts
// reflect the lunch-portion/quick-service format.
// ============================================================================

const BASE_EXPRESS_LUNCH = {
  category:       'express-lunch',
  subcategory:    null,
  isVegan:        false,            // overridden per dish
  isVegetarian:   true,             // overridden for meat/fish items
  isGlutenFree:   true,
  allergens:      [],
  allergenNote:   null,
  servedWith:     'rice',           // default; chicken-with-naan overrides
  proteinChoice:  null,
  sizeOptions:    null,
  modifiers:      null,
  pieceCount:     null,
  tags:           [],
  inStock:        true,
  isActive:       true,
};

export const expressLunch = [
  // ---- MEAT OVER RICE ----
  {
    id:             'lamb-curry-lunch',
    name:           'Lamb Curry Over Rice',
    description:    'Lamb curry served over basmati rice — express lunch portion.',
    basePrice:      14.95,
    isVegetarian:   false,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/lamb-curry-lunch.jpg',
    searchKeywords: ['lamb over rice', 'lamb rice bowl', 'lunch lamb', 'quick lamb', 'express lamb', 'non-veg'],
  },
  {
    id:             'goat-over-rice-lunch',
    name:           'Goat Over Rice',
    description:    'Goat curry served over basmati rice — express lunch portion.',
    basePrice:      13.95,
    isVegetarian:   false,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/goat-over-rice-lunch.jpg',
    searchKeywords: ['goat rice bowl', 'lunch goat', 'quick goat', 'express goat', 'mutton rice', 'non-veg'],
  },

  // ---- CHICKEN OVER RICE / WITH NAAN ----
  {
    id:             'chicken-curry-lunch',
    name:           'Chicken Curry Over Rice',
    description:    'Chicken curry served over basmati rice — express lunch portion.',
    basePrice:      12.95,
    isVegetarian:   false,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/chicken-curry-lunch.jpg',
    searchKeywords: ['chicken over rice', 'chicken rice bowl', 'lunch chicken', 'quick chicken', 'express chicken', 'non-veg'],
  },
  {
    id:             'fish-flounder-lunch',
    name:           'Fish (Flounder) Over Rice',
    description:    'Flounder curry served over basmati rice — express lunch portion.',
    basePrice:      13.95,
    isVegetarian:   false,
    allergens:      ['fish'],
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/fish-flounder-lunch.jpg',
    searchKeywords: ['fish over rice', 'fish rice bowl', 'flounder rice', 'lunch fish', 'express fish', 'seafood', 'non-veg'],
  },
  {
    id:             'low-fat-chicken-tikka-lunch',
    name:           'Low-Fat Chicken Tikka Over Rice',
    description:    'Grilled chicken tikka served over basmati rice — lean express lunch.',
    basePrice:      12.95,
    isVegetarian:   false,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/low-fat-chicken-tikka-lunch.jpg',
    searchKeywords: ['chicken tikka rice', 'low fat', 'lean lunch', 'grilled chicken rice', 'diet friendly', 'healthy lunch', 'express chicken', 'non-veg'],
  },
  {
    id:             'tandoori-chicken-half-lunch',
    name:           '1 Pc. Tandoori Chicken Over Rice',
    description:    'One piece of tandoori chicken served over basmati rice.',
    basePrice:      8.00,
    isVegetarian:   false,
    pieceCount:     1,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/tandoori-chicken-half-lunch.jpg',
    searchKeywords: ['tandoori chicken rice', 'half chicken rice', 'budget lunch', 'quick lunch', '1 piece', 'express tandoori', 'non-veg'],
  },
  {
    id:             'chicken-with-naan-lunch',
    name:           'Chicken with Naan',
    description:    'Chicken curry served with a fresh tandoori naan.',
    basePrice:      11.00,
    isVegetarian:   false,
    servedWith:     'naan',
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/chicken-with-naan-lunch.jpg',
    searchKeywords: ['chicken naan', 'chicken and bread', 'lunch chicken naan', 'naan meal', 'express chicken naan', 'non-veg'],
  },

  // ---- VEGETARIAN OVER RICE ----
  {
    id:             'vegetable-over-rice-lunch',
    name:           'Vegetable Over Rice',
    description:    'Mixed vegetables served over basmati rice — express lunch portion.',
    basePrice:      10.50,
    isVegan:        true,
    spiceLevel:     'Mild',
    imageUrl:       '/images/dishes/vegetable-over-rice-lunch.jpg',
    searchKeywords: ['veg over rice', 'vegetable rice bowl', 'lunch veg', 'quick veg', 'express veg', 'vegan', 'vegetarian'],
  },
  {
    id:             'daal-over-rice-lunch',
    name:           'Daal Over Rice',
    description:    'Lentil daal served over basmati rice — express lunch portion.',
    basePrice:      8.00,
    isVegan:        true,
    spiceLevel:     'Mild',
    imageUrl:       '/images/dishes/daal-over-rice-lunch.jpg',
    searchKeywords: ['dal over rice', 'daal rice bowl', 'lunch dal', 'quick dal', 'express daal', 'comfort lunch', 'budget', 'vegan'],
  },
].map((dish) => ({ ...BASE_EXPRESS_LUNCH, ...dish }));
