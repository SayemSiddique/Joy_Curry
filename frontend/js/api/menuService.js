import { API_BASE_URL } from '../config/constants.js';

const FETCH_TIMEOUT_MS = 8000;

/**
 * The API stores and returns prices as integer cents (basePriceCents, priceCents,
 * priceDeltaCents). cartState.addItem() and options.js expect float-dollar fields
 * (basePrice, price, priceDelta) from the original JS data-file convention.
 * This function adds the float-dollar fields without removing the cents originals.
 */
function normalizeMenuItem(item) {
  return {
    ...item,
    basePrice:   item.basePriceCents / 100,
    sizeOptions: Array.isArray(item.sizeOptions)
      ? item.sizeOptions.map(s => ({ ...s, price: s.priceCents / 100 }))
      : null,
    modifiers: Array.isArray(item.modifiers)
      ? item.modifiers.map(m => ({ ...m, priceDelta: m.priceDeltaCents / 100 }))
      : null,
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('Request timed out. Please check your connection and try again.');
      e.code = 'TIMEOUT';
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function getMenu(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category)        params.set('category',   filters.category);
  if (filters.isVegan)         params.set('vegan',       'true');
  if (filters.isVegetarian)    params.set('vegetarian',  'true');
  if (filters.isGlutenFree)    params.set('glutenFree',  'true');
  if (filters.inStock != null) params.set('inStock',     String(filters.inStock));
  if (filters.search)          params.set('search',      filters.search);

  const qs  = params.toString();
  const res = await fetchWithTimeout(`${API_BASE_URL}/menu${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    const err = new Error(`Menu fetch failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  return json.data.map(normalizeMenuItem);
}

export async function getMenuItem(id) {
  const res = await fetchWithTimeout(`${API_BASE_URL}/menu/${encodeURIComponent(id)}`);
  if (!res.ok) {
    const err = new Error(`Menu item fetch failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  return normalizeMenuItem(json.data);
}
