import { API_BASE_URL } from '../config/constants.js';
import { getToken } from '../state/authState.js';

const BASE = `${API_BASE_URL}/admin`;

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

async function adminFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: authHeaders(),
  });
  const body = await res.json();
  if (!res.ok) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body.data;
}

/** GET /api/admin/menu — all items including inactive (not hard-deleted). */
export async function fetchAdminMenu() {
  return adminFetch('/menu');
}

/**
 * PUT /api/admin/menu/:id — update name, description, basePrice, etc.
 * @param {string} id
 * @param {{ name?: string, description?: string, basePrice?: number, isActive?: boolean }} fields
 */
export async function updateAdminMenuItem(id, fields) {
  return adminFetch(`/menu/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  });
}

/**
 * PATCH /api/admin/menu/:id/stock — toggle in-stock flag.
 * @param {string} id
 * @param {boolean} inStock
 */
export async function toggleAdminItemStock(id, inStock) {
  return adminFetch(`/menu/${encodeURIComponent(id)}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ inStock }),
  });
}

/**
 * DELETE /api/admin/menu/:id — soft-delete (sets is_active=0, deleted_at).
 * The item disappears from all customer-facing queries permanently.
 * @param {string} id
 */
export async function deactivateAdminMenuItem(id) {
  return adminFetch(`/menu/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/**
 * POST /api/admin/menu — create a new menu item.
 * @param {{ id: string, name: string, category: string, basePrice: number, description?: string }} data
 */
export async function createAdminMenuItem(data) {
  return adminFetch('/menu', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
