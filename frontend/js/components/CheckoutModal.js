// ============================================================================
// components/CheckoutModal.js — Joy Curry & Tandoor
// Owns the checkout modal overlay: open/close, form validation, order summary
// render, API submission, real confirmation screen, and cart clear on success.
// No DOM mutations outside the #checkout-overlay element.
// ============================================================================

import {
  getCart,
  getSubtotalCents,
  clearCart,
  subscribe,
} from '../state/cartState.js';
import { validateCheckoutForm } from '../utils/validators.js';
import { formatPrice } from '../utils/formatters.js';
import { TAX_RATE, DELIVERY_FEE } from '../config/constants.js';
import { placeOrder } from '../api/orderService.js';
import { getAuth } from '../state/authState.js';

// ============================================================================
// DOM references (resolved once at init)
// ============================================================================
/** @type {HTMLElement} */
let overlay;
/** @type {HTMLElement} */
let modal;
/** @type {HTMLFormElement} */
let form;
/** @type {HTMLElement} */
let summaryPanel;
/** @type {HTMLButtonElement} */
let submitBtn;

// ============================================================================
// Helpers
// ============================================================================

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Format integer cents as a USD display string. */
function centsToDisplay(cents) {
  return formatPrice(cents / 100);
}

/**
 * Apply or clear inline validation error on a single field.
 * Looks for a sibling `.form-error-msg` element inside the same `.form-group`.
 *
 * @param {string} fieldId
 * @param {{ valid: boolean, message: string }} result
 */
function applyFieldError(fieldId, result) {
  const field = form.querySelector(`#${fieldId}`);
  if (!field) return;
  const group = field.closest('.form-group');
  if (!group) return;

  let errEl = group.querySelector('.form-error-msg');

  if (!result.valid) {
    field.classList.add('form-input--error');
    field.setAttribute('aria-invalid', 'true');
    if (!errEl) {
      errEl = document.createElement('span');
      errEl.className = 'form-error-msg';
      errEl.setAttribute('role', 'alert');
      group.appendChild(errEl);
    }
    errEl.textContent = result.message;
  } else {
    field.classList.remove('form-input--error');
    field.removeAttribute('aria-invalid');
    if (errEl) errEl.textContent = '';
  }
}

/** Clear all inline errors from the form. */
function clearFormErrors() {
  form.querySelectorAll('.form-input--error').forEach(el => {
    el.classList.remove('form-input--error');
    el.removeAttribute('aria-invalid');
  });
  form.querySelectorAll('.form-error-msg').forEach(el => {
    el.textContent = '';
  });
  const globalErr = form.querySelector('.checkout-form__global-error');
  if (globalErr) globalErr.textContent = '';
}

/** Show a form-level (non-field) error message. */
function showFormError(message) {
  let errEl = form.querySelector('.checkout-form__global-error');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.className = 'checkout-form__global-error';
    errEl.setAttribute('role', 'alert');
    form.insertBefore(errEl, form.firstChild);
  }
  errEl.textContent = message;
}

/** Read the currently selected order type radio. @returns {'delivery'|'pickup'} */
function getOrderType() {
  const checked = form.querySelector('input[name="order-type"]:checked');
  return /** @type {'delivery'|'pickup'} */ (checked?.value ?? 'delivery');
}

/** Compute total cents from current cart state and order type. */
function computeTotalCents(orderType) {
  const subtotalCents = getSubtotalCents();
  const deliveryCents = orderType === 'delivery' ? Math.round(DELIVERY_FEE * 100) : 0;
  const taxCents      = Math.round(subtotalCents * TAX_RATE);
  return { subtotalCents, taxCents, deliveryCents, totalCents: subtotalCents + taxCents + deliveryCents };
}

/** Enable or disable the submit button and update its label. */
function setSubmitting(loading) {
  if (!submitBtn) return;
  submitBtn.disabled = loading;
  if (loading) {
    submitBtn.textContent = 'Placing order…';
  } else {
    renderSummary();
  }
}

// ============================================================================
// Order Summary rendering
// ============================================================================

