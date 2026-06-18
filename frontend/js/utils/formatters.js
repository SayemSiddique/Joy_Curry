// ============================================================================
// utils/formatters.js
// Shared, pure display helpers used throughout the Joy Curry app.
//
// Scope: DISPLAY only. These operate on the float basePrice values that live
// in the Phase 1 JS data files (locked decision — see Roadmap §10). Currency
// MATH for storage and checkout uses integer cents at the Phase 5 database
// boundary (seed.js), not here. These functions never mutate input and never
// perform money arithmetic — they only format for presentation.
// ============================================================================

/**
 * Format a numeric price as a USD currency string for display.
 * Intl.NumberFormat rounds to the currency's minor-unit digits (2 for USD),
 * so float artifacts in the source value do not leak into the UI.
 *
 * @param {number} price - price in USD (float, per the Phase 1 data convention)
 * @returns {string} e.g. "$15.50"; "—" when the input is not a finite number
 */
export const formatPrice = (price) => {
  if (typeof price !== 'number' || !Number.isFinite(price)) {
    return '—';
  }
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
};

/**
 * Format a spice level as a pepper-emoji indicator for display.
 *
 * @param {'Mild'|'Medium'|'Hot'|null} level - fixed spice property of a dish
 * @returns {string} pepper icons, or '—' when unspecified
 */
export const formatSpiceLevel = (level) => {
  const icons = {
    Mild: '🌶️',
    Medium: '🌶️🌶️',
    Hot: '🌶️🌶️🌶️',
  };
  return icons[level] ?? '—';
};

/**
 * Format a timestamp as a UTC date-time string for display.
 *
 * UTC discipline: timestamps are stored and transmitted in UTC (data-primitives
 * mandate). This formatter reads the UTC components directly — never the local
 * timezone — so displayed times do not drift per the viewer's locale.
 *
 * @param {Date|string|number} date - a Date instance, ISO 8601 string, or epoch ms
 * @returns {string} e.g. "2026-06-18 12:00 UTC"; "—" when the input is invalid
 */
export const formatDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    return '—';
  }
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
};
