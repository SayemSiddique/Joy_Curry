// ============================================================================
// app.js — Joy Curry & Tandoor Ordering Website
// Entry point. Owns the DOM, filter state, and all event wiring.
// Components (MenuCard, MenuSection) are pure string builders — no DOM access.
// ============================================================================

import { getMenu } from './api/menuService.js';
import { getOrderHistory } from './api/orderService.js';
import { renderOrderHistory } from './components/OrderHistory.js';
import { getAuth, subscribe as subscribeAuth } from './state/authState.js';
import { dinnerSpecials } from './data/menu/dinner-specials.js';
import { joyCombos } from './data/menu/joy-combos.js';
import { MenuSection } from './components/MenuSection.js';
import { BundleCard } from './components/BundleCard.js';
import { buildBundleModal, getBundleSelections } from './components/BundleModal.js';
import {
  filterByQuery,
  filterByCategory,
  filterByDietary,
  filterBySpice,
  filterByMaxPrice,
} from './utils/filterUtils.js';
import {
  addItem,
  addBundleItem,
  removeItem,
  updateQty,
  getCart,
  getSubtotalCents,
  getItemCount,
  clearCart,
  subscribe,
  calculateLineTotal,
} from './state/cartState.js';
import { CartItem } from './components/CartItem.js';
import {
  hasOptions,
  buildOptionsModal,
  buildDefaultOptions,
  getSelectedOptions,
} from './options.js';
import { formatPrice } from './utils/formatters.js';
import { initCheckoutModal, openCheckoutModal } from './components/CheckoutModal.js';

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

// Populated after API fetch in initMenu(). Mutated once — then read-only.
let activeItems  = [];
let bundleItems  = [];

// Cached from the last getOrderHistory() call. Invalidated on logout or new order.
let _orderHistoryCache = [];

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

/**
 * Show N skeleton cards while real data renders. Called once on page load so
 * the layout is filled immediately — real cards replace them synchronously on
 * the next animation frame. On Phase 6 (async API fetch) this will remain
 * visible for the full network round-trip.
 *
 * @param {number} count - number of placeholder cards to render
 */
function renderSkeleton(count = 8) {
  const root = document.getElementById('menu-root');
  if (!root) return;

  const skeletonCard = `
    <article class="menu-card menu-card--skeleton" aria-hidden="true">
      <div class="menu-card__image"></div>
      <div class="menu-card__body">
        <h3 class="menu-card__name">&nbsp;</h3>
        <p class="menu-card__description">&nbsp;</p>
        <div class="menu-card__meta">&nbsp;</div>
      </div>
    </article>`;

  root.setAttribute('aria-busy', 'true');
  root.innerHTML = `<div class="menu-section">${skeletonCard.repeat(count)}</div>`;
}

function renderMenu() {
  const root = document.getElementById('menu-root');
  if (!root) return;

  root.setAttribute('aria-busy', 'true');

  let filtered;
  try {
    filtered = applyFilters(activeItems);
  } catch (err) {
    root.innerHTML = '<p class="state-error">Something went wrong loading the menu. Please refresh the page.</p>';
    root.setAttribute('aria-busy', 'false');
    console.error('[Joy Curry] Filter error:', err);
    return;
  }

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

  let html;
  try {
    html = CATEGORY_MAP
      .map(({ slug, label }) => MenuSection(label, slug, byCategory.get(slug) ?? []))
      .join('');
  } catch (err) {
    root.innerHTML = '<p class="state-error">Something went wrong rendering the menu. Please refresh the page.</p>';
    root.setAttribute('aria-busy', 'false');
    console.error('[Joy Curry] Render error:', err);
    return;
  }

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

function wireCategoryFilter() {
  const select = document.getElementById('category-filter');
  if (!select) return;

  select.addEventListener('change', (e) => {
    filterState.category = e.target.value;
    renderMenu();
  });
}

function wireDietaryToggles() {
  const group = document.getElementById('dietary-filter');
  if (!group) return;

  // Single event listener on the parent — event delegation per M3.6 mandate.
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-dietary]');
    if (!btn) return;

    const value = btn.dataset.dietary;
    const isActive = btn.getAttribute('aria-pressed') === 'true';

    // Click the active button → clear the filter (toggle off).
    const next = isActive ? null : value;
    filterState.dietary = next;

    // Sync aria-pressed on all buttons in the group.
    group.querySelectorAll('[data-dietary]').forEach((b) => {
      b.setAttribute('aria-pressed', b.dataset.dietary === next ? 'true' : 'false');
    });

    renderMenu();
  });
}

