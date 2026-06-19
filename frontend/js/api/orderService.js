import { API_BASE_URL } from '../config/constants.js';
import { getToken } from '../state/authState.js';

function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Post a new order to the backend. Requires an authenticated session.
 *
 * @param {{
 *   deliveryType:    'delivery'|'pickup',
 *   deliveryAddress: string|null,
 *   items:           object[],
 *   idempotencyKey:  string,
 * }} payload
 * @returns {Promise<{ order: object, lineItems: object[] }>}
 */
export async function placeOrder({ deliveryType, deliveryAddress, items, idempotencyKey }) {
  const res = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ deliveryType, deliveryAddress, items, idempotencyKey }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message ?? 'Failed to place order');
    err.status  = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

/**
 * Fetch the authenticated user's full order history (newest first).
 * @returns {Promise<{ orders: object[] }>}
 */
export async function getOrderHistory() {
  const token = getToken();
  if (!token) {
    const err = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }

  const res = await fetch(`${API_BASE_URL}/orders/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message ?? 'Failed to load orders');
    err.status = res.status;
    throw err;
  }
  return data;
}
