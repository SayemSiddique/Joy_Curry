// ============================================================================
// components/MenuCard.js
// Pure component: takes a menu item object, returns an HTML string for one card.
//
// Reproduces the exact .menu-card markup established in Phase 2 styles.css so
// the existing design system applies without modification. No DOM access, no
// side effects — data in, string out. This is the M3.3 rendering unit.
// ============================================================================

import { formatPrice } from '../utils/formatters.js';
import { SPICE_LEVELS } from '../config/constants.js';

/**
 * Build the dietary badge (Vegan / Veg / Non-Veg).
 * Priority: vegan > vegetarian > non-veg. A vegan dish is also vegetarian, but
 * the most restrictive accurate label wins for the customer.
 *
 * @param {object} item - menu item
 * @returns {string} badge HTML, or empty string if no dietary data
 */
const renderDietaryBadge = (item) => {
  if (item.isVegan) {
    return '<span class="badge badge--vegan">Vegan</span>';
  }
  if (item.isVegetarian) {
    return '<span class="badge badge--veg">Veg</span>';
  }
  return '<span class="badge badge--nonveg">Non-Veg</span>';
};

/**
 * Build allergen badges — one per allergen in the array.
 * Safety-critical: always rendered when allergens exist so customers see them.
 *
 * @param {string[]} allergens - e.g. ['dairy', 'cashew']
 * @returns {string} concatenated badge HTML
 */
const renderAllergenBadges = (allergens) => {
  if (!Array.isArray(allergens) || allergens.length === 0) return '';
  return allergens
    .map(
      (a) =>
        `<span class="badge badge--allergen">⚠ ${escapeHtml(capitalize(a))}</span>`
    )
    .join('');
};

/**
 * Build the spice-level badge: pepper icons + label word.
 * Uses SPICE_LEVELS from constants (has both {label, icon}).
 * null spiceLevel renders nothing — the dish simply has no spice indicator.
 *
 * @param {string|null} spiceLevel - 'Mild' | 'Medium' | 'Hot' | null
 * @returns {string} badge HTML or empty string
 */
const renderSpiceBadge = (spiceLevel) => {
  if (spiceLevel === null) return '';
  const info = SPICE_LEVELS[spiceLevel];
  if (!info) return '';
  return `<span class="badge badge--spice"><span class="spice-level">${info.icon}</span> ${info.label}</span>`;
};

/**
 * Build optional badges: gluten-free, popular.
 *
 * @param {object} item - menu item
 * @returns {string} concatenated badge HTML
 */
const renderExtraBadges = (item) => {
  let badges = '';
  if (item.isGlutenFree) {
    badges += '<span class="badge badge--gf">GF</span>';
  }
  if (Array.isArray(item.tags) && item.tags.includes('popular')) {
    badges += '<span class="badge badge--popular">Popular</span>';
  }
  return badges;
};

/**
 * Escape user-controlled / data-sourced text for safe insertion into HTML.
 * Prevents XSS if a dish name or description ever contains markup characters.
 * The menu data is trusted (authored, not user input) but defense-in-depth
 * costs nothing and sets the pattern for Phase 6 when data comes from an API.
 *
 * @param {string} str - raw string
 * @returns {string} HTML-safe string
 */
const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Render a single menu card as an HTML string.
 *
 * @param {object} item - a menu item conforming to the §4a schema
 * @returns {string} complete <article class="menu-card"> HTML
 */
export const MenuCard = (item) => {
  const outOfStock = item.inStock === false;
  const cardClass = outOfStock
    ? 'menu-card menu-card--out-of-stock'
    : 'menu-card';
  const ariaDisabled = outOfStock ? ' aria-disabled="true"' : '';

  const dietaryBadge = renderDietaryBadge(item);
  const allergenBadges = renderAllergenBadges(item.allergens);
  const spiceBadge = renderSpiceBadge(item.spiceLevel);
  const extraBadges = renderExtraBadges(item);

  const addButton = outOfStock
    ? '<button class="menu-card__add-btn btn btn--primary btn--sm" disabled>Sold Out</button>'
    : `<button class="menu-card__add-btn btn btn--primary btn--sm" data-action="add-to-cart" data-item-id="${escapeHtml(
        item.id
      )}" aria-label="Add ${escapeHtml(item.name)} to cart">+ Add</button>`;

  return `
    <article class="${cardClass}"${ariaDisabled} data-item-id="${escapeHtml(item.id)}">
      <div class="menu-card__image" role="img" aria-label="${escapeHtml(item.name)} photo placeholder">
        <span class="menu-card__image-price">${formatPrice(item.basePrice)}</span>
      </div>
      <div class="menu-card__body">
        <h3 class="menu-card__name">
          ${escapeHtml(item.name)}
          ${dietaryBadge}
        </h3>
        <p class="menu-card__description">${escapeHtml(item.description)}</p>
        <div class="menu-card__meta">
          <div class="menu-card__badges">
            ${extraBadges}
            ${allergenBadges}
            ${spiceBadge}
          </div>
          ${addButton}
        </div>
      </div>
    </article>
  `;
};
