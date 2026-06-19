// ============================================================================
// components/BundleCard.js — Joy Curry & Tandoor
// Pure string builder for a bundle card (Dinner Special or Joy Combo).
// Uses the same .menu-card BEM structure as MenuCard so the existing
// design system applies without new CSS classes.
// No DOM access, no side effects — data in, string out.
// ============================================================================

import { formatPrice } from '../utils/formatters.js';

const esc = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderDietaryBadge = (bundle) => {
  if (bundle.isVegan)       return '<span class="badge badge--vegan">Vegan</span>';
  if (bundle.isVegetarian)  return '<span class="badge badge--veg">Veg</span>';
  return '<span class="badge badge--nonveg">Non-Veg</span>';
};

const renderAllergenBadges = (allergens) => {
  if (!Array.isArray(allergens) || allergens.length === 0) return '';
  return allergens
    .map((a) => `<span class="badge badge--allergen">⚠ ${esc(a.charAt(0).toUpperCase() + a.slice(1))}</span>`)
    .join('');
};

/** Renders the fixed inclusions line (e.g. "Includes: rice, 1 naan"). */
function renderIncludes(bundle) {
  if (!Array.isArray(bundle.includes) || bundle.includes.length === 0) return '';
  const items = bundle.includes.map(esc).join(', ');
  return `<p style="font-size:var(--font-size-xs);color:var(--color-text-secondary);margin:var(--spacing-xs) 0 0;">
    Includes: ${items}
  </p>`;
}

/**
 * Renders a compact slot summary line (e.g. "Choose 1 Appetizer · Choose 1 Entrée").
 * Omitted for fully-fixed bundles (no choosable slots).
 */
function renderSlotSummary(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return '';
  const parts = slots.map((s) => `Choose ${s.choose} ${esc(s.label)}`).join(' · ');
  return `<p style="font-size:var(--font-size-xs);color:var(--color-brand-primary);font-weight:var(--font-weight-semibold);margin:var(--spacing-xs) 0 0;">
    ${parts}
  </p>`;
}

/**
 * Render a single bundle card as an HTML string.
 *
 * @param {object} bundle - a bundle object from dinner-specials.js or joy-combos.js
 * @returns {string}
 */
export const BundleCard = (bundle) => {
  const outOfStock = bundle.inStock === false;
  const cardClass  = outOfStock ? 'menu-card menu-card--out-of-stock' : 'menu-card';

  const hasSlots = Array.isArray(bundle.slots) && bundle.slots.length > 0;

  let addButton;
  if (outOfStock) {
    addButton = '<button class="menu-card__add-btn btn btn--primary btn--sm" disabled>Sold Out</button>';
  } else if (hasSlots) {
    addButton = `<button
      class="menu-card__add-btn btn btn--primary btn--sm"
      data-action="open-bundle-modal"
      data-bundle-id="${esc(bundle.id)}"
      aria-label="Customize and add ${esc(bundle.name)} to order"
    >Customize &amp; Add</button>`;
  } else {
    // Fully-fixed bundle (no slot choices) — add directly.
    addButton = `<button
      class="menu-card__add-btn btn btn--primary btn--sm"
      data-action="add-bundle-direct"
      data-bundle-id="${esc(bundle.id)}"
      aria-label="Add ${esc(bundle.name)} to order"
    >+ Add</button>`;
  }

  return `
    <article
      class="${cardClass}"
      ${outOfStock ? 'aria-disabled="true"' : ''}
      data-bundle-id="${esc(bundle.id)}"
    >
      <div class="menu-card__image" role="img" aria-label="${esc(bundle.name)} photo placeholder">
        <span class="menu-card__image-price">${formatPrice(bundle.basePrice)}</span>
      </div>
      <div class="menu-card__body">
        <h3 class="menu-card__name">
          ${esc(bundle.name)}
          ${renderDietaryBadge(bundle)}
        </h3>
        <p class="menu-card__description">${esc(bundle.description)}</p>
        ${renderIncludes(bundle)}
        ${renderSlotSummary(bundle.slots)}
        <div class="menu-card__meta">
          <div class="menu-card__badges">
            ${renderAllergenBadges(bundle.allergens)}
          </div>
          ${addButton}
        </div>
      </div>
    </article>
  `;
};
