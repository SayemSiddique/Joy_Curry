// ============================================================================
// frontend/js/data/menu/breads.js
// Indian Breads Category Data Sheet
// Uses the Shared Modifier Pattern to merge base data with unique entries.
// Source of truth: Roadmap §6.
// Tandoori Naan 3 · Roti 3 · Garlic Naan 4.50 · Tandoori Paratha 4.50 ·
// Aloo Paratha 5 · Onion Kulcha 4 · Paneer Kulcha 4 · Rosemary Naan 4 ·
// Chicken Tikka Naan 5.50 · Keema Naan 5.50 · Keema Paratha 6.50.
//
// All breads are baked in the tandoor (clay oven). Dietary varies by bread:
// roti is vegan (whole wheat + water); naan/kulcha/paratha typically use
// yogurt/ghee (dairy); stuffed meat breads are non-veg. Per-dish overrides
// below. isGlutenFree is false across the board (wheat-based).
// ============================================================================

const BASE_BREAD = {
  category:       'bread',
  subcategory:    null,
  isVegan:        false,            // default: most breads use dairy; roti overrides to true
  isVegetarian:   true,             // default; meat breads override to false
  isGlutenFree:   false,            // wheat-based
  allergens:      ['gluten', 'dairy'],  // default; roti drops dairy
  allergenNote:   null,
  servedWith:     null,             // bread is served WITH something, not with
  proteinChoice:  null,
  sizeOptions:    null,
  modifiers:      null,
  pieceCount:     null,
  spiceLevel:     null,
  tags:           [],
  inStock:        true,
  isActive:       true,
};

export const breads = [
  {
    id:             'tandoori-naan',
    name:           'Tandoori Naan',
    description:    'White-flour flatbread blistered in the clay oven.',
    basePrice:      3.00,
    imageUrl:       '/images/dishes/tandoori-naan.jpg',
    searchKeywords: ['naan', 'nan bread', 'tandoori bread', 'white flour flatbread', 'indian bread', 'butter naan', 'hot bread', 'bread'],
  },
  {
    id:             'roti',
    name:           'Roti',
    description:    'Whole-wheat flatbread, unleavened.',
    basePrice:      3.00,
    isVegan:        true,
    allergens:      ['gluten'],
    imageUrl:       '/images/dishes/roti.jpg',
    searchKeywords: ['chapati', 'phulka', 'rotli', 'wheat flatbread', 'whole wheat bread', 'unleavened bread', 'indian bread', 'bread', 'vegan'],
  },
  {
    id:             'garlic-naan',
    name:           'Garlic Naan',
    description:    'Naan topped with minced garlic and coriander.',
    basePrice:      4.50,
    imageUrl:       '/images/dishes/garlic-naan.jpg',
    searchKeywords: ['garlic bread', 'lehsun naan', 'garlic nan', 'coriander naan', 'flavored naan', 'indian bread', 'bread'],
  },
  {
    id:             'tandoori-paratha',
    name:           'Tandoori Paratha',
    description:    'Multilayered whole-wheat flatbread from the tandoor.',
    basePrice:      4.50,
    imageUrl:       '/images/dishes/tandoori-paratha.jpg',
    searchKeywords: ['paratha', 'parantha', 'layered flatbread', 'flaky bread', 'wheat paratha', 'indian bread', 'bread'],
  },
  {
    id:             'aloo-paratha',
    name:           'Aloo Paratha',
    description:    'Whole-wheat flatbread stuffed with spiced mashed potato.',
    basePrice:      5.00,
    imageUrl:       '/images/dishes/aloo-paratha.jpg',
    searchKeywords: ['aloo paratha', 'alu paratha', 'potato paratha', 'stuffed flatbread', 'potato bread', 'indian bread', 'comfort', 'bread'],
  },
  {
    id:             'onion-kulcha',
    name:           'Onion Kulcha',
    description:    'Naan-style flatbread studded with chopped onions.',
    basePrice:      4.00,
    imageUrl:       '/images/dishes/onion-kulcha.jpg',
    searchKeywords: ['pyaaz kulcha', 'onion naan', 'onion stuffed bread', 'kulcha', 'indian bread', 'bread'],
  },
  {
    id:             'paneer-kulcha',
    name:           'Paneer Kulcha',
    description:    'Flatbread stuffed with spiced cottage cheese.',
    basePrice:      4.00,
    imageUrl:       '/images/dishes/paneer-kulcha.jpg',
    searchKeywords: ['cheese naan', 'paneer naan', 'cottage cheese bread', 'paneer stuffed kulcha', 'indian bread', 'bread'],
  },
  {
    id:             'rosemary-naan',
    name:           'Rosemary Naan',
    description:    'Naan infused with fresh rosemary.',
    basePrice:      4.00,
    imageUrl:       '/images/dishes/rosemary-naan.jpg',
    searchKeywords: ['herb naan', 'rosemary flatbread', 'flavored naan', 'aromatic bread', 'indian bread', 'bread'],
  },
  {
    id:             'chicken-tikka-naan',
    name:           'Chicken Tikka Naan',
    description:    'Naan stuffed with tandoori chicken tikka.',
    basePrice:      5.50,
    isVegetarian:   false,
    allergens:      ['gluten', 'dairy'],
    imageUrl:       '/images/dishes/chicken-tikka-naan.jpg',
    searchKeywords: ['chicken naan', 'chicken stuffed bread', 'tikka naan', 'meat naan', 'non-veg bread', 'indian bread', 'bread'],
  },
  {
    id:             'keema-naan',
    name:           'Keema Naan',
    description:    'Naan stuffed with spiced ground chicken.',
    basePrice:      5.50,
    isVegetarian:   false,
    allergens:      ['gluten', 'dairy'],
    imageUrl:       '/images/dishes/keema-naan.jpg',
    searchKeywords: ['minced meat naan', 'kheema naan', 'ground chicken bread', 'meat stuffed bread', 'non-veg bread', 'indian bread', 'bread'],
  },
  {
    id:             'keema-paratha',
    name:           'Keema Paratha',
    description:    'Whole-wheat flatbread stuffed with spiced ground lamb.',
    basePrice:      6.50,
    isVegetarian:   false,
    allergens:      ['gluten', 'dairy'],
    imageUrl:       '/images/dishes/keema-paratha.jpg',
    searchKeywords: ['lamb paratha', 'minced lamb bread', 'kheema paratha', 'meat stuffed flatbread', 'non-veg bread', 'indian bread', 'bread'],
  },
].map((dish) => ({ ...BASE_BREAD, ...dish }));
