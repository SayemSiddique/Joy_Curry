// ============================================================================
// frontend/js/data/menu/vegetable-entrees.js
// Vegetable Entrées Category Data Sheet
// Uses the Shared Modifier Pattern to merge base data with unique entries.
// Source of truth: Roadmap §6 — served with rice.
// Malai Kofta 11.95 · Navrattan Korma 11.95 · Paneer Makhni 13.95 ·
// Mattar Paneer 12.50 · Palak Paneer 12.50 · Daal Makhni 11.95.
//
// All vegetarian; none vegan (paneer = dairy, cream-based gravies).
// Several contain nuts (cashew/almond) in their creamy sauces — allergen SME
// call flagged per dish. isGlutenFree: true for all (grain-free curries).
// ============================================================================

const BASE_VEG_ENTREE = {
  category:       'vegetable-entree',
  subcategory:    null,
  isVegan:        false,
  isVegetarian:   true,
  isGlutenFree:   true,
  allergens:      ['dairy'],
  allergenNote:   null,
  servedWith:     'rice',
  proteinChoice:  null,
  sizeOptions:    null,
  modifiers:      null,
  pieceCount:     null,
  tags:           [],
  inStock:        true,
  isActive:       true,
};

export const vegetableEntrees = [
  {
    id:             'malai-kofta',
    name:           'Malai Kofta',
    description:    'Fresh-ground vegetable and cottage-cheese dumplings in a creamy sauce.',
    basePrice:      11.95,
    allergens:      ['dairy', 'cashew'],
    spiceLevel:     'Mild',
    imageUrl:       '/images/dishes/malai-kofta.jpg',
    searchKeywords: ['kofta', 'malai kofta', 'veg ball curry', 'paneer kofta', 'cream sauce', 'dumpling curry', 'cashew cream', 'mild', 'vegetarian', 'popular'],
  },
  {
    id:             'navrattan-korma',
    name:           'Navrattan Korma',
    description:    'Mixed vegetables in a mild, nutty cream gravy.',
    basePrice:      11.95,
    allergens:      ['dairy', 'cashew'],
    spiceLevel:     'Mild',
    imageUrl:       '/images/dishes/navrattan-korma.jpg',
    searchKeywords: ['navratna korma', 'nine gem curry', 'navratan', 'mixed veg korma', 'nutty gravy', 'mughlai', 'mild', 'sweet cream', 'vegetarian'],
  },
  {
    id:             'paneer-makhni',
    name:           'Paneer Makhni',
    description:    'Cottage cheese cubes in a creamy tomato-based curry.',
    basePrice:      13.95,
    allergens:      ['dairy'],
    spiceLevel:     'Mild',
    tags:           ['popular'],
    imageUrl:       '/images/dishes/paneer-makhni.jpg',
    searchKeywords: ['paneer butter', 'paneer makhani', 'paneer tikka masala', 'creamy paneer', 'tomato paneer', 'rich gravy', 'mild', 'vegetarian', 'popular'],
  },
  {
    id:             'mattar-paneer',
    name:           'Mattar Paneer',
    description:    'Cottage cheese and green peas simmered in spiced gravy.',
    basePrice:      12.50,
    allergens:      ['dairy'],
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/mattar-paneer.jpg',
    searchKeywords: ['matar paneer', 'peas paneer', 'paneer matar', 'peas and cheese', 'green peas curry', 'vegetarian'],
  },
  {
    id:             'palak-paneer',
    name:           'Palak Paneer',
    description:    'Homestyle cottage cheese and spinach cooked in aromatic spices.',
    basePrice:      12.50,
    allergens:      ['dairy'],
    spiceLevel:     'Medium',
    tags:           ['popular'],
    imageUrl:       '/images/dishes/palak-paneer.jpg',
    searchKeywords: ['saag paneer', 'spinach cheese', 'paneer saag', 'palak', 'spinach curry', 'greens', 'healthy', 'vegetarian', 'popular'],
  },
  {
    id:             'daal-makhni',
    name:           'Daal Makhni',
    description:    'Black lentils slow-cooked in a garlic butter cream sauce.',
    basePrice:      11.95,
    allergens:      ['dairy'],
    spiceLevel:     'Mild',
    imageUrl:       '/images/dishes/daal-makhni.jpg',
    searchKeywords: ['dal makhani', 'maa ki daal', 'black lentil', 'butter dal', 'creamy lentil', 'makhni dal', 'garlic butter', 'comfort food', 'vegetarian'],
  },
].map((dish) => ({ ...BASE_VEG_ENTREE, ...dish }));
