/**
 * Weekly special configuration.
 *
 * The storefront "This Week's Special" banner is owner-curated: it shows ONLY
 * when a real special is configured here, so the restaurant never advertises a
 * discount it didn't authorize. Leave `CURRENT_SPECIAL` null to hide the banner
 * (the endpoint then returns `{ special: null }` — a clean 200, not a 404).
 *
 * To run a promotion, point `itemId` at a real menu item and set the discount
 * and expiry. The endpoint fills in the item's name/description/image.
 *
 * Example:
 *   export const CURRENT_SPECIAL = {
 *     itemId: 'chicken-tikka-masala',
 *     discountPct: 15,
 *     validUntil: '2026-07-31',
 *     blurb: 'Our most-loved dish, 15% off all week.',
 *   };
 */
export const CURRENT_SPECIAL = null;
