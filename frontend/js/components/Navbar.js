// ============================================================================
// components/Navbar.js
// Thin DOM-mutation helpers for the static navbar in index.html.
//
// The navbar markup itself is static (authored in Phase 2). These functions
// update dynamic parts: the cart count badge. Kept minimal for Phase 3 —
// cart logic arrives in Phase 4; search lives in the toolbar, not the navbar.
// ============================================================================

/**
 * Update the cart count badge in the navbar.
 * Hides the badge when count is 0 to reduce visual noise.
 *
 * @param {number} count - number of items in the cart
 */
export const updateCartCount = (count) => {
  const badge = document.querySelector('.navbar__cart-count');
  if (!badge) return;

  const safeCount = Math.max(0, Number.isFinite(count) ? Math.floor(count) : 0);
  badge.textContent = String(safeCount);
  badge.setAttribute(
    'aria-label',
    safeCount === 0 ? 'Shopping cart, empty' : `Shopping cart, ${safeCount} item${safeCount === 1 ? '' : 's'}`
  );
  badge.style.display = safeCount === 0 ? 'none' : '';
};
