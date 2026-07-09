// The API base URL is NOT a constant here — it is platform configuration,
// injected per app via initCore({ apiBaseUrl }) in config.ts (web reads
// PUBLIC_API_BASE_URL at its composition root; mobile will use EXPO_PUBLIC_*).

export const TAX_RATE = 0.0875;
// In-house delivery fee + free-delivery threshold — display mirror of the
// authoritative copies in backend/config/delivery.js. In-house delivery is free
// once the subtotal reaches the threshold (the waiver does NOT apply out of zone).
export const DELIVERY_FEE_CENTS = 300;
export const FREE_DELIVERY_THRESHOLD_CENTS = 3000; // $30.00
// Minimum order subtotal for delivery — MUST mirror backend/middleware/validate.js
// (the single source of truth, currently $10.00). Don't keep a second copy elsewhere.
export const MIN_ORDER_CENTS = 1000;

export const SPICE_LEVELS: Record<string, { label: string; icon: string }> = {
  Mild:   { label: 'Mild',   icon: '🌶' },
  Medium: { label: 'Medium', icon: '🌶🌶' },
  Hot:    { label: 'Hot',    icon: '🌶🌶🌶' },
};

// Icons are rendered from Lucide (web: @lib/categoryIcons + @lib/icons) keyed
// by category id — no emoji glyphs in the data.
export const CATEGORIES: { id: string; label: string }[] = [
  { id: 'appetizer',        label: 'Appetizers' },
  { id: 'salad',            label: 'Salads' },
  { id: 'soup',             label: 'Soups' },
  { id: 'vegetable-entree', label: 'Vegetable Entrées' },
  { id: 'vegan-entree',     label: 'Vegan Entrées' },
  { id: 'chicken-entree',   label: 'Chicken Entrées' },
  { id: 'meat-entree',      label: 'Meat Entrées' },
  { id: 'fish-shrimp',      label: 'Fish & Shrimp' },
  { id: 'tandoori',         label: 'Tandoori' },
  { id: 'rice-biryani',     label: 'Rice & Biryani' },
  { id: 'express-lunch',    label: 'Express Lunch' },
  { id: 'bread',            label: 'Breads' },
  { id: 'side',             label: 'Sides' },
  { id: 'condiment',        label: 'Condiments' },
  { id: 'dessert',          label: 'Desserts' },
  { id: 'beverage',         label: 'Beverages' },
  { id: 'dinner-special',   label: 'Dinner Specials' },
  { id: 'combo',            label: 'Joy Combos' },
];

export const DIETARY_FILTERS = [
  { id: 'vegan',      label: 'Vegan',      field: 'isVegan' },
  { id: 'vegetarian', label: 'Vegetarian', field: 'isVegetarian' },
  { id: 'gluten-free', label: 'Gluten-Free', field: 'isGlutenFree' },
] as const;