function renderSummary() {
  const cart = getCart();
  const orderType = getOrderType();
  const { subtotalCents, taxCents, deliveryCents, totalCents } = computeTotalCents(orderType);

  const itemRows = cart.map(line => `
    <div class="checkout-summary__row">
      <span>${line.qty}&times; ${escapeHtml(line.name)}${line.selectedOptions?.sizeLabel ? ` (${escapeHtml(line.selectedOptions.sizeLabel)})` : ''}</span>
      <span>${centsToDisplay(line.lineTotalCents)}</span>
    </div>
  `).join('');

  summaryPanel.innerHTML = `
    <h3 class="checkout-summary__heading">Order Summary</h3>
    <div class="checkout-summary__items">${itemRows}</div>
    <hr class="divider">
    <div class="checkout-summary__row">
      <span>Subtotal</span><span>${centsToDisplay(subtotalCents)}</span>
    </div>
    <div class="checkout-summary__row">
      <span>Tax (8.75%)</span><span>${centsToDisplay(taxCents)}</span>
    </div>
    <div class="checkout-summary__row">
      <span>Delivery</span>
      <span>${orderType === 'delivery' ? centsToDisplay(deliveryCents) : 'Free (Pickup)'}</span>
    </div>
    <hr class="divider">
    <div class="checkout-summary__row checkout-summary__row--total">
      <span>Total</span><span>${centsToDisplay(totalCents)}</span>
    </div>
  `;

  if (submitBtn) {
    submitBtn.textContent = `Place Order — ${centsToDisplay(totalCents)}`;
  }
}

// ============================================================================
// Confirmation screen
// ============================================================================

/**
 * Replace modal body with a confirmation panel.
 * @param {{ name: string, orderType: 'delivery'|'pickup', totalCents: number, orderId: string }} details
 */
function renderConfirmation(details) {
  const body = modal.querySelector('.checkout-modal__body');
  if (!body) return;

  const orderIdLine = details.orderId
    ? `<p class="checkout-confirmation__order-id">Order <strong>#${escapeHtml(details.orderId)}</strong></p>`
    : '';

  body.innerHTML = `
    <div class="checkout-confirmation" role="status" aria-live="polite">
      <div class="checkout-confirmation__icon" aria-hidden="true">✓</div>
      <h3 class="checkout-confirmation__title">Order Received!</h3>
      ${orderIdLine}
      <p class="checkout-confirmation__msg">
        Thank you, <strong>${escapeHtml(details.name)}</strong>. Your order has been placed successfully.
      </p>
      <p class="checkout-confirmation__detail">
        ${details.orderType === 'delivery'
          ? 'Estimated delivery: <strong>30–45 minutes</strong>'
          : 'Ready for pickup in <strong>15–20 minutes</strong>'}
      </p>
      <p class="checkout-confirmation__total">
        Order total: <strong>${centsToDisplay(details.totalCents)}</strong>
      </p>
      <p class="checkout-confirmation__contact">
        Questions? Call us at <a href="tel:+12124901277">212-490-1277</a>.
      </p>
      <button class="btn btn--primary checkout-confirmation__close-btn" type="button">
        Back to Menu
      </button>
    </div>
  `;

  body.querySelector('.checkout-confirmation__close-btn').addEventListener('click', closeCheckoutModal);
}

// ============================================================================
// Open / Close
// ============================================================================

export function openCheckoutModal() {
  if (!overlay) return;

  form.reset();
  clearFormErrors();
  renderSummary();

  const body = modal.querySelector('.checkout-modal__body');
  if (body && !body.contains(form)) {
    body.innerHTML = '';
    body.appendChild(form);
    body.appendChild(summaryPanel);
  }

  overlay.classList.add('modal-overlay--visible');
  overlay.removeAttribute('aria-hidden');
  overlay.setAttribute('aria-modal', 'true');

  requestAnimationFrame(() => {
    form.querySelector('input, textarea, select')?.focus();
  });
}

export function closeCheckoutModal() {
  if (!overlay) return;
  overlay.classList.remove('modal-overlay--visible');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.removeAttribute('aria-modal');
}

// ============================================================================
// Form submission
// ============================================================================

