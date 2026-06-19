// ============================================================================
// frontend/js/data/menu/rice-biryani.js
// Rice & Biryani Specials Category Data Sheet
// Uses the Shared Modifier Pattern to merge base data with unique entries.
// Source of truth: Roadmap §6 — served with raita.
// Basmati Pulao (Vegan) 4 · Mattar Pulao (Vegan) 7 ·
// Lamb Biryani 16.50 · Beef Biryani 15.50 · Goat Biryani 15.50 ·
// Chicken Biryani 15.50 · Chicken Tikka Biryani 15.50 ·
// Shrimp Biryani 18.95 · Vegetable Biryani 12.50.
//
// Two vegan pulaos (steamed rice + peas); seven biryanis (mixed rice with
// meat/veggies + herbs + spices). All GF (rice-based). No dairy allergen
// in the rice preparations themselves (raita is separate, listed in
// condiments.js with its own dairy allergen).
// ============================================================================

const BASE_RICE = {
  category:       'rice-biryani',
  subcategory:    null,
  isVegan:        false,            // overridden for vegan pulaos
  isVegetarian:   true,             // overridden for meat biryanis
  isGlutenFree:   true,
  allergens:      [],              // no allergens in the rice itself
  allergenNote:   null,
  servedWith:     'raita',
  proteinChoice:  null,
  sizeOptions:    null,
  modifiers:      null,
  pieceCount:     null,
  spiceLevel:     'Medium',          // biryanis carry medium heat; pulaos override
  tags:           [],
  inStock:        true,
  isActive:       true,
};

export const riceAndBiryani = [
  // ---- PULAOS (steamed rice) ----
  {
    id:             'basmati-pulao',
    name:           'Basmati Pulao',
    description:    'Fragrant basmati rice, lightly steamed with whole spices.',
    basePrice:      4.00,
    isVegan:        true,
    spiceLevel:     null,
    imageUrl:       '/images/dishes/basmati-pulao.jpg',
    searchKeywords: ['pulao', 'pilaf', 'basmati rice', 'plain rice', 'steamed rice', 'jeera rice', 'mild rice', 'vegan', 'side'],
  },
  {
    id:             'mattar-pulao',
    name:           'Mattar Pulao',
    description:    'Basmati rice cooked with green peas and whole spices.',
    basePrice:      7.00,
    isVegan:        true,
    spiceLevel:     null,
    imageUrl:       '/images/dishes/mattar-pulao.jpg',
    searchKeywords: ['peas pulao', 'matar pulao', 'peas rice', 'peas pilaf', 'green peas rice', 'mild rice', 'vegan', 'side'],
  },

  // ---- BIRYANIS (mixed rice dish with meat/veggies + herbs + spices) ----
  {
    id:             'lamb-biryani',
    name:           'Lamb Biryani',
    description:    'Basmati rice layered with spiced lamb and herbs.',
    basePrice:      16.50,
    isVegetarian:   false,
    imageUrl:       '/images/dishes/lamb-biryani.jpg',
    searchKeywords: ['mutton biryani', 'lamb rice', 'biryani', 'meat biryani', 'hyderabadi biryani', 'spiced rice', 'hearty', 'non-veg'],
  },
  {
    id:             'beef-biryani',
    name:           'Beef Biryani',
    description:    'Basmati rice layered with spiced beef and herbs.',
    basePrice:      15.50,
    isVegetarian:   false,
    imageUrl:       '/images/dishes/beef-biryani.jpg',
    searchKeywords: ['beef rice', 'beef biryani', 'meat biryani', 'spiced rice', 'hearty', 'non-veg'],
  },
  {
    id:             'goat-biryani',
    name:           'Goat Biryani',
    description:    'Basmati rice layered with spiced goat and herbs.',
    basePrice:      15.50,
    isVegetarian:   false,
    imageUrl:       '/images/dishes/goat-biryani.jpg',
    searchKeywords: ['goat rice', 'goat biryani', 'mutton biryani', 'meat biryani', 'spiced rice', 'hearty', 'non-veg'],
  },
  {
    id:             'chicken-biryani',
    name:           'Chicken Biryani',
    description:    'Basmati rice layered with spiced chicken and herbs.',
    basePrice:      15.50,
    isVegetarian:   false,
    imageUrl:       '/images/dishes/chicken-biryani.jpg',
    searchKeywords: ['chicken rice', 'murgh biryani', 'chicken biryani', 'spiced rice', 'popular', 'non-veg'],
  },
  {
    id:             'chicken-tikka-biryani',
    name:           'Chicken Tikka Biryani',
    description:    'Basmati rice layered with tandoori chicken tikka and herbs.',
    basePrice:      15.50,
    isVegetarian:   false,
    imageUrl:       '/images/dishes/chicken-tikka-biryani.jpg',
    searchKeywords: ['tikka biryani', 'chicken tikka rice', 'tandoori biryani', 'grilled chicken rice', 'smoky biryani', 'non-veg'],
  },
  {
    id:             'shrimp-biryani',
    name:           'Shrimp Biryani',
    description:    'Basmati rice layered with spiced shrimp and herbs.',
    basePrice:      18.95,
    isVegetarian:   false,
    allergens:      ['shellfish'],
    imageUrl:       '/images/dishes/shrimp-biryani.jpg',
    searchKeywords: ['prawn biryani', 'shrimp rice', 'seafood biryani', 'jumbo shrimp rice', 'non-veg', 'seafood'],
  },
  {
    id:             'vegetable-biryani',
    name:           'Vegetable Biryani',
    description:    'Basmati rice layered with mixed vegetables, herbs and spices.',
    basePrice:      12.50,
    isVegan:        true,
    imageUrl:       '/images/dishes/vegetable-biryani.jpg',
    searchKeywords: ['veg biryani', 'vegetable rice', 'mixed veg biryani', 'veg pulao', 'meatless biryani', 'vegan', 'vegetarian'],
  },
].map((dish) => ({ ...BASE_RICE, ...dish }));
