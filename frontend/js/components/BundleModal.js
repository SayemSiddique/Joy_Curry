// ============================================================================
// components/BundleModal.js — Joy Curry & Tandoor
// Pure string builders + form reader for the bundle configuration modal.
// Handles both Dinner Specials (choose 1 per slot) and Joy Combos
// (choose N per slot, N ≥ 1). Constraint enforcement (max N checkboxes
// per slot, no duplicates) is applied in app.js event handlers using
// the data-slot-choose attribute emitted here.
//
// No DOM access, no side effects — data in, string/object out.
// ============================================================================

import { formatPrice } from '../utils/formatters.js';

const esc = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ============================================================================
// buildBundleModal — returns the inner content HTML for the bundle overlay.
// ============================================================================

/**
 * @param {object} bundle   - bundle data object (dinner-special or combo)
 * @param {Map}    itemById - full itemById map from app.js for name resolution
 * @returns {string}
 */
export function buildBundleModal(bundle, itemById) {
  const priceCents = Math.round(bundle.basePrice * 100);

  const includesHtml = Array.isArray(bundle.includes) && bundle.includes.length > 0
    ? `<p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:var(--spacing-sm);">
         Always included: ${bundle.includes.map(esc).join(', ')}
       </p>`
    : '';

  const fixedItemsHtml = Array.isArray(bundle.fixedItemIds) && bundle.fixedItemIds.length > 0
    ? `<div style="margin-bottom:var(--spacing-md);">
         <p class="form-label" style="margin-bottom:var(--spacing-xs);">Fixed items included</p>
         ${bundle.fixedItemIds.map((id) => {
           const name = itemById.get(id)?.name ?? id;
           return `<p style="font-size:var(--font-size-sm);padding:var(--spacing-xs) 0;color:var(--color-text-secondary);">
             ✓ ${esc(name)}
           </p>`;
         }).join('')}
       </div>`
    : '';

  const slotsHtml = Array.isArray(bundle.slots) && bundle.slots.length > 0
    ? bundle.slots.map((slot) => renderSlot(slot, itemById)).join('')
    : '';

  return `
    <div class="checkout-modal">
      <div class="checkout-modal__header">
        <h2 class="checkout-modal__title" id="bundle-modal-title">${esc(bundle.name)}</h2>
        <button
          class="navbar__nav-close"
          id="bundle-modal-close"
          aria-label="Close bundle options"
        >✕</button>
      </div>
      <form class="checkout-modal__body" id="bundle-form" novalidate data-bundle-id="${esc(bundle.id)}">
        <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:var(--spacing-sm);">
          ${esc(bundle.description)}
        </p>
        ${includesHtml}
        ${fixedItemsHtml}
        ${slotsHtml}
        ${renderQtyStepper()}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:var(--spacing-md);">
          <span
            id="bundle-price-preview"
            style="font-size:var(--font-size-lg);font-weight:var(--font-weight-bold);color:var(--color-brand-primary);"
          >${formatPrice(priceCents / 100)}</span>
          <button type="submit" class="btn btn--primary">Add to Order</button>
        </div>
      </form>
    </div>
  `;
}

// ============================================================================
// getBundleSelections — reads the submitted bundle form into a structured object.
// Returns null on validation failure (not all slots filled to required count).
// ============================================================================

/**
 * @param {HTMLFormElement} formEl
 * @param {object}          bundle
 * @param {Map}             itemById
 * @returns {{ slotSelections: Array, qty: number } | null}
 */
export function getBundleSelections(formEl, bundle, itemById) {
  const data = new FormData(formEl);
  const slotSelections = [];

  for (const slot of (bundle.slots ?? [])) {
    if (slot.choose === 1) {
      const selectedId = data.get(`slot-${slot.id}`);
      if (!selectedId) return null;
      slotSelections.push({
        slotId:    slot.id,
        slotLabel: slot.label,
        itemIds:   [selectedId],
        itemNames: [itemById.get(selectedId)?.name ?? selectedId],
      });
    } else {
      const selectedIds = data.getAll(`slot-${slot.id}`);
      if (selectedIds.length !== slot.choose) return null;
      slotSelections.push({
        slotId:    slot.id,
        slotLabel: slot.label,
        itemIds:   selectedIds,
        itemNames: selectedIds.map((id) => itemById.get(id)?.name ?? id),
      });
    }
  }

  const qty = Math.max(1, parseInt(data.get('qty') ?? '1', 10));
  return { slotSelections, qty };
}

// ============================================================================
// Private section renderers
// ============================================================================

function renderSlot(slot, itemById) {
  const inputType = slot.choose === 1 ? 'radio' : 'checkbox';
  const legend    = slot.choose === 1
    ? `Choose 1 — ${esc(slot.label)}`
    : `Choose ${slot.choose} — ${esc(slot.label)}`;

  const inputs = slot.optionIds.map((id) => {
    const name = itemById.get(id)?.name ?? id;
    return `
      <label class="form-radio-label">
        <input
          type="${inputType}"
          name="slot-${esc(slot.id)}"
          value="${esc(id)}"
          data-slot-choose="${slot.choose}"
        >
        ${esc(name)}
      </label>
    `;
  }).join('');

  return `
    <fieldset
      class="form-group"
      data-slot-id="${esc(slot.id)}"
      data-slot-choose="${slot.choose}"
    >
      <legend class="form-label">${legend}</legend>
      <div class="form-radio-group">${inputs}</div>
    </fieldset>
  `;
}

function renderQtyStepper() {
  return `
    <div class="form-group">
      <label class="form-label" for="bundle-qty">Quantity</label>
      <div class="cart-item__qty">
        <button type="button" class="cart-item__qty-btn" id="bundle-qty-dec" aria-label="Decrease quantity">−</button>
        <span class="cart-item__qty-value" id="bundle-qty-display">1</span>
        <input type="hidden" name="qty" id="bundle-qty" value="1">
        <button type="button" class="cart-item__qty-btn" id="bundle-qty-inc" aria-label="Increase quantity">+</button>
      </div>
    </div>
  `;
}
