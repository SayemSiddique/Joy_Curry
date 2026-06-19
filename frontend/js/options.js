// ============================================================================
// options.js — Joy Curry & Tandoor
// Builds the item-options modal HTML and reads form selections back into a
// structured selectedOptions object consumed by cartState.addItem().
// Pure functions — no DOM access, no side effects.
// ============================================================================

import { formatPrice } from './utils/formatters.js';
import { calculateLineTotal } from './state/cartState.js';

// Spice levels the customer can select at order time.
const SPICE_CHOICES = ['Mild', 'Medium', 'Hot'];

// ============================================================================
// hasOptions — determines if an item needs the modal or can be added directly.
// ============================================================================

/**
 * Returns true when the item has any configurable options:
 * size variants, modifiers, protein choices, or a defined spice level.
 *
 * @param {object} item
 * @returns {boolean}
 */
export function hasOptions(item) {
  return (
    (Array.isArray(item.sizeOptions) && item.sizeOptions.length > 0) ||
    (Array.isArray(item.proteinChoice) && item.proteinChoice.length > 0) ||
    (Array.isArray(item.modifiers) && item.modifiers.length > 0) ||
    item.spiceLevel != null
  );
}

// ============================================================================
// buildOptionsModal — returns the inner content HTML for the options overlay.
// The outer <div id="options-modal-overlay"> lives in index.html as a shell;
// app.js injects this into it and removes the `hidden` attribute to show it.
// ============================================================================

/**
 * Build the full options modal HTML for a given menu item.
 *
 * @param {object} item - menu item from data files
 * @returns {string}    - HTML string for the modal inner content
 */
export function buildOptionsModal(item) {
  const esc = escapeHtml;
  const initialTotal = calculateLineTotal(item, buildDefaultOptions(item), 1);

  return `
    <div class="checkout-modal">
      <div class="checkout-modal__header">
        <h2 class="checkout-modal__title" id="options-modal-title">${esc(item.name)}</h2>
        <button
          class="navbar__nav-close"
          id="options-modal-close"
          aria-label="Close options"
        >✕</button>
      </div>

      <form class="checkout-modal__body" id="options-form" novalidate>
        <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--spacing-sm);">${esc(item.description)}</p>

        ${renderSizeOptions(item)}
        ${renderProteinOptions(item)}
        ${renderModifierOptions(item)}
        ${renderSpiceOptions(item)}
        ${renderQtyStepper()}

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: var(--spacing-md);">
          <span
            id="options-price-preview"
            style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: var(--color-brand-primary);"
          >${formatPrice(initialTotal / 100)}</span>
          <button
            type="submit"
            class="btn btn--primary"
          >Add to Order</button>
        </div>
      </form>
    </div>
  `;
}

// ============================================================================
// getSelectedOptions — reads a submitted/changed form into selectedOptions.
// ============================================================================

/**
 * Read the options form and return a structured selectedOptions object.
 * sizePrice is in float dollars (matches the data file convention so
 * calculateLineTotal can convert to cents in one place).
 *
 * @param {HTMLFormElement} formEl
 * @param {object}          item   - the item whose form is being read
 * @returns {{
 *   sizeLabel:       string|null,
 *   sizePrice:       number|null,
 *   modifierIds:     string[],
 *   modifierDeltas:  number[],   // integer cents
 *   protein:         string|null,
 *   spice:           string|null,
 *   qty:             number,
 * }}
 */
export function getSelectedOptions(formEl, item) {
  const data = new FormData(formEl);

  // Size
  const sizeLabel = data.get('size') || null;
  let sizePrice = null;
  if (sizeLabel && Array.isArray(item.sizeOptions)) {
    const match = item.sizeOptions.find((s) => s.label === sizeLabel);
    if (match) sizePrice = match.price;
  }

  // Modifiers
  const modifierIds = data.getAll('modifier');
  const modifierDeltas = [];
  if (Array.isArray(item.modifiers)) {
    for (const mod of item.modifiers) {
      if (modifierIds.includes(mod.id)) {
        modifierDeltas.push(Math.round(mod.priceDelta * 100));
      }
    }
  }

  // Protein
  const protein = data.get('protein') || null;

  // Spice
  const spice = data.get('spice') || item.spiceLevel || null;

  // Qty
  const qty = Math.max(1, parseInt(data.get('qty') ?? '1', 10));

  return { sizeLabel, sizePrice, modifierIds, modifierDeltas, protein, spice, qty };
}

