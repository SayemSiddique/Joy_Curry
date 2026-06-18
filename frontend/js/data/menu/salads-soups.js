// ============================================================================
// frontend/js/data/menu/salads-soups.js
// Salads & Soup Category Data Sheet
// Source of truth: Roadmap §6 — Green Salad 5 (Vegan) · Katchumber 5 (Vegan) · Daal 5.95 (Vegan).
// All three are Vegan per the physical menu. The two salads share a base; the
// soup has its own base because its category slug differs ('soup' vs 'salad').
// The PUBLIC export is `saladsAndSoups` (the union) — that is what index.js
// imports. The intermediate arrays exist for clarity only.
// ============================================================================

// Base for the two salads: served cold with olive oil, no rice/bread.
const BASE_SALAD = {
  category:       'salad',
  subcategory:    null,
  basePrice:      5.00,
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

// Base for the lentil soup.
const BASE_SOUP = {
  category:       'soup',
  subcategory:    null,
  basePrice:      5.95,
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

// Intermediate arrays (not exported) — one per category slug.
const salads = [
  {
    id:             'green-salad',
    name:           'Green Salad',
    description:    'Lettuce, tomatoes, cucumbers and boiled chickpeas tossed in olive oil.',
    spiceLevel:     null,
    imageUrl:       '/images/dishes/green-salad.jpg',
    searchKeywords: ['garden salad', 'fresh salad', 'kachumbar salad', 'veggie salad', 'chickpea salad', 'light', 'fresh', 'healthy', 'olive oil', 'cold', 'salad', 'vegan'],
  },
  {
    id:             'katchumber',
    name:           'Katchumber',
    description:    'Onions, tomatoes, cucumbers, coriander and fresh mint in olive oil.',
    spiceLevel:     null,
    imageUrl:       '/images/dishes/katchumber.jpg',
    searchKeywords: ['kachumber', 'kuchumber', 'kachumbar', 'kachumber salad', 'indian salad', 'onion tomato salad', 'cucumber salad', 'fresh', 'light', 'cold', 'salad', 'vegan'],
  },
].map((dish) => ({ ...BASE_SALAD, ...dish }));

const soups = [
  {
    id:             'daal-soup',
    name:           'Daal',
    description:    'Lentil soup simmered with fresh spices and herbs.',
    spiceLevel:     'Mild',
    imageUrl:       '/images/dishes/daal-soup.jpg',
    searchKeywords: ['dal soup', 'dhal', 'dhall', 'lentil soup', 'yellow dal', 'tarka daal soup', 'comfort soup', 'light', 'brothy', 'soup', 'vegan'],
  },
].map((dish) => ({ ...BASE_SOUP, ...dish }));

// PUBLIC export — must be the union of both arrays, or items silently vanish
// from the aggregated menu. index.js imports this exact name.
export const saladsAndSoups = [...salads, ...soups];
