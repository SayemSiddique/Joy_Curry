// ============================================================================
// utils/filterUtils.js
// Pure filter functions for the menu — no DOM access, no side effects.
// Each function takes an items array and returns a new filtered array.
// app.js composes these in applyFilters() against filterState.
// ============================================================================

/**
 * Filter items by a free-text query.
 * Matches against: name, description, searchKeywords[], and category.
 * Case-insensitive; partial match on any field wins.
 *
 * @param {object[]} items - array of menu item objects
 * @param {string}   query - raw string from the search input
 * @returns {object[]} filtered subset (original array if query is blank)
 */
export const filterByQuery = (items, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  return items.filter((item) => {
    if (item.name.toLowerCase().includes(q)) return true;
    if (item.description && item.description.toLowerCase().includes(q)) return true;
    if (item.category.toLowerCase().includes(q)) return true;
    if (
      Array.isArray(item.searchKeywords) &&
      item.searchKeywords.some((kw) => kw.toLowerCase().includes(q))
    ) return true;
    return false;
  });
};

// ----------------------------------------------------------------------------
// Chunk C stubs — placeholder signatures so app.js can compose them now.
// Each will be fully implemented in Chunk C (M3.5).
// ----------------------------------------------------------------------------

/**
 * Filter by category slug.
 * @param {object[]} items
 * @param {string}   category - slug or 'all'
 * @returns {object[]}
 */
export const filterByCategory = (items, category) =>
  category === 'all' ? items : items.filter((item) => item.category === category);

/**
 * Filter by dietary preference.
 * @param {object[]} items
 * @param {string|null} dietary - 'veg' | 'vegan' | 'nonveg' | null
 * @returns {object[]}
 */
export const filterByDietary = (items, dietary) => {
  if (!dietary) return items;
  if (dietary === 'vegan')  return items.filter((item) => item.isVegan);
  if (dietary === 'veg')    return items.filter((item) => item.isVegetarian && !item.isVegan);
  if (dietary === 'nonveg') return items.filter((item) => !item.isVegetarian && !item.isVegan);
  return items;
};

/**
 * Filter by spice level.
 * @param {object[]} items
 * @param {string}   spice - 'Mild' | 'Medium' | 'Hot' | 'null' | 'all'
 * @returns {object[]}
 */
export const filterBySpice = (items, spice) => {
  if (spice === 'all') return items;
  const target = spice === 'null' ? null : spice;
  return items.filter((item) => item.spiceLevel === target);
};

/**
 * Filter by maximum price.
 * @param {object[]} items
 * @param {number}   maxPrice - upper bound in USD (float, per Phase 1 data convention)
 * @returns {object[]}
 */
export const filterByMaxPrice = (items, maxPrice) =>
  items.filter((item) => item.basePrice <= maxPrice);
