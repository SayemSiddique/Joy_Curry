// ============================================================================
// frontend/js/data/menu/sides.js
// Side Dishes Category Data Sheet (NO RICE OR BREAD)
// Uses the Shared Modifier Pattern to merge base data with unique entries.
// Source of truth: Roadmap §6 — side dishes, no rice or bread included.
//
// Lamb Curry 7.50 † · Lamb Vindaloo 7.50 · Lamb Saag 7.50 ·
// Chicken Curry 6.50 · Chicken Vindaloo 6.50 · Chicken Saag 6.50 ·
// Chicken Karahi 6.50 · Chicken Tikka Masala 6.50 ·
// Mixed Veg 5.50 · Palak Paneer 5.50 · Aloo Gobi 5.50 · Bhindi Masala 5.50 ·
// Baigan Bharta 5.50 · Chana Saag 5.50 · Daal Makhni 5.50 · Tarka Daal 4.50.
//
// † MULTI-CONTEXT: every dish here reappears in its home category file
// (meat-entrees.js, chicken-entrees.js, vegan-entrees.js, vegetable-entrees.js)
// with an -entree suffix and higher price. Side versions carry the -side
// suffix and lower price; servedWith is null (no rice/bread). Each context is
// a separate object with its own unique id. The ids here MUST match the
// restricted entrée lists used by Joy Combos in Phase 7.
//
// Dietary flags mirror the home-category dishes. Cashew allergen on chicken
// sides (per the §6 note: "CASHEW NUTS USED IN CHICKEN SAUCE").
// ============================================================================

const BASE_SIDE = {
  category:       'side',
  subcategory:    null,
  isVegan:        false,            // overridden per dish
  isVegetarian:   true,             // overridden for meat items
  isGlutenFree:   true,
  allergens:      [],              // overridden per dish
  allergenNote:   null,
  servedWith:     null,             // CRITICAL: sides come with NO rice or bread
  proteinChoice:  null,
  sizeOptions:    null,
  modifiers:      null,
  pieceCount:     null,
  tags:           [],
  inStock:        true,
  isActive:       true,
};