// ============================================================================
// buildDefaultOptions — returns the initial selectedOptions for a fresh modal.
// ============================================================================

/**
 * @param {object} item
 * @returns {object} selectedOptions with defaults (first size, no modifiers, etc.)
 */
export function buildDefaultOptions(item) {
  const sizeLabel = item.sizeOptions?.[0]?.label ?? null;
  const sizePrice = item.sizeOptions?.[0]?.price ?? null;
  return {
    sizeLabel,
    sizePrice,
    modifierIds: [],
    modifierDeltas: [],
    protein: item.proteinChoice?.[0] ?? null,
    spice: item.spiceLevel ?? null,
    qty: 1,
  };
}

// ============================================================================
// Section renderers — each returns an HTML string or '' when not applicable.
// ============================================================================

function renderSizeOptions(item) {
  if (!Array.isArray(item.sizeOptions) || item.sizeOptions.length === 0) return '';
  const esc = escapeHtml;

  const radios = item.sizeOptions.map((s, i) => `
    <label class="form-radio-label">
      <input
        type="radio"
        name="size"
        value="${esc(s.label)}"
        ${i === 0 ? 'checked' : ''}
        data-price="${s.price}"
      >
      ${esc(s.label)} — ${formatPrice(s.price)}
    </label>
  `).join('');

  return `
    <fieldset class="form-group">
      <legend class="form-label">Size</legend>
      <div class="form-radio-group">${radios}</div>
    </fieldset>
  `;
}

function renderProteinOptions(item) {
  if (!Array.isArray(item.proteinChoice) || item.proteinChoice.length === 0) return '';
  const esc = escapeHtml;

  const radios = item.proteinChoice.map((p, i) => `
    <label class="form-radio-label">
      <input type="radio" name="protein" value="${esc(p)}" ${i === 0 ? 'checked' : ''}>
      ${esc(p)}
    </label>
  `).join('');

  return `
    <fieldset class="form-group">
      <legend class="form-label">Protein</legend>
      <div class="form-radio-group">${radios}</div>
    </fieldset>
  `;
}

function renderModifierOptions(item) {
  if (!Array.isArray(item.modifiers) || item.modifiers.length === 0) return '';
  const esc = escapeHtml;

  const checks = item.modifiers.map((m) => `
    <label class="form-radio-label">
      <input
        type="checkbox"
        name="modifier"
        value="${esc(m.id)}"
        data-price-delta="${Math.round(m.priceDelta * 100)}"
      >
      ${esc(m.label)}${m.priceDelta !== 0 ? ` (+${formatPrice(m.priceDelta)})` : ''}
    </label>
  `).join('');

  return `
    <fieldset class="form-group">
      <legend class="form-label">Add-ons</legend>
      <div class="form-radio-group">${checks}</div>
    </fieldset>
  `;
}

function renderSpiceOptions(item) {
  if (item.spiceLevel == null) return '';
  const esc = escapeHtml;

  const radios = SPICE_CHOICES.map((level) => `
    <label class="form-radio-label">
      <input
        type="radio"
        name="spice"
        value="${esc(level)}"
        ${level === item.spiceLevel ? 'checked' : ''}
      >
      ${esc(level)}
    </label>
  `).join('');

  return `
    <fieldset class="form-group">
      <legend class="form-label">Spice Level</legend>
      <div class="form-radio-group">${radios}</div>
    </fieldset>
  `;
}

function renderQtyStepper() {
  return `
    <div class="form-group">
      <label class="form-label" for="options-qty">Quantity</label>
      <div class="cart-item__qty">
        <button type="button" class="cart-item__qty-btn" id="qty-dec" aria-label="Decrease quantity">−</button>
        <span class="cart-item__qty-value" id="options-qty-display">1</span>
        <input type="hidden" name="qty" id="options-qty" value="1">
        <button type="button" class="cart-item__qty-btn" id="qty-inc" aria-label="Increase quantity">+</button>
      </div>
    </div>
  `;
}

// ============================================================================
// Minimal HTML escape — same pattern as app.js and MenuCard.js.
// ============================================================================
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