function wireSpiceFilter() {
  const select = document.getElementById('spice-filter');
  if (!select) return;

  select.addEventListener('change', (e) => {
    filterState.spice = e.target.value;
    renderMenu();
  });
}

function wirePriceFilter() {
  const range = document.getElementById('price-filter');
  const label = document.getElementById('price-filter-label');
  if (!range) return;

  range.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    filterState.maxPrice = value;
    if (label) label.textContent = `$${value % 1 === 0 ? value : value.toFixed(2)}`;
    renderMenu();
  });
}

function wireResetButton() {
  const btn = document.getElementById('reset-filters');
  if (!btn) return;

  btn.addEventListener('click', () => {
    // Reset state
    filterState.query    = '';
    filterState.category = 'all';
    filterState.dietary  = null;
    filterState.spice    = 'all';
    filterState.maxPrice = 25;

    // Sync DOM controls back to their default values
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    const categorySelect = document.getElementById('category-filter');
    if (categorySelect) categorySelect.value = 'all';

    const spiceSelect = document.getElementById('spice-filter');
    if (spiceSelect) spiceSelect.value = 'all';

    const priceRange = document.getElementById('price-filter');
    const priceLabel = document.getElementById('price-filter-label');
    if (priceRange) priceRange.value = '25';
    if (priceLabel) priceLabel.textContent = '$25';

    document.querySelectorAll('[data-dietary]').forEach((b) => {
      b.setAttribute('aria-pressed', 'false');
    });

    renderMenu();
  });
}

// ============================================================================
// Item lookup — keyed by item.id for O(1) access in event handlers.
// Populated after API fetch in initMenu().
// ============================================================================
let itemById = new Map();

// ============================================================================
// Options modal — open / close / price-preview wiring.
// The overlay shell lives in index.html; inner HTML is injected per item.
// ============================================================================

/** Currently open item — needed for price-preview recalculation on change. */
let _modalItem = null;

function openOptionsModal(item) {
  const overlay = document.getElementById('options-modal-overlay');
  if (!overlay) return;

  _modalItem = item;
  overlay.innerHTML = buildOptionsModal(item);
  overlay.classList.add('modal-overlay--visible');
  overlay.removeAttribute('hidden');
  // Move focus into the modal for keyboard accessibility.
  overlay.querySelector('#options-modal-close')?.focus();

  // Qty stepper — hidden input holds value; display span shows it.
  const qtyInput = overlay.querySelector('#options-qty');
  const qtyDisplay = overlay.querySelector('#options-qty-display');
  const setQty = (v) => {
    qtyInput.value = v;
    if (qtyDisplay) qtyDisplay.textContent = v;
    refreshPricePreview(overlay, item);
  };
  overlay.querySelector('#qty-dec')?.addEventListener('click', () => {
    setQty(Math.max(1, parseInt(qtyInput.value, 10) - 1));
  });
  overlay.querySelector('#qty-inc')?.addEventListener('click', () => {
    setQty(Math.min(20, parseInt(qtyInput.value, 10) + 1));
  });

    // Live price preview on any option change
  overlay.querySelector('#options-form')?.addEventListener('change', () => {
    refreshPricePreview(overlay, item);
  });

  // Close button
  overlay.querySelector('#options-modal-close')?.addEventListener('click', closeOptionsModal);

  // Click outside modal content to dismiss
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOptionsModal();
  });

  // Form submit → add to cart
  overlay.querySelector('#options-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formEl = overlay.querySelector('#options-form');
    const opts = getSelectedOptions(formEl, item);
    const { qty, ...selectedOptions } = opts;
    addItem(item, selectedOptions, qty);
    closeOptionsModal();
  });
}

