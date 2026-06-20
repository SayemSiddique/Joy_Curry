// ============================================================================
// components/AdminPanel.js — Admin management panel (Phase 7F)
// Right-side drawer. Admin-only; shown only when role === 'admin'.
// Provides: in-stock toggle, deactivate (soft-delete), edit price/description,
// add new item.
// Prices are integer cents throughout; display-only via formatPrice().
// ============================================================================

import { formatPrice } from '../utils/formatters.js';
import {
  fetchAdminMenu,
  updateAdminMenuItem,
  toggleAdminItemStock,
  deactivateAdminMenuItem,
  createAdminMenuItem,
} from '../api/adminService.js';

const CATEGORIES = [
  'appetizer', 'salad', 'soup', 'vegetable-entree', 'vegan-entree',
  'chicken-entree', 'meat-entree', 'fish-shrimp', 'tandoori',
  'rice-biryani', 'express-lunch', 'side', 'condiment', 'bread',
  'dessert', 'beverage',
];

/** Cached menu items loaded from the admin endpoint. */
let _items = [];

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================================
// Rendering
// ============================================================================

function renderItemRow(item) {
  const priceDisplay = formatPrice(item.basePriceCents / 100);
  const stockLabel   = item.inStock ? 'In Stock' : 'Out';
  const stockClass   = item.inStock ? 'admin-badge admin-badge--in' : 'admin-badge admin-badge--out';
  const activeClass  = item.isActive ? '' : 'admin-row--inactive';

  return `
    <tr class="admin-row ${activeClass}" data-item-id="${escapeHtml(item.id)}">
      <td class="admin-td admin-td--name">
        <span class="admin-item-name">${escapeHtml(item.name)}</span>
        <span class="admin-item-cat">${escapeHtml(item.category)}</span>
      </td>
      <td class="admin-td admin-td--price">${escapeHtml(priceDisplay)}</td>
      <td class="admin-td admin-td--stock">
        <button
          class="admin-stock-btn ${stockClass}"
          data-action="toggle-stock"
          data-item-id="${escapeHtml(item.id)}"
          data-current="${item.inStock}"
          aria-label="${item.inStock ? 'Mark out of stock' : 'Mark in stock'} for ${escapeHtml(item.name)}"
        >${stockLabel}</button>
      </td>
      <td class="admin-td admin-td--actions">
        <button class="admin-action-btn" data-action="edit-item" data-item-id="${escapeHtml(item.id)}" aria-label="Edit ${escapeHtml(item.name)}">Edit</button>
        ${item.isActive
          ? `<button class="admin-action-btn admin-action-btn--danger" data-action="deactivate-item" data-item-id="${escapeHtml(item.id)}" aria-label="Deactivate ${escapeHtml(item.name)}">Deactivate</button>`
          : `<span class="admin-badge admin-badge--deactivated">Deactivated</span>`
        }
      </td>
    </tr>`;
}

