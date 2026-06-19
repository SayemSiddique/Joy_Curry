// ============================================================================
// frontend/js/data/menu/fish-shrimp.js
// Boneless Fish & Shrimp Entrées Category Data Sheet
// Uses the Shared Modifier Pattern to merge base data with unique entries.
// Source of truth: Roadmap §6 — served with basmati rice.
// Fish Curry (flounder) 15.50 · Fish Masala (salmon) 19.95 ·
// Whole Fish Masala (tilapia) 14.95 · Shrimp Masala 18.95.
//
// All non-veg (seafood). Gluten-free (fish/shellfish, grain-free curries).
// Shrimp carries a shellfish allergen — safety-critical for allergic customers.
// No dairy in these dishes (tomato/spice-based preparations).
// ============================================================================

const BASE_FISH_SHRIMP = {
  category:       'fish-shrimp',
  subcategory:    null,
  isVegan:        false,
  isVegetarian:   false,
  isGlutenFree:   true,
  allergens:      [],              // overridden for shrimp (shellfish)
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

export const fishAndShrimp = [
  {
    id:             'fish-curry',
    name:           'Fish Curry',
    description:    'Flounder fillets cooked Bengali-style with fresh coriander.',
    basePrice:      15.50,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/fish-curry.jpg',
    searchKeywords: ['fish curry', 'bengali fish', 'flounder curry', 'maacher jhol', 'fish in sauce', 'coriander fish', 'seafood', 'non-veg'],
  },
  {
    id:             'fish-masala',
    name:           'Fish Masala',
    description:    'Salmon fillets in a mild spiced gravy.',
    basePrice:      19.95,
    spiceLevel:     'Mild',
    imageUrl:       '/images/dishes/fish-masala.jpg',
    searchKeywords: ['salmon curry', 'fish masala', 'salmon masala', 'mild fish', 'creamy fish', 'seafood', 'premium', 'non-veg'],
  },
  {
    id:             'whole-fish-masala',
    name:           'Whole Fish Masala',
    description:    'Fried whole tilapia topped with onions and tomatoes.',
    basePrice:      14.95,
    spiceLevel:     'Medium',
    imageUrl:       '/images/dishes/whole-fish-masala.jpg',
    searchKeywords: ['whole fish', 'fried fish', 'tilapia masala', 'tilapia fry', 'whole tilapia', 'crispy fish', 'fish fry', 'seafood', 'non-veg'],
  },
  {
    id:             'shrimp-masala',
    name:           'Shrimp Masala',
    description:    'Jumbo shrimp in a mild thick gravy.',
    basePrice:      18.95,
    spiceLevel:     'Mild',
    allergens:      ['shellfish'],
    imageUrl:       '/images/dishes/shrimp-masala.jpg',
    searchKeywords: ['jumbo shrimp', 'prawn masala', 'shrimp curry', 'prawn curry', 'creamy shrimp', 'seafood', 'shellfish', 'non-veg'],
  },
].map((dish) => ({ ...BASE_FISH_SHRIMP, ...dish }));