function closeOptionsModal() {
  const overlay = document.getElementById('options-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('modal-overlay--visible');
  overlay.setAttribute('hidden', '');
  overlay.innerHTML = '';
  _modalItem = null;
}

function refreshPricePreview(overlay, item) {
  const formEl = overlay.querySelector('#options-form');
  if (!formEl) return;
  const opts = getSelectedOptions(formEl, item);
  const { qty, ...selectedOptions } = opts;
  const totalCents = calculateLineTotal(item, selectedOptions, qty);
  const preview = overlay.querySelector('#options-price-preview');
  if (preview) preview.textContent = formatPrice(totalCents / 100);
}

// ============================================================================
// Cart badge — kept in sync via cartState subscriber.
// ============================================================================

function updateCartBadge() {
  const badge = document.querySelector('.navbar__cart-count');
  if (!badge) return;
  const count = getItemCount();
  badge.textContent = count;
  const btn = document.querySelector('.navbar__cart-btn');
  if (btn) btn.setAttribute('aria-label', `Shopping cart, ${count} item${count !== 1 ? 's' : ''}`);
}

// ============================================================================
// "Add" button delegation — single listener on #menu-root.
// Items with options open the modal; plain items add directly.
// ============================================================================

function wireAddToCart() {
  const root = document.getElementById('menu-root');
  if (!root) return;

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="add-to-cart"]');
    if (!btn) return;

    const itemId = btn.dataset.itemId;
    const item = itemById.get(itemId);
    if (!item) return;

    if (hasOptions(item)) {
      openOptionsModal(item);
    } else {
      addItem(item, buildDefaultOptions(item), 1);
    }
  });
}

// ============================================================================
// Cart drawer — render + open/close + event delegation.
// Tax rate and delivery fee are business constants; integer-cent math only.
// ============================================================================

const TAX_RATE_BPS = 875;       // 8.75% expressed as basis points
const DELIVERY_CENTS = 300;     // $3.00 flat delivery fee

/**
 * Re-render the cart drawer items list and update all total fields.
 * Called by the cartState subscriber on every state change.
 *
 * @param {CartLineItem[]} cart
 */
function renderCartDrawer(cart) {
  const itemsList  = document.getElementById('cart-items-list');
  const subtotalEl = document.getElementById('cart-subtotal');
  const taxEl      = document.getElementById('cart-tax');
  const deliveryEl = document.getElementById('cart-delivery');
  const totalEl    = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('cart-checkout-btn');

  if (!itemsList) return;

  if (cart.length === 0) {
    itemsList.innerHTML = `
      <div class="cart-drawer__empty">
        <span class="cart-drawer__empty-icon">🛒</span>
        <p>Your order is empty.<br>Add a dish to get started.</p>
      </div>`;
  } else {
    itemsList.innerHTML = cart.map(CartItem).join('');
  }

  // All arithmetic in integer cents.
  const subtotalCents = cart.reduce((sum, li) => sum + li.lineTotalCents, 0);
  const taxCents      = Math.round(subtotalCents * TAX_RATE_BPS / 10000);
  const totalCents    = subtotalCents + taxCents + (cart.length > 0 ? DELIVERY_CENTS : 0);

  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotalCents / 100);
  if (taxEl)      taxEl.textContent      = formatPrice(taxCents / 100);
  if (deliveryEl) deliveryEl.textContent = cart.length > 0 ? formatPrice(DELIVERY_CENTS / 100) : '$0.00';
  if (totalEl)    totalEl.textContent    = formatPrice(totalCents / 100);
  if (checkoutBtn) checkoutBtn.disabled  = cart.length === 0;
}

function openCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;
  drawer.classList.add('cart-drawer--open');
  drawer.removeAttribute('hidden');
  drawer.querySelector('.cart-drawer__close')?.focus();
}

function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;
  drawer.classList.remove('cart-drawer--open');
}