function renderTable(items) {
  if (!items.length) {
    return '<p class="admin-empty">No menu items found.</p>';
  }
  const rows = items.map(renderItemRow).join('');
  return `
    <table class="admin-table">
      <thead>
        <tr>
          <th class="admin-th">Item</th>
          <th class="admin-th">Price</th>
          <th class="admin-th">Stock</th>
          <th class="admin-th">Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderAddForm() {
  const catOptions = CATEGORIES
    .map((c) => `<option value="${c}">${c}</option>`)
    .join('');
  return `
    <form id="admin-add-form" class="admin-form" novalidate>
      <h3 class="admin-form__title">Add New Item</h3>
      <div class="admin-form__row">
        <label class="admin-form__label" for="admin-new-id">ID (slug) *</label>
        <input class="admin-form__input" id="admin-new-id" name="id" type="text" placeholder="e.g. chicken-tikka-masala" required>
      </div>
      <div class="admin-form__row">
        <label class="admin-form__label" for="admin-new-name">Name *</label>
        <input class="admin-form__input" id="admin-new-name" name="name" type="text" placeholder="Chicken Tikka Masala" required>
      </div>
      <div class="admin-form__row">
        <label class="admin-form__label" for="admin-new-cat">Category *</label>
        <select class="admin-form__input" id="admin-new-cat" name="category" required>${catOptions}</select>
      </div>
      <div class="admin-form__row">
        <label class="admin-form__label" for="admin-new-price">Base Price ($) *</label>
        <input class="admin-form__input" id="admin-new-price" name="basePrice" type="number" min="0.01" step="0.01" placeholder="15.50" required>
      </div>
      <div class="admin-form__row">
        <label class="admin-form__label" for="admin-new-desc">Description</label>
        <textarea class="admin-form__input admin-form__textarea" id="admin-new-desc" name="description" placeholder="Optional description"></textarea>
      </div>
      <div class="admin-form__actions">
        <button type="submit" class="btn btn--primary btn--sm">Add Item</button>
        <button type="button" class="btn btn--secondary btn--sm" data-action="cancel-add">Cancel</button>
      </div>
      <p class="admin-form__error" id="admin-add-error" hidden></p>
    </form>`;
}

function renderEditForm(item) {
  return `
    <form id="admin-edit-form" class="admin-form" data-item-id="${escapeHtml(item.id)}" novalidate>
      <h3 class="admin-form__title">Edit: ${escapeHtml(item.name)}</h3>
      <div class="admin-form__row">
        <label class="admin-form__label" for="admin-edit-name">Name *</label>
        <input class="admin-form__input" id="admin-edit-name" name="name" type="text" value="${escapeHtml(item.name)}" required>
      </div>
      <div class="admin-form__row">
        <label class="admin-form__label" for="admin-edit-price">Base Price ($) *</label>
        <input class="admin-form__input" id="admin-edit-price" name="basePrice" type="number" min="0.01" step="0.01" value="${(item.basePriceCents / 100).toFixed(2)}" required>
      </div>
      <div class="admin-form__row">
        <label class="admin-form__label" for="admin-edit-desc">Description</label>
        <textarea class="admin-form__input admin-form__textarea" id="admin-edit-desc" name="description">${escapeHtml(item.description ?? '')}</textarea>
      </div>
      <div class="admin-form__actions">
        <button type="submit" class="btn btn--primary btn--sm">Save Changes</button>
        <button type="button" class="btn btn--secondary btn--sm" data-action="cancel-edit">Cancel</button>
      </div>
      <p class="admin-form__error" id="admin-edit-error" hidden></p>
    </form>`;
}

function renderContentInner() {
  return `
    <div class="admin-panel__toolbar">
      <button class="btn btn--primary btn--sm" data-action="show-add-form">+ Add Item</button>
      <button class="btn btn--secondary btn--sm" data-action="refresh-admin">Refresh</button>
    </div>
    <div id="admin-form-slot"></div>
    <div id="admin-table-slot"><p class="admin-loading">Loading items…</p></div>`;
}

// ============================================================================
// Public API — called from app.js
// ============================================================================

export function initAdminPanel() {
  const panel  = document.getElementById('admin-panel');
  if (!panel) return;

  panel.addEventListener('click', handlePanelClick);
  panel.addEventListener('submit', handlePanelSubmit);
}

export async function openAdminPanel() {
  const panel = document.getElementById('admin-panel');
  if (!panel) return;

  const contentEl = document.getElementById('admin-panel-content');
  if (contentEl) contentEl.innerHTML = renderContentInner();

  panel.classList.add('admin-panel--open');
  panel.removeAttribute('hidden');
  panel.querySelector('.admin-panel__close')?.focus();

  await loadAdminItems();
}

export function closeAdminPanel() {
  const panel = document.getElementById('admin-panel');
  if (!panel) return;
  panel.classList.remove('admin-panel--open');
}

// ============================================================================
// Data loading
// ============================================================================

async function loadAdminItems() {
  const tableSlot = document.getElementById('admin-table-slot');
  if (tableSlot) tableSlot.innerHTML = '<p class="admin-loading">Loading items…</p>';

  try {
    _items = await fetchAdminMenu();
    if (tableSlot) tableSlot.innerHTML = renderTable(_items);
  } catch (err) {
    if (tableSlot) tableSlot.innerHTML = `<p class="admin-error">Failed to load: ${escapeHtml(err.message)}</p>`;
  }
}

// ============================================================================
// Event handlers
// ============================================================================

function handlePanelClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const itemId = btn.dataset.itemId;

  switch (action) {
    case 'toggle-stock':
      handleToggleStock(itemId, btn.dataset.current === 'true');
      break;
    case 'edit-item':
      showEditForm(itemId);
      break;
    case 'deactivate-item':
      handleDeactivate(itemId);
      break;
    case 'show-add-form':
      showAddForm();
      break;
    case 'cancel-add':
    case 'cancel-edit':
      clearFormSlot();
      break;
    case 'refresh-admin':
      loadAdminItems();
      break;
  }
}

async function handlePanelSubmit(e) {
  e.preventDefault();
  const form = e.target;
  if (form.id === 'admin-add-form') await submitAddForm(form);
  if (form.id === 'admin-edit-form') await submitEditForm(form);
}

async function handleToggleStock(itemId, currentlyInStock) {
  const btn = document.querySelector(`[data-action="toggle-stock"][data-item-id="${CSS.escape(itemId)}"]`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = '…';
  }
  try {
    await toggleAdminItemStock(itemId, !currentlyInStock);
    const item = _items.find((i) => i.id === itemId);
    if (item) item.inStock = !currentlyInStock;
    refreshTableRow(itemId);
  } catch (err) {
    showRowError(itemId, err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function handleDeactivate(itemId) {
  const item = _items.find((i) => i.id === itemId);
  const name = item?.name ?? itemId;
  if (!confirm(`Deactivate "${name}"? It will no longer appear on the menu.`)) return;

  try {
    await deactivateAdminMenuItem(itemId);
    if (item) item.isActive = false;
    refreshTableRow(itemId);
  } catch (err) {
    showRowError(itemId, err.message);
  }
}

function showAddForm() {
  const slot = document.getElementById('admin-form-slot');
  if (slot) slot.innerHTML = renderAddForm();
  slot?.querySelector('#admin-new-id')?.focus();
}

function showEditForm(itemId) {
  const item = _items.find((i) => i.id === itemId);
  if (!item) return;
  const slot = document.getElementById('admin-form-slot');
  if (slot) slot.innerHTML = renderEditForm(item);
  slot?.querySelector('#admin-edit-name')?.focus();
}

function clearFormSlot() {
  const slot = document.getElementById('admin-form-slot');
  if (slot) slot.innerHTML = '';
}

async function submitAddForm(form) {
  const errEl = form.querySelector('#admin-add-error');
  const submitBtn = form.querySelector('[type="submit"]');

  const id          = form.querySelector('[name="id"]').value.trim();
  const name        = form.querySelector('[name="name"]').value.trim();
  const category    = form.querySelector('[name="category"]').value;
  const basePriceRaw = parseFloat(form.querySelector('[name="basePrice"]').value);
  const description = form.querySelector('[name="description"]').value.trim();

  if (!id || !name || !category || !basePriceRaw || basePriceRaw < 0.01) {
    showFormError(errEl, 'ID, name, category, and price ($) are required.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Adding…';
  hideFormError(errEl);

  try {
    const newItem = await createAdminMenuItem({ id, name, category, basePrice: basePriceRaw, description: description || undefined });
    _items.push(newItem);
    clearFormSlot();
    const tableSlot = document.getElementById('admin-table-slot');
    if (tableSlot) tableSlot.innerHTML = renderTable(_items);
  } catch (err) {
    showFormError(errEl, err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Item';
  }
}

async function submitEditForm(form) {
  const itemId  = form.dataset.itemId;
  const errEl   = form.querySelector('#admin-edit-error');
  const submitBtn = form.querySelector('[type="submit"]');

  const name        = form.querySelector('[name="name"]').value.trim();
  const basePriceRaw = parseFloat(form.querySelector('[name="basePrice"]').value);
  const description = form.querySelector('[name="description"]').value.trim();

  if (!name || !basePriceRaw || basePriceRaw < 0.01) {
    showFormError(errEl, 'Name and price ($) are required.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';
  hideFormError(errEl);

  try {
    const updated = await updateAdminMenuItem(itemId, { name, basePrice: basePriceRaw, description: description || undefined });
    const idx = _items.findIndex((i) => i.id === itemId);
    if (idx !== -1) _items[idx] = { ..._items[idx], ...updated };
    clearFormSlot();
    refreshTableRow(itemId);
  } catch (err) {
    showFormError(errEl, err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Changes';
  }
}

// ============================================================================
// DOM helpers
// ============================================================================

function refreshTableRow(itemId) {
  const item = _items.find((i) => i.id === itemId);
  if (!item) return;
  const row = document.querySelector(`.admin-row[data-item-id="${CSS.escape(itemId)}"]`);
  if (!row) {
    const tableSlot = document.getElementById('admin-table-slot');
    if (tableSlot) tableSlot.innerHTML = renderTable(_items);
    return;
  }
  const tmp = document.createElement('tbody');
  tmp.innerHTML = renderItemRow(item);
  row.replaceWith(tmp.firstElementChild);
}

function showRowError(itemId, message) {
  const row = document.querySelector(`.admin-row[data-item-id="${CSS.escape(itemId)}"]`);
  if (!row) return;
  const td = row.querySelector('.admin-td--actions');
  if (!td) return;
  const existing = td.querySelector('.admin-row-error');
  if (existing) existing.remove();
  const p = document.createElement('p');
  p.className = 'admin-row-error';
  p.textContent = message;
  td.appendChild(p);
  setTimeout(() => p.remove(), 5000);
}

function showFormError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.removeAttribute('hidden');
}

function hideFormError(el) {
  if (!el) return;
  el.setAttribute('hidden', '');
}
