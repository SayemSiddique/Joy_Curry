const IS_PROD = typeof window !== 'undefined'
  ? window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
  : import.meta.env.PROD;

export const API_BASE_URL = IS_PROD
  ? 'https://joy-curry-tandoor-api.onrender.com'
  : 'http://localhost:3000';

export const TAX_RATE = 0.0875;
export const DELIVERY_FEE_CENTS = 300;
export const MIN_ORDER_CENTS = 1500;

export const SPICE_LEVELS: Record<string, { label: string; icon: string }> = {
  Mild:   { label: 'Mild',   icon: '🌶' },
  Medium: { label: 'Medium', icon: '🌶🌶' },
  Hot:    { label: 'Hot',    icon: '🌶🌶🌶' },
};

export const CATEGORIES: { id: string; label: string; emoji: string }[] = [
  { id: 'appetizer',       label: 'Appetizers',         emoji: '🥗' },
  { id: 'salad',           label: 'Salads',              emoji: '🥙' },
  { id: 'soup',            label: 'Soups',               emoji: '🍲' },
  { id: 'vegetable-entree', label: 'Vegetable Entrées',  emoji: '🥦' },
  { id: 'vegan-entree',    label: 'Vegan Entrées',       emoji: '🌱' },
  { id: 'chicken-entree',  label: 'Chicken Entrées',     emoji: '🍗' },
  { id: 'meat-entree',     label: 'Meat Entrées',        emoji: '🥩' },
  { id: 'fish-shrimp',     label: 'Fish & Shrimp',       emoji: '🦐' },
  { id: 'tandoori',        label: 'Tandoori',            emoji: '🔥' },
  { id: 'rice-biryani',    label: 'Rice & Biryani',      emoji: '🍚' },
  { id: 'express-lunch',   label: 'Express Lunch',       emoji: '⚡' },
  { id: 'bread',           label: 'Breads',              emoji: '🫓' },
  { id: 'side',            label: 'Sides',               emoji: '🍛' },
  { id: 'condiment',       label: 'Condiments',          emoji: '🧄' },
  { id: 'dessert',         label: 'Desserts',            emoji: '🍮' },
  { id: 'beverage',        label: 'Beverages',           emoji: '🥤' },
  { id: 'dinner-special',  label: 'Dinner Specials',     emoji: '🍽️' },
  { id: 'combo',           label: 'Joy Combos',          emoji: '🥘' },
];

export const DIETARY_FILTERS = [
  { id: 'vegan',      label: 'Vegan',      field: 'isVegan' },
  { id: 'vegetarian', label: 'Vegetarian', field: 'isVegetarian' },
  { id: 'gluten-free', label: 'Gluten-Free', field: 'isGlutenFree' },
] as const;