function wireCartDrawer() {
  // Open on navbar cart button click.
  document.querySelector('.navbar__cart-btn')?.addEventListener('click', openCartDrawer);

  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;

  // Close button.
  drawer.querySelector('.cart-drawer__close')?.addEventListener('click', closeCartDrawer);

  // Checkout button — opens checkout modal and closes drawer.
  drawer.querySelector('#cart-checkout-btn')?.addEventListener('click', () => {
    closeCartDrawer();
    openCheckoutModal();
  });

  // Event delegation for remove and qty buttons inside the items list.
  drawer.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action      = btn.dataset.action;
    const cartItemId  = btn.dataset.cartItemId;
    if (!cartItemId) return;

    if (action === 'remove-item') {
      removeItem(cartItemId);
    } else if (action === 'qty-dec') {
      const currentQty = parseInt(
        btn.closest('.cart-item')?.querySelector('.cart-item__qty-value')?.textContent ?? '1',
        10
      );
      updateQty(cartItemId, currentQty - 1);
    } else if (action === 'qty-inc') {
      const currentQty = parseInt(
        btn.closest('.cart-item')?.querySelector('.cart-item__qty-value')?.textContent ?? '1',
        10
      );
      updateQty(cartItemId, currentQty + 1);
    }
  });
}

// ============================================================================
// Bundle sections — rendered into #bundle-root, independent of the filter state.
// Three sub-sections: Dinner Specials, Every Day Lunch Combos, Healthy Combos.
// ============================================================================

function buildBundleSection(label, slug, bundles) {
  if (!bundles.length) return '';
  const cards = bundles.map(BundleCard).join('');
  return `
    <section id="${slug}" class="section" aria-labelledby="title-${slug}">
      <h2 id="title-${slug}" class="section__title">${label}</h2>
      <div class="menu-grid">${cards}</div>
    </section>
  `;
}

function renderBundles() {
  const root = document.getElementById('bundle-root');
  if (!root) return;

  const dinnerSpecials  = bundleItems.filter((b) => b.type === 'dinner-special');
  const combosEveryday  = bundleItems.filter((b) => b.type === 'combo' && b.subcategory === 'everyday-lunch');
  const combosHealthy   = bundleItems.filter((b) => b.type === 'combo' && b.subcategory === 'healthy');

  root.innerHTML =
    buildBundleSection('Dinner Specials', 'dinner-special', dinnerSpecials) +
    buildBundleSection('Every Day Lunch Combos', 'combo-everyday', combosEveryday) +
    buildBundleSection('Healthy Combos', 'combo-healthy', combosHealthy);
}

// ============================================================================
// Bundle modal — open / close / constraint enforcement / form submit.
// Reuses #bundle-modal-overlay, a separate shell from the item options overlay.
// ============================================================================

let _modalBundle = null;

function openBundleModal(bundle) {
  const overlay = document.getElementById('bundle-modal-overlay');
  if (!overlay) return;

  _modalBundle = bundle;
  overlay.innerHTML = buildBundleModal(bundle, itemById);
  overlay.classList.add('modal-overlay--visible');
  overlay.removeAttribute('hidden');
  overlay.querySelector('#bundle-modal-close')?.focus();

  // Qty stepper
  const qtyInput   = overlay.querySelector('#bundle-qty');
  const qtyDisplay = overlay.querySelector('#bundle-qty-display');
  overlay.querySelector('#bundle-qty-dec')?.addEventListener('click', () => {
    const next = Math.max(1, parseInt(qtyInput.value, 10) - 1);
    qtyInput.value = next;
    if (qtyDisplay) qtyDisplay.textContent = next;
  });
  overlay.querySelector('#bundle-qty-inc')?.addEventListener('click', () => {
    const next = Math.min(20, parseInt(qtyInput.value, 10) + 1);
    qtyInput.value = next;
    if (qtyDisplay) qtyDisplay.textContent = next;
  });

  // Checkbox constraint: for slots where choose > 1, prevent selecting more than choose.
  overlay.querySelectorAll('fieldset[data-slot-choose]').forEach((fieldset) => {
    const choose = parseInt(fieldset.dataset.slotChoose, 10);
    if (choose <= 1) return; // radios handle single-selection natively
    fieldset.addEventListener('change', (e) => {
      if (!(e.target instanceof HTMLInputElement) || e.target.type !== 'checkbox') return;
      const checked = [...fieldset.querySelectorAll('input[type="checkbox"]:checked')];
      if (checked.length > choose) {
        e.target.checked = false; // Block the over-limit selection
      }
    });
  });

  // Close handlers
  overlay.querySelector('#bundle-modal-close')?.addEventListener('click', closeBundleModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeBundleModal();
  });

  // Form submit — validate all slots, then add to cart.
  overlay.querySelector('#bundle-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formEl = overlay.querySelector('#bundle-form');
    const result = getBundleSelections(formEl, bundle, itemById);
    if (!result) {
      showBundleValidationErrors(overlay, bundle, formEl);
      return;
    }
    addBundleItem(bundle, result.slotSelections, result.qty);
    closeBundleModal();
  });
}