async function handleSubmit(e) {
  e.preventDefault();

  clearFormErrors();

  const orderType = getOrderType();
  const fields = {
    name:      form.querySelector('#checkout-name')?.value  ?? '',
    phone:     form.querySelector('#checkout-phone')?.value ?? '',
    email:     form.querySelector('#checkout-email')?.value ?? '',
    address:   form.querySelector('#checkout-address')?.value ?? '',
    orderType,
  };

  // Field-level validation
  const results = validateCheckoutForm(fields);
  let allValid = true;
  for (const [fieldId, result] of Object.entries(results)) {
    applyFieldError(fieldId, result);
    if (!result.valid) allValid = false;
  }
  if (!allValid) {
    form.querySelector('.form-input--error')?.focus();
    return;
  }

  // Auth guard — backend requires JWT on POST /api/orders
  const { isLoggedIn } = getAuth();
  if (!isLoggedIn) {
    showFormError('Please log in to place your order. Create an account or sign in at the top of the page.');
    return;
  }

  // Build order payload from current cart state
  const cart = getCart();
  const { totalCents } = computeTotalCents(orderType);

  // Use lineTotalCents / qty as the effective unit price so that size overrides
  // and modifier deltas are captured in the stored base_price_cents on the backend.
  const items = cart.map(li => ({
    itemId:          li.itemId,
    itemName:        li.name,
    itemType:        li.selectedOptions?.isBundle ? 'bundle' : 'regular',
    basePriceCents:  Math.round(li.lineTotalCents / li.qty),
    qty:             li.qty,
    selectedOptions: li.selectedOptions?.isBundle ? null : (li.selectedOptions ?? null),
    slotChoices:     li.selectedOptions?.isBundle ? (li.selectedOptions.slotSelections ?? null) : null,
  }));

  setSubmitting(true);

  try {
    const { order } = await placeOrder({
      deliveryType:    orderType,
      deliveryAddress: orderType === 'delivery' ? (fields.address.trim() || null) : null,
      items,
      idempotencyKey:  crypto.randomUUID(),
    });

    clearCart();
    renderConfirmation({
      name:      fields.name.trim(),
      orderType,
      totalCents,
      orderId:   order.id,
    });

    // Signal app.js to refresh order history if open
    document.dispatchEvent(new CustomEvent('joy-curry:order-placed'));

  } catch (err) {
    setSubmitting(false);
    const msg = err.status === 401
      ? 'Your session has expired. Please log in again to place your order.'
      : (err.message || 'Unable to place order. Please try again.');
    showFormError(msg);
  }
}

// ============================================================================
// Order type change — address required state + summary update
// ============================================================================

function handleOrderTypeChange() {
  const orderType = getOrderType();
  const addressGroup = form.querySelector('#checkout-address')?.closest('.form-group');

  if (addressGroup) {
    const label = addressGroup.querySelector('.form-label');
    const input = addressGroup.querySelector('#checkout-address');
    if (orderType === 'delivery') {
      input?.setAttribute('required', '');
      if (label && !label.textContent.includes('*')) {
        label.textContent = label.textContent.replace(' (optional)', '') + ' *';
      }
    } else {
      input?.removeAttribute('required');
      if (label) {
        label.textContent = label.textContent.replace(' *', '') + ' (optional)';
      }
    }
  }

  renderSummary();
}

// ============================================================================
// Keyboard trap (Escape to close)
// ============================================================================

function handleKeydown(e) {
  if (e.key === 'Escape' && overlay.classList.contains('modal-overlay--visible')) {
    closeCheckoutModal();
  }
}

// ============================================================================
// Init — called once from app.js
// ============================================================================

export function initCheckoutModal() {
  overlay = document.querySelector('.modal-overlay[aria-label="Checkout"]');
  if (!overlay) return;

  modal        = overlay.querySelector('.checkout-modal');
  form         = overlay.querySelector('.checkout-form');
  submitBtn    = overlay.querySelector('.checkout-modal__submit');
  summaryPanel = overlay.querySelector('.checkout-modal__summary');

  if (!modal || !form || !summaryPanel) return;

  const demoErrorGroup = form.querySelector('#checkout-email-demo')?.closest('.form-group');
  if (demoErrorGroup) demoErrorGroup.remove();

  const emailInput = form.querySelector('#checkout-email');
  if (!emailInput) {
    const emailGroup = document.createElement('div');
    emailGroup.className = 'form-group';
    emailGroup.innerHTML = `
      <label class="form-label" for="checkout-email">Email Address *</label>
      <input class="form-input" type="email" id="checkout-email" placeholder="you@example.com" required>
    `;
    submitBtn.insertAdjacentElement('beforebegin', emailGroup);
  }

  modal.querySelector('.navbar__nav-close')?.addEventListener('click', closeCheckoutModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCheckoutModal();
  });

  form.querySelectorAll('input[name="order-type"]').forEach(radio => {
    radio.addEventListener('change', handleOrderTypeChange);
  });

  form.addEventListener('submit', handleSubmit);

  document.addEventListener('keydown', handleKeydown);

  subscribe(() => {
    if (overlay.classList.contains('modal-overlay--visible')) {
      renderSummary();
    }
  });
}