export const sides = [
  // ---- LAMB SIDES (meat) ----
  {
    id:             'lamb-curry-side',
    name:           'Lamb Curry',
    description:    'Side portion of lamb curry — no rice or bread.',
    basePrice:      7.50,
    isVegetarian:   false,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/lamb-curry-side.jpg',
    searchKeywords: ['side lamb curry', 'small lamb', 'lamb only', 'no rice', 'side dish', 'non-veg'],
  },
  {
    id:             'lamb-vindaloo-side',
    name:           'Lamb Vindaloo',
    description:    'Side portion of spicy, tangy lamb curry — no rice or bread.',
    basePrice:      7.50,
    isVegetarian:   false,
    spiceLevel:     'Hot',
    imageUrl:       '/images/dishes/lamb-vindaloo-side.jpg',
    searchKeywords: ['side lamb vindaloo', 'spicy lamb side', 'hot lamb', 'side dish', 'non-veg'],
  },
  {
    id:             'lamb-saag-side',
    name:           'Lamb Saag',
    description:    'Side portion of lamb and spinach — no rice or bread.',
    basePrice:      7.50,
    isVegetarian:   false,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/lamb-saag-side.jpg',
    searchKeywords: ['side lamb saag', 'lamb spinach side', 'side dish', 'non-veg'],
  },

  // ---- CHICKEN SIDES (meat — cashew in sauce) ----
  {
    id:             'chicken-curry-side',
    name:           'Chicken Curry',
    description:    'Side portion of chicken curry — no rice or bread.',
    basePrice:      6.50,
    isVegetarian:   false,
    allergens:      ['cashew'],
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/chicken-curry-side.jpg',
    searchKeywords: ['side chicken curry', 'small chicken', 'chicken only', 'no rice', 'side dish', 'non-veg'],
  },
  {
    id:             'chicken-vindaloo-side',
    name:           'Chicken Vindaloo',
    description:    'Side portion of spicy chicken curry — no rice or bread.',
    basePrice:      6.50,
    isVegetarian:   false,
    allergens:      ['cashew'],
    spiceLevel:     'Hot',
    imageUrl:       '/images/dishes/chicken-vindaloo-side.jpg',
    searchKeywords: ['side chicken vindaloo', 'spicy chicken side', 'hot chicken', 'side dish', 'non-veg'],
  },
  {
    id:             'chicken-saag-side',
    name:           'Chicken Saag',
    description:    'Side portion of chicken and spinach — no rice or bread.',
    basePrice:      6.50,
    isVegetarian:   false,
    allergens:      ['cashew'],
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/chicken-saag-side.jpg',
    searchKeywords: ['side chicken saag', 'chicken spinach side', 'side dish', 'non-veg'],
  },
  {
    id:             'chicken-karahi-side',
    name:           'Chicken Karahi',
    description:    'Side portion of chicken karahi — no rice or bread.',
    basePrice:      6.50,
    isVegetarian:   false,
    allergens:      ['cashew'],
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/chicken-karahi-side.jpg',
    searchKeywords: ['side chicken karahi', 'kadai chicken side', 'side dish', 'non-veg'],
  },
  {
    id:             'chicken-tikka-masala-side',
    name:           'Chicken Tikka Masala',
    description:    'Side portion of broiled chicken in rich curry — no rice or bread.',
    basePrice:      6.50,
    isVegetarian:   false,
    allergens:      ['cashew', 'dairy'],
    spiceLevel:     'Mild',
    imageUrl:       '/images/dishes/chicken-tikka-masala-side.jpg',
    searchKeywords: ['side chicken tikka masala', 'ctm side', 'small ctm', 'side dish', 'non-veg'],
  },

  // ---- VEGETABLE SIDES (veg/vegan) ----
  {
    id:             'mixed-vegetable-side',
    name:           'Mixed Vegetable',
    description:    'Side portion of mixed vegetables — no rice or bread.',
    basePrice:      5.50,
    isVegan:        true,
    spiceLevel:     'Mild',
    imageUrl:       '/images/dishes/mixed-vegetable-side.jpg',
    searchKeywords: ['side mixed veg', 'small mixed vegetable', 'veg side', 'side dish', 'vegan'],
  },
  {
    id:             'palak-paneer-side',
    name:           'Palak Paneer',
    description:    'Side portion of spinach and cheese — no rice or bread.',
    basePrice:      5.50,
    allergens:      ['dairy'],
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/palak-paneer-side.jpg',
    searchKeywords: ['side palak paneer', 'small saag paneer', 'spinach cheese side', 'side dish', 'vegetarian'],
  },
  {
    id:             'aloo-gobi-side',
    name:           'Aloo Gobi',
    description:    'Side portion of cauliflower and potatoes — no rice or bread.',
    basePrice:      5.50,
    isVegan:        true,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/aloo-gobi-side.jpg',
    searchKeywords: ['side aloo gobi', 'small cauliflower potato', 'veg side', 'side dish', 'vegan'],
  },
  {
    id:             'bhindi-masala-side',
    name:           'Bhindi Masala',
    description:    'Side portion of okra — no rice or bread.',
    basePrice:      5.50,
    isVegan:        true,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/bhindi-masala-side.jpg',
    searchKeywords: ['side bhindi', 'small okra', 'okra side', 'side dish', 'vegan'],
  },
  {
    id:             'baingan-bharta-side',
    name:           'Baingan Bharta',
    description:    'Side portion of mashed roasted eggplant — no rice or bread.',
    basePrice:      5.50,
    isVegan:        true,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/baingan-bharta-side.jpg',
    searchKeywords: ['side baingan', 'small eggplant', 'eggplant side', 'side dish', 'vegan'],
  },
  {
    id:             'chana-saag-side',
    name:           'Chana Saag',
    description:    'Side portion of chickpeas and spinach — no rice or bread.',
    basePrice:      5.50,
    isVegan:        true,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/chana-saag-side.jpg',
    searchKeywords: ['side chana saag', 'small chickpea spinach', 'veg side', 'side dish', 'vegan'],
  },
  {
    id:             'daal-makhni-side',
    name:           'Daal Makhni',
    description:    'Side portion of creamy lentil curry — no rice or bread.',
    basePrice:      5.50,
    allergens:      ['dairy'],
    spiceLevel:     'Mild',
    imageUrl:       '/images/dishes/daal-makhni-side.jpg',
    searchKeywords: ['side daal makhni', 'small creamy lentil', 'dal makhani side', 'side dish', 'vegetarian'],
  },
  {
    id:             'tarka-daal-side',
    name:           'Tarka Daal',
    description:    'Side portion of daal cooked with garlic and spices — no rice or bread.',
    basePrice:      4.50,
    isVegan:        true,
    spiceLevel:     'Mild',
    imageUrl:       '/images/dishes/tarka-daal-side.jpg',
    searchKeywords: ['side tarka daal', 'small garlic dal', 'yellow lentil side', 'side dish', 'vegan', 'budget'],
  },
].map((dish) => ({ ...BASE_SIDE, ...dish }));
