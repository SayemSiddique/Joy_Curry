// ============================================================================
// frontend/js/data/menu/appetizers.js
// Appetizers Category Data Sheet
// Uses the Shared Modifier Pattern to merge base data with unique entries.
// Source of truth: Roadmap §6.
//
// VEGGIE (subcategory: 'veggie'):
//   Papadum (Vegan) 3 · Veg. Samosa (Vegan, 2 pcs) 4 · Aloo Tikki (Vegan) 4 ·
//   Tandoori Vegetables 9.50 · Paneer Tikka 12 ·
//   Aloo Papri Chaat (cold) 6.50 · Samosa Chaat (2 pcs) 8.50
//
// MEAT (subcategory: 'meat'):
//   Meat Samosa 5 · Shami Kabab (2 pcs) 5 · Assorted Tandoori 11.50 ·
//   Reshmi Kabab 12
//
// Dietary flags and allergens vary per dish. BASE_APPETIZER provides structural
// defaults; per-dish overrides handle the veg/vegan/meat split.
// ============================================================================

const BASE_APPETIZER = {
  category:       'appetizer',
  subcategory:    null,             // overridden per dish: 'veggie' or 'meat'
  isVegan:        false,            // overridden per dish
  isVegetarian:   true,             // overridden for meat items
  isGlutenFree:   false,            // papadum, samosa wrappers contain flour
  allergens:      ['gluten'],       // overridden per dish where absent or additional
  allergenNote:   null,
  servedWith:     null,
  proteinChoice:  null,
  sizeOptions:    null,
  modifiers:      null,
  pieceCount:     null,
  spiceLevel:     null,
  tags:           [],
  inStock:        true,
  isActive:       true,
};

