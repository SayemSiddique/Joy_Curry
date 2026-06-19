// ============================================================================
// app.js — Joy Curry & Tandoor Ordering Website
// Entry point. Owns the DOM, filter state, and all event wiring.
// Components (MenuCard, MenuSection) are pure string builders — no DOM access.
// Phase 4 will add cart state; Phase 6 will switch data source to API fetch.
// ============================================================================

import { menu } from './data/menu/index.js';
import { MenuSection } from './components/MenuSection.js';
import {
  filterByQuery,
  filterByCategory,
  filterByDietary,
  filterBySpice,
  filterByMaxPrice,
} from './utils/filterUtils.js';

// Phase 7 bundle categories — not rendered as standard menu cards.
const BUNDLE_CATEGORIES = new Set(['dinner-special', 'combo']);

// Ordered display list: slug matches item.category values in data files.
const CATEGORY_MAP = [
  { slug: 'appetizer',        label: 'Appetizers' },
  { slug: 'salad',            label: 'Salads' },
  { slug: 'soup',             label: 'Soups' },
  { slug: 'vegetable-entree', label: 'Vegetable Entrées' },
  { slug: 'vegan-entree',     label: 'Vegan Entrées' },
  { slug: 'chicken-entree',   label: 'Chicken Entrées' },
  { slug: 'meat-entree',      label: 'Meat Entrées' },
  { slug: 'fish-shrimp',      label: 'Fish & Shrimp' },
  { slug: 'tandoori',         label: 'Tandoori Dishes' },
  { slug: 'rice-biryani',     label: 'Rice & Biryani' },
  { slug: 'express-lunch',    label: 'Express Lunch' },
  { slug: 'side',             label: 'Side Dishes' },
  { slug: 'condiment',        label: 'Condiments' },
  { slug: 'bread',            label: 'Indian Breads' },
  { slug: 'dessert',          label: 'Desserts' },
  { slug: 'beverage',         label: 'Beverages' },
];

// Base item pool: active à-la-carte items only. Computed once at startup.
// Bundle items (dinner-specials, joy-combos) are excluded until Phase 7.
const activeItems = menu.filter(
  (item) => item.isActive !== false && !BUNDLE_CATEGORIES.has(item.category)
);

// ============================================================================
// Filter state — single source of truth for all active filter dimensions.
// Chunk B wires: query.
// Chunk C wires: category, dietary, spice, maxPrice.
// ============================================================================
const filterState = {
  query:    '',
  category: 'all',
  dietary:  null,
  spice:    'all',
  maxPrice: 25,
};

// ============================================================================
// Filter pipeline — composed in order, each function is a pure pass-through
// until its Chunk wires the UI control.
// ============================================================================
function applyFilters(items) {
  let result = filterByQuery(items, filterState.query);
  result = filterByCategory(result, filterState.category);
  result = filterByDietary(result, filterState.dietary);
  result = filterBySpice(result, filterState.spice);
  result = filterByMaxPrice(result, filterState.maxPrice);
  return result;
}

// ============================================================================
// Render — groups filtered items by category and injects HTML into #menu-root.
// ============================================================================
function renderMenu() {
  const root = document.getElementById('menu-root');
  if (!root) return;

  root.setAttribute('aria-busy', 'true');

  const filtered = applyFilters(activeItems);

  if (filtered.length === 0) {
    const isSearching = filterState.query.trim().length > 0;
    root.innerHTML = isSearching
      ? `<p class="state-empty">No dishes match "<strong>${escapeHtml(filterState.query.trim())}</strong>". Try a different search.</p>`
      : '<p class="state-empty">No menu items to display.</p>';
    root.setAttribute('aria-busy', 'false');
    return;
  }

  // Group filtered items by category slug, preserving CATEGORY_MAP order.
  const byCategory = new Map(CATEGORY_MAP.map(({ slug }) => [slug, []]));
  for (const item of filtered) {
    const bucket = byCategory.get(item.category);
    if (bucket) bucket.push(item);
  }

  const html = CATEGORY_MAP
    .map(({ slug, label }) => MenuSection(label, slug, byCategory.get(slug) ?? []))
    .join('');

  root.innerHTML = html;
  root.setAttribute('aria-busy', 'false');
}

// ============================================================================
// Utilities
// ============================================================================

/** Minimal HTML escaping for user-supplied strings inserted into innerHTML. */
const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Debounce: delays fn until ms milliseconds after the last call.
 * Used on the search input to avoid re-rendering on every keystroke.
 *
 * @param {Function} fn
 * @param {number}   ms
 * @returns {Function}
 */
const debounce = (fn, ms) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

// ============================================================================
// Event wiring — all listeners registered once on DOMContentLoaded.
// ============================================================================
function wireSearchInput() {
  const input = document.getElementById('search-input');
  if (!input) return;

  const handleInput = debounce((e) => {
    filterState.query = e.target.value;
    renderMenu();
  }, 150);

  input.addEventListener('input', handleInput);
}

// ============================================================================
// Bootstrap
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
  wireSearchInput();
  // Chunk C: wireCategoryFilter(), wireDietaryToggles(), wireSpiceFilter(), wirePriceFilter()
});