function closeBundleModal() {
  const overlay = document.getElementById('bundle-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('modal-overlay--visible');
  overlay.setAttribute('hidden', '');
  overlay.innerHTML = '';
  _modalBundle = null;
}

/**
 * Mark unfilled slots with inline error text so the customer knows what's missing.
 * Errors are cleared on the next submit attempt if the slot is now satisfied.
 */
function showBundleValidationErrors(overlay, bundle, formEl) {
  const data = new FormData(formEl);
  for (const slot of (bundle.slots ?? [])) {
    const fieldset = overlay.querySelector(`fieldset[data-slot-id="${slot.id}"]`);
    if (!fieldset) continue;

    const isSatisfied = slot.choose === 1
      ? Boolean(data.get(`slot-${slot.id}`))
      : data.getAll(`slot-${slot.id}`).length === slot.choose;

    let errEl = fieldset.querySelector('.slot-validation-error');
    if (!isSatisfied) {
      if (!errEl) {
        errEl = document.createElement('p');
        errEl.className = 'slot-validation-error';
        errEl.style.cssText = 'color:var(--color-error,#c0392b);font-size:var(--font-size-sm);margin-top:var(--spacing-xs);';
        fieldset.appendChild(errEl);
      }
      errEl.textContent = slot.choose === 1
        ? `Please choose 1 ${slot.label}.`
        : `Please choose exactly ${slot.choose} ${slot.label}.`;
    } else if (errEl) {
      errEl.remove();
    }
  }
}

// ============================================================================
// Bundle card click delegation — single listener on #bundle-root.
// ============================================================================

function wireBundleCards() {
  const root = document.getElementById('bundle-root');
  if (!root) return;

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action   = btn.dataset.action;
    const bundleId = btn.dataset.bundleId;
    if (!bundleId) return;

    const bundle = itemById.get(bundleId);
    if (!bundle) return;

    if (action === 'open-bundle-modal') {
      openBundleModal(bundle);
    } else if (action === 'add-bundle-direct') {
      addBundleItem(bundle, [], 1);
    }
  });
}

// ============================================================================
// Order History Drawer (Phase 7D — M7.6)
// Slides in from the left. Fetches GET /api/orders/me on open.
// ============================================================================

async function openOrderHistoryDrawer() {
  const drawer  = document.getElementById('order-history-drawer');
  const content = document.getElementById('order-history-content');
  if (!drawer || !content) return;

  drawer.classList.add('order-history-drawer--open');
  drawer.setAttribute('aria-hidden', 'false');
  content.innerHTML = '<p class="order-history__loading">Loading your orders…</p>';

  try {
    const { orders } = await getOrderHistory();
    _orderHistoryCache = orders;
    content.innerHTML = renderOrderHistory(orders);
  } catch {
    content.innerHTML = '<p class="order-history__error">Unable to load orders. Please try again.</p>';
  }
}

function closeOrderHistoryDrawer() {
  const drawer = document.getElementById('order-history-drawer');
  if (!drawer) return;
  drawer.classList.remove('order-history-drawer--open');
  drawer.setAttribute('aria-hidden', 'true');
}

function wireOrderHistoryDrawer() {
  document.getElementById('navbar-orders-btn')?.addEventListener('click', openOrderHistoryDrawer);

  const drawer = document.getElementById('order-history-drawer');
  if (!drawer) return;

  drawer.querySelector('.order-history-drawer__close')?.addEventListener('click', closeOrderHistoryDrawer);

  // Event delegation for "Reorder" buttons inside the drawer.
  drawer.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="reorder"]');
    if (!btn) return;
    const orderId = btn.dataset.orderId;
    if (orderId) handleReorder(orderId, btn);
  });

  // After a successful checkout, invalidate cache (refresh if drawer is open).
  document.addEventListener('joy-curry:order-placed', () => {
    if (drawer.classList.contains('order-history-drawer--open')) {
      openOrderHistoryDrawer();
    } else {
      _orderHistoryCache = [];
    }
  });
}