export const appetizers = [
  // ---- VEGGIE APPETIZERS ----
  {
    id:             'papadum',
    name:           'Papadum',
    description:    'Thin crispy wafers with a light savory crunch.',
    basePrice:      3.00,
    subcategory:    'veggie',
    isVegan:        true,
    isGlutenFree:   true,            // lentil/rice flour — no wheat
    allergens:      [],
    pieceCount:     null,
    imageUrl:       '/images/dishes/papadum.jpg',
    searchKeywords: ['papad', 'pappadam', 'roasted papad', 'crispy wafers', 'crunchy thin', 'starter', 'vegan'],
  },
  {
    id:             'veg-samosa',
    name:           'Veg. Samosa',
    description:    'Two crispy turnovers stuffed with spiced potatoes and green peas.',
    basePrice:      4.00,
    subcategory:    'veggie',
    isVegan:        true,
    pieceCount:     2,
    imageUrl:       '/images/dishes/veg-samosa.jpg',
    tags:           ['popular'],
    searchKeywords: ['samosa', 'aloo samosa', 'potato samosa', 'vegetable samosa', 'deep fried pastry', 'triangle pastry', 'indian snack', 'starter', 'vegan'],
  },
  {
    id:             'aloo-tikki',
    name:           'Aloo Tikki',
    description:    'Spiced mashed-potato patties, pan-crisped.',
    basePrice:      4.00,
    subcategory:    'veggie',
    isVegan:        true,
    isGlutenFree:   true,
    allergens:      [],
    imageUrl:       '/images/dishes/aloo-tikki.jpg',
    searchKeywords: ['aloo tikki', 'potato cutlet', 'potato patty', 'tikki', 'crispy potato', 'indian snack', 'starter', 'vegan'],
  },
  {
    id:             'tandoori-vegetables',
    name:           'Tandoori Vegetables',
    description:    'Seasonal vegetables char-grilled in the clay oven.',
    basePrice:      9.50,
    subcategory:    'veggie',
    isVegan:        true,
    isGlutenFree:   true,
    allergens:      [],
    imageUrl:       '/images/dishes/tandoori-vegetables.jpg',
    searchKeywords: ['grilled vegetables', 'tandoori veggies', 'clay oven vegetables', 'charred vegetables', 'bbq vegetables', 'starter', 'vegan'],
  },
  {
    id:             'paneer-tikka',
    name:           'Paneer Tikka',
    description:    'Cottage-cheese cubes marinated in a mustard-spice paste and grilled.',
    basePrice:      12.00,
    subcategory:    'veggie',
    allergens:      ['dairy'],
    imageUrl:       '/images/dishes/paneer-tikka.jpg',
    searchKeywords: ['paneer tikka', 'cheese tikka', 'grilled paneer', 'tandoori paneer', 'paneer skewers', 'starter', 'vegetarian', 'popular'],
  },
  {
    id:             'aloo-papri-chaat',
    name:           'Aloo Papri Chaat',
    description:    'A tangy, cold mix of chickpeas, potato, crispy wafers and tamarind sauce in fresh yogurt.',
    basePrice:      6.50,
    subcategory:    'veggie',
    allergens:      ['gluten', 'dairy'],
    imageUrl:       '/images/dishes/aloo-papri-chaat.jpg',
    searchKeywords: ['papri chaat', 'aloo chaat', 'chaat', 'cold appetizer', 'yogurt snack', 'tamarind', 'chickpea', 'crispy', 'street food', 'starter'],
  },
  {
    id:             'samosa-chaat',
    name:           'Samosa Chaat',
    description:    'Two crushed samosas tossed with chickpeas, tamarind sauce and fresh herbs.',
    basePrice:      8.50,
    subcategory:    'veggie',
    isVegan:        true,
    pieceCount:     2,
    imageUrl:       '/images/dishes/samosa-chaat.jpg',
    searchKeywords: ['chaat samosa', 'crushed samosa', 'samosa with chutney', 'chickpea samosa', 'street food', 'tamarind', 'cold appetizer', 'starter', 'vegan'],
  },

  {
    id:             'pakora',
    name:           'Pakora',
    description:    'Crispy chickpea-battered vegetable fritters.',
    basePrice:      5.00,
    subcategory:    'veggie',
    isVegan:        true,
    isGlutenFree:   true,             // chickpea (besan) batter — no wheat
    allergens:      [],
    imageUrl:       '/images/dishes/pakora.jpg',
    searchKeywords: ['pakora', 'bhajia', 'bhaji', 'fritters', 'chickpea batter', 'besan', 'vegetable fritters', 'starter', 'vegan'],
  },

  // ---- MEAT APPETIZERS ----
  {
    id:             'meat-samosa',
    name:           'Meat Samosa',
    description:    'Crispy pastry filled with spiced ground chicken and green peas.',
    basePrice:      5.00,
    subcategory:    'meat',
    isVegetarian:   false,
    allergens:      ['gluten'],
    imageUrl:       '/images/dishes/meat-samosa.jpg',
    searchKeywords: ['chicken samosa', 'keema samosa', 'meat pastry', 'non-veg samosa', 'deep fried', 'indian snack', 'starter'],
  },
  {
    id:             'shami-kabab',
    name:           'Shami Kabab',
    description:    'Two spiced patties of minced beef and lentils.',
    basePrice:      5.00,
    subcategory:    'meat',
    isVegetarian:   false,
    allergens:      ['gluten'],
    pieceCount:     2,
    imageUrl:       '/images/dishes/shami-kabab.jpg',
    searchKeywords: ['shami kebab', 'beef patties', 'lentil beef patties', 'shami', 'fried patties', 'starter'],
  },
  {
    id:             'assorted-tandoori',
    name:           'Assorted Tandoori',
    description:    'Mixed tandoori platter of chicken tikka and kabab.',
    basePrice:      11.50,
    subcategory:    'meat',
    isVegetarian:   false,
    allergens:      ['gluten'],
    imageUrl:       '/images/dishes/assorted-tandoori.jpg',
    searchKeywords: ['tandoori platter', 'mixed grill starter', 'chicken tikka kabab', 'assorted kabab', 'starter combo', 'starter'],
  },
  {
    id:             'reshmi-kabab',
    name:           'Reshmi Kabab',
    description:    'Chicken breast marinated with sour cream, garlic and ginger, grilled.',
    basePrice:      12.00,
    subcategory:    'meat',
    isVegetarian:   false,
    allergens:      ['gluten', 'dairy'],
    imageUrl:       '/images/dishes/reshmi-kabab.jpg',
    searchKeywords: ['reshmi kebab', 'creamy chicken kabab', 'sour cream kabab', 'soft chicken kabab', 'malai kabab', 'starter'],
  },
].map((dish) => ({ ...BASE_APPETIZER, ...dish }));
