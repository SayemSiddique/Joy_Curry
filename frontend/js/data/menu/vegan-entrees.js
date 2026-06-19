// ============================================================================
// frontend/js/data/menu/vegan-entrees.js
// Vegan Entrées Category Data Sheet
// Uses the Shared Modifier Pattern to merge base data with unique entries.
// Source of truth: Roadmap §6.
// Aloo Gobi Mattar 12.50 · Chana Masala 11.95 · Bhindi Masala 12.50 ·
// Chana Saag 12.50 · Baingan Bharta 12.50 · Tarka Daal 10.95 ·
// Mixed Vegetables 12.50 · Mushroom Masala 12.50.
//
// All vegan — no dairy, no paneer, no ghee. No allergens by default.
// isGlutenFree: true across the board (vegetable/legume-based, no wheat).
// servedWith: null (§6 does not note "served with rice" for this section,
// unlike the vegetable-entrees section; customers order rice separately or
// as part of a combo).
// ============================================================================

const BASE_VEGAN_ENTREE = {
  category:       'vegan-entree',
  subcategory:    null,
  isVegan:        true,
  isVegetarian:   true,
  isGlutenFree:   true,
  allergens:      [],
  allergenNote:   null,
  servedWith:     null,
  proteinChoice:  null,
  sizeOptions:    null,
  modifiers:      null,
  pieceCount:     null,
  tags:           [],
  inStock:        true,
  isActive:       true,
};

export const veganEntrees = [
  {
    id:             'aloo-gobi-mattar',
    name:           'Aloo Gobi Mattar',
    description:    'Cauliflower, potatoes and green peas in an onion-tomato curry.',
    basePrice:      12.50,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/aloo-gobi-mattar.jpg',
    searchKeywords: ['aloo gobi', 'cauliflower potato', 'potato cauliflower peas', 'gobi matar', 'aloo gobi matar', 'comfort food', 'home style', 'vegan', 'vegetarian'],
  },
  {
    id:             'chana-masala',
    name:           'Chana Masala',
    description:    'Chickpeas cooked with tomatoes, onion, garlic and coriander.',
    basePrice:      11.95,
    spiceLevel:     'Medium',
    tags:           ['popular'],
    imageUrl:       '/images/dishes/chana-masala.jpg',
    searchKeywords: ['chole masala', 'chana curry', 'chickpea curry', 'garbanzo beans', 'punjabi chole', 'popular', 'hearty', 'vegan', 'vegetarian'],
  },
  {
    id:             'bhindi-masala',
    name:           'Bhindi Masala',
    description:    'Sautéed okra with onion and tomatoes.',
    basePrice:      12.50,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/bhindi-masala.jpg',
    searchKeywords: ['okra masala', 'bhindi fry', 'okra curry', 'ladyfinger', 'bhinidi', 'stir fry okra', 'vegan', 'vegetarian'],
  },
  {
    id:             'chana-saag',
    name:           'Chana Saag',
    description:    'Chickpeas and spinach in a tasty curry.',
    basePrice:      12.50,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/chana-saag.jpg',
    searchKeywords: ['chickpea spinach', 'spinach chana', 'saag chana', 'greens and chickpeas', 'iron rich', 'healthy', 'vegan', 'vegetarian'],
  },
  {
    id:             'baingan-bharta',
    name:           'Baingan Bharta',
    description:    'Smoky mashed roasted eggplant cooked with green peas.',
    basePrice:      12.50,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/baingan-bharta.jpg',
    searchKeywords: ['baingan bharta', 'eggplant mash', 'smoky eggplant', 'baigan', 'brinjal', 'roasted eggplant', 'mashed baingan', 'smoky', 'vegan', 'vegetarian'],
  },
  {
    id:             'tarka-daal',
    name:           'Tarka Daal',
    description:    'Yellow lentils tempered with garlic, onions and tomatoes.',
    basePrice:      10.95,
    spiceLevel:     'Mild',
    imageUrl:       '/images/dishes/tarka-daal.jpg',
    searchKeywords: ['tarka dal', 'yellow dal', 'dhuli moong dal', 'tempered lentils', 'garlic dal', 'simple dal', 'comfort food', 'light', 'vegan', 'vegetarian'],
  },
  {
    id:             'mixed-vegetables',
    name:           'Mixed Vegetables',
    description:    'Seasonal mix of carrots, potatoes, green beans and lima beans.',
    basePrice:      12.50,
    spiceLevel:     'Mild',
    imageUrl:       '/images/dishes/mixed-vegetables.jpg',
    searchKeywords: ['mixed veg', 'mix vegetable', 'seasonal vegetables', 'carrot potato beans', 'home style curry', 'simple', 'light', 'vegan', 'vegetarian'],
  },
  {
    id:             'mushroom-masala',
    name:           'Mushroom Masala',
    description:    'Earthy mushrooms in a spiced onion-tomato gravy.',
    basePrice:      12.50,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/mushroom-masala.jpg',
    searchKeywords: ['mushroom curry', 'khumb masala', 'mushroom gravy', 'button mushroom', 'earthy', 'savory', 'vegan', 'vegetarian'],
  },
].map((dish) => ({ ...BASE_VEGAN_ENTREE, ...dish }));