// ============================================================================
// Reorder (Phase 7D — M7.7)
// Rebuilds the cart from a past order using current menu prices and stock.
// Items that are no longer active or in stock are skipped with a notice.
// ============================================================================

async function handleReorder(orderId, triggerBtn) {
  const order = _orderHistoryCache.find(o => o.id === orderId);
  if (!order) return;

  const originalLabel = triggerBtn?.textContent;
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = 'Adding…';
  }

  try {
    const skipped = [];
    clearCart();

    for (const li of (order.lineItems ?? [])) {
      const menuItem = itemById.get(li.item_id);

      if (!menuItem || menuItem.isActive === false || menuItem.inStock === false) {
        skipped.push(li.item_name);
        continue;
      }

      if (li.item_type === 'bundle') {
        addBundleItem(menuItem, li.slotChoices ?? [], li.qty);
      } else {
        addItem(menuItem, li.selectedOptions ?? null, li.qty);
      }
    }

    closeOrderHistoryDrawer();
    openCartDrawer();

    if (skipped.length > 0) {
      const notice = document.createElement('p');
      notice.className = 'cart-drawer__reorder-notice';
      notice.textContent = `Skipped (unavailable): ${skipped.join(', ')}`;
      const header = document.querySelector('.cart-drawer__header');
      header?.querySelector('.cart-drawer__reorder-notice')?.remove();
      header?.appendChild(notice);
      setTimeout(() => notice.remove(), 6000);
    }
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = originalLabel;
    }
  }
}

// ============================================================================
// Auth state — show/hide "My Orders" navbar button based on login status.
// ============================================================================

function wireAuthState() {
  const ordersBtn = document.getElementById('navbar-orders-btn');

  subscribeAuth(({ isLoggedIn }) => {
    if (!ordersBtn) return;
    if (isLoggedIn) {
      ordersBtn.removeAttribute('hidden');
    } else {
      ordersBtn.setAttribute('hidden', '');
      closeOrderHistoryDrawer();
      _orderHistoryCache = [];
    }
  });

  // Sync to initial auth state (token may already be restored from localStorage).
  if (getAuth().isLoggedIn && ordersBtn) {
    ordersBtn.removeAttribute('hidden');
  }
}

// ============================================================================
// Bootstrap
// ============================================================================

async function initMenu() {
  renderSkeleton();
  const menu = await getMenu();
  activeItems = menu.filter((item) => item.isActive !== false);
  // Bundles are authored JS data, not served by the API — load them directly.
  bundleItems = [...dinnerSpecials, ...joyCombos].filter((b) => b.isActive !== false);
  // itemById covers API items (for slot name lookup) and bundles (for modal/cart).
  itemById = new Map([
    ...menu.map((item) => [item.id, item]),
    ...bundleItems.map((b) => [b.id, b]),
  ]);
}

document.addEventListener('DOMContentLoaded', async () => {
  subscribe(updateCartBadge);
  subscribe(renderCartDrawer);

  try {
    await initMenu();
    renderMenu();
    renderBundles();
    wireSearchInput();
    wireCategoryFilter();
    wireDietaryToggles();
    wireSpiceFilter();
    wirePriceFilter();
    wireResetButton();
    wireAddToCart();
    wireCartDrawer();
    wireBundleCards();
    initCheckoutModal();
    wireOrderHistoryDrawer();
    wireAuthState();
    updateCartBadge();
    renderCartDrawer(getCart());
  } catch (err) {
    const root = document.getElementById('menu-root');
    if (root) {
      root.innerHTML = '<p class="state-error">Unable to load the menu. Please check that the server is running and refresh the page.</p>';
      root.setAttribute('aria-busy', 'false');
    }
    console.error('[Joy Curry] Init error:', err);
  }
});
