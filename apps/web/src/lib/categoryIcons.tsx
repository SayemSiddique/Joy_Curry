import {
  Utensils, Salad, Soup, Sprout, Leaf, Fish, Flame, Wheat, Clock,
  Croissant, Coffee, Cake, Droplets, Package2, Star, UtensilsCrossed,
} from 'lucide-react';

/**
 * Category → lucide-react icon, shared by every React island that lists menu
 * categories (nav dropdown, sticky category header, etc). Keeps icon choices
 * consistent and is the single place to swap a category's glyph.
 * Astro static components use the SVG-string equivalent in `@lib/icons`.
 */
const ICONS: Record<string, typeof Utensils> = {
  'appetizer': Utensils,
  'salad': Salad,
  'soup': Soup,
  'vegetable-entree': Sprout,
  'vegan-entree': Leaf,
  'chicken-entree': Utensils,
  'meat-entree': UtensilsCrossed,
  'fish-shrimp': Fish,
  'tandoori': Flame,
  'rice-biryani': Wheat,
  'express-lunch': Clock,
  'bread': Croissant,
  'side': Soup,
  'condiment': Droplets,
  'dessert': Cake,
  'beverage': Coffee,
  'dinner-special': Star,
  'combo': Package2,
};

export function CategoryIcon({ id, size = 18 }: { id: string; size?: number }) {
  const Icon = ICONS[id] ?? Utensils;
  return <Icon size={size} aria-hidden="true" />;
}
