// ============================================================================
// components/CartItem.js — Joy Curry & Tandoor
// Pure string builder for a single cart line item row in the cart drawer.
// No DOM access. All monetary values received as integer cents.
// ============================================================================

import { formatPrice } from '../utils/formatters.js';

const esc = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Render a cart line item as an HTML string.
 *
 * @param {object} lineItem - CartLineItem from cartState
 * @param {string} lineItem.cartItemId
 * @param {string} lineItem.name
 * @param {object} lineItem.selectedOptions
 * @param {number} lineItem.qty
 * @param {number} lineItem.lineTotalCents
 * @returns {string}
 */
export function CartItem(lineItem) {
  const { cartItemId, name, selectedOptions, qty, lineTotalCents } = lineItem;
  const subtitle = buildSubtitle(selectedOptions);

  return `
    <div class="cart-item" data-cart-item-id="${esc(cartItemId)}">
      <div class="cart-item__top">
        <span class="cart-item__name">${esc(name)}${subtitle ? `<br><small style="color:var(--color-text-secondary);font-size:var(--font-size-xs);">${esc(subtitle)}</small>` : ''}</span>
        <button
          class="cart-item__remove"
          data-action="remove-item"
          data-cart-item-id="${esc(cartItemId)}"
          aria-label="Remove ${esc(name)}"
        >✕ Remove</button>
      </div>
      <div class="cart-item__bottom">
        <div class="cart-item__qty">
          <button
            class="cart-item__qty-btn"
            data-action="qty-dec"
            data-cart-item-id="${esc(cartItemId)}"
            aria-label="Decrease quantity of ${esc(name)}"
          >−</button>
          <span class="cart-item__qty-value">${qty}</span>
          <button
            class="cart-item__qty-btn"
            data-action="qty-inc"
            data-cart-item-id="${esc(cartItemId)}"
            aria-label="Increase quantity of ${esc(name)}"
          >+</button>
        </div>
        <span class="cart-item__price">${formatPrice(lineTotalCents / 100)}</span>
      </div>
    </div>
  `;
}

/**
 * Build a compact subtitle string from selectedOptions for display under the
 * item name.
 *
 * Bundle items: renders each slot's choices (e.g. "Appetizer: Veg Samosa | Entrée: Chicken Tikka Masala").
 * Regular items: renders size · protein · spice · modifiers.
 *
 * @param {object|null} opts
 * @returns {string}
 */
function buildSubtitle(opts) {
  if (!opts) return '';
  if (opts.isBundle === true) {
    return (opts.slotSelections ?? [])
      .map((s) => `${esc(s.slotLabel)}: ${s.itemNames.map(esc).join(', ')}`)
      .join(' | ');
  }
  const parts = [];
  if (opts.sizeLabel) parts.push(opts.sizeLabel);
  if (opts.protein) parts.push(opts.protein);
  if (opts.spice) parts.push(opts.spice);
  if (Array.isArray(opts.modifierIds) && opts.modifierIds.length > 0) {
    parts.push(...opts.modifierIds);
  }
  return parts.join(' · ');
}
