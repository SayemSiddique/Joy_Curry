// ============================================================================
// frontend/js/data/menu/desserts.js
// Desserts Category Data Sheet
// Uses the Shared Modifier Pattern to merge base data with unique entries.
// Source of truth: Roadmap §6 — Gulab Jamun 4 · Rasmalai 4 · Kheer 4.
// ============================================================================

// Base object: fields uniform across every dessert. Desserts are sweet, served
// on their own (no rice/naan/raita), carry no spice, and contain dairy. The
// entire restaurant is Halal — modelled at the restaurant level, not per item.
const BASE_DESSERT = {
  category:       'dessert',
  subcategory:    null,
  basePrice:      4.00,
  isVegan:        false,
  isVegetarian:   true,
  isGlutenFree:   false,            // Gulab Jamun + Kheer confirmed GF-uncertain; default safe
  allergens:      ['dairy'],
  allergenNote:   null,             // use global ALLERGEN_NOTE_DEFAULT banner
  servedWith:     null,
  proteinChoice:  null,
  sizeOptions:    null,
  modifiers:      null,
  pieceCount:     null,
  tags:           [],
  inStock:        true,
  isActive:       true,
};

export const desserts = [
  {
    id:             'gulab-jamun-dessert',
    name:           'Gulab Jamun',
    description:    'Lightly fried cheeseball soaked in warm sugar syrup.',
    spiceLevel:     null,
    tags:           ['popular'],
    imageUrl:       '/images/dishes/gulab-jamun.jpg',
    searchKeywords: ['gulab jamoon', 'gulabjun', 'jamun', 'jamon', 'fried dumpling', 'milk solid ball', 'sugar syrup', 'sweet ball', 'milk cake ball', 'hot dessert', 'classic indian sweet', 'diwali sweet', 'dessert', 'sweet'],
  },
  {
    id:             'rasmalai-dessert',
    name:           'Rasmalai',
    description:    'Soft cottage-cheese patties in chilled, cardamom-scented milk syrup.',
    spiceLevel:     null,
    imageUrl:       '/images/dishes/rasmalai.jpg',
    searchKeywords: ['rosomalai', 'ras malai', 'rasmala', 'chenna', 'paneer ball', 'milk dumpling', 'cardamom milk', 'saffron', 'pistachio', 'cold dessert', 'creamy dessert', 'bengali sweet', 'dessert', 'sweet'],
  },
  {
    id:             'kheer-dessert',
    name:           'Kheer',
    description:    'Creamy Indian rice pudding with cardamom and raisins.',
    spiceLevel:     null,
    imageUrl:       '/images/dishes/kheer.jpg',
    searchKeywords: ['payasam', 'payasa', 'firni', 'phirni', 'rice pudding', 'rice kheer', 'kheer', 'khir', 'cardamom pudding', 'milk and rice', 'creamy dessert', 'comfort dessert', 'dessert', 'sweet'],
  },
].map((dish) => ({ ...BASE_DESSERT, ...dish }));
