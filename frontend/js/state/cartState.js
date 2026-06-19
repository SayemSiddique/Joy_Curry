// ============================================================================
// state/cartState.js — Joy Curry & Tandoor
// Owns the cart array and all mutations. No DOM access.
// All monetary values are integer cents. Float basePrices from data files are
// converted to cents exactly once at the point of entry (addItem / calculateLineTotal).
// Subscribers are notified synchronously after every state mutation.
// Cart is persisted to localStorage on every mutation and restored on module init.
// ============================================================================

const CART_STORAGE_KEY = 'joy_curry_cart_v1';

/** @type {Array<CartLineItem>} */
let cart = [];

/** @type {Array<Function>} */
const subscribers = [];

// ============================================================================
// localStorage persistence
// ============================================================================

/**
 * Validate that a value from parsed JSON meets the CartLineItem shape.
 * Rejects the item (returns false) on any type violation so a corrupt
 * localStorage entry cannot inject unexpected values into the cart.
 *
 * @param {unknown} item
 * @returns {boolean}
 */
function isValidCartItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.cartItemId !== 'string' || item.cartItemId.length === 0) return false;
  if (typeof item.itemId !== 'string' || item.itemId.length === 0) return false;
  if (typeof item.name !== 'string' || item.name.length === 0) return false;
  if (!Number.isInteger(item.basePriceCents) || item.basePriceCents < 0) return false;
  if (!Number.isInteger(item.qty) || item.qty < 1) return false;
  if (!Number.isInteger(item.lineTotalCents) || item.lineTotalCents < 0) return false;
  if (item.selectedOptions !== null && typeof item.selectedOptions !== 'object') return false;
  // Bundle items carry slotSelections instead of modifier/size fields.
  if (item.selectedOptions?.isBundle === true) {
    if (!Array.isArray(item.selectedOptions.slotSelections)) return false;
  }
  return true;
}

function persistCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Storage quota exceeded or private-browsing restriction — non-fatal.
  }
}

function restoreCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    const valid = parsed.filter(isValidCartItem);
    if (valid.length !== parsed.length) {
      // Partial corruption: discard the entire payload to avoid a mismatched cart.
      localStorage.removeItem(CART_STORAGE_KEY);
      return;
    }
    cart = valid;
  } catch {
    // Malformed JSON or storage error — start with an empty cart.
    localStorage.removeItem(CART_STORAGE_KEY);
  }
}

// Restore persisted cart synchronously before any subscriber is registered.
restoreCart();

// ============================================================================
// Internal helpers
// ============================================================================

function notify() {
  persistCart();
  for (const fn of subscribers) {
    fn(getCart());
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Register a listener that is called with a copy of the cart after every
 * state change. Returns an unsubscribe function.
 *
 * @param {function(CartLineItem[]): void} fn
 * @returns {function(): void}
 */
export function subscribe(fn) {
  subscribers.push(fn);
  return () => {
    const idx = subscribers.indexOf(fn);
    if (idx !== -1) subscribers.splice(idx, 1);
  };
}

/**
 * Add a new line item to the cart.
 *
 * @param {object} item            - menu item object from data files (basePrice is float)
 * @param {object} selectedOptions - { size: string|null, modifiers: string[], protein: string|null, spice: string|null }
 * @param {number} qty             - positive integer
 */
export function addItem(item, selectedOptions, qty) {
  const lineTotalCents = calculateLineTotal(item, selectedOptions, qty);

  cart.push({
    cartItemId:      crypto.randomUUID(),
    itemId:          item.id,
    name:            item.name,
    basePriceCents:  Math.round(item.basePrice * 100),
    selectedOptions,
    qty,
    lineTotalCents,
  });

  notify();
}

/**
 * Remove a line item by its cartItemId.
 *
 * @param {string} cartItemId
 */
export function removeItem(cartItemId) {
  cart = cart.filter((li) => li.cartItemId !== cartItemId);
  notify();
}

/**
 * Update the quantity of a line item. Removes the item if newQty < 1.
 *
 * @param {string} cartItemId
 * @param {number} newQty
 */
export function updateQty(cartItemId, newQty) {
  if (newQty < 1) {
    removeItem(cartItemId);
    return;
  }
  cart = cart.map((li) => {
    if (li.cartItemId !== cartItemId) return li;
    const lineTotalCents = li.basePriceCents * newQty + getPriceDeltaCents(li.selectedOptions) * newQty;
    return { ...li, qty: newQty, lineTotalCents };
  });
  notify();
}

/**
 * Return a shallow copy of the cart array (prevents external mutation).
 *
 * @returns {CartLineItem[]}
 */
export function getCart() {
  return [...cart];
}

/**
 * Return the cart subtotal in integer cents.
 *
 * @returns {number}
 */
export function getSubtotalCents() {
  return cart.reduce((sum, li) => sum + li.lineTotalCents, 0);
}

/**
 * Return the number of individual items (sum of qtys) in the cart.
 *
 * @returns {number}
 */
export function getItemCount() {
  return cart.reduce((sum, li) => sum + li.qty, 0);
}

/** Empty the cart. */
export function clearCart() {
  cart = [];
  notify();
}

/**
 * Add a bundle (Dinner Special or Joy Combo) as a single cart line item.
 * Bundles have a flat basePrice; slotSelections carry the chosen items for
 * display in CartItem. No per-slot price delta — all pricing is in basePrice.
 *
 * @param {object} bundle          - bundle data object (basePrice is float dollars)
 * @param {Array}  slotSelections  - [{ slotId, slotLabel, itemIds, itemNames }]
 * @param {number} qty             - positive integer
 */
export function addBundleItem(bundle, slotSelections, qty) {
  const basePriceCents = Math.round(bundle.basePrice * 100);
  cart.push({
    cartItemId:      crypto.randomUUID(),
    itemId:          bundle.id,
    name:            bundle.name,
    basePriceCents,
    selectedOptions: { isBundle: true, slotSelections },
    qty,
    lineTotalCents:  basePriceCents * qty,
  });
  notify();
}

// ============================================================================
// Price computation — exported so options.js and app.js can preview totals.
// ============================================================================

/**
 * Compute the total price delta contributed by selectedOptions in cents.
 * Covers: size override, modifier priceDelta values.
 *
 * @param {object} selectedOptions
 * @returns {number} cents
 */
export function getPriceDeltaCents(selectedOptions) {
  if (!selectedOptions) return 0;
  let delta = 0;
  // Size overrides base price entirely — no delta from size here;
  // size is handled by passing the size price as the effective base in calculateLineTotal.
  // Modifiers add their priceDelta on top.
  if (Array.isArray(selectedOptions.modifierDeltas)) {
    for (const d of selectedOptions.modifierDeltas) {
      delta += d;
    }
  }
  return delta;
}

/**
 * Calculate the line total for a given item + options + qty, in integer cents.
 * This is the canonical price computation — all other callers delegate here.
 *
 * @param {object} item            - menu item object (basePrice is float dollars)
 * @param {object} selectedOptions - { sizePrice: number|null (float $), modifierDeltas: number[] (cents), ... }
 * @param {number} qty
 * @returns {number} integer cents
 */
export function calculateLineTotal(item, selectedOptions, qty) {
  // Effective unit price: size overrides base price if selected.
  const unitFloat = (selectedOptions?.sizePrice != null)
    ? selectedOptions.sizePrice
    : item.basePrice;

  const unitCents = Math.round(unitFloat * 100);
  const modifierCents = getPriceDeltaCents(selectedOptions);
  return (unitCents + modifierCents) * qty;
}
