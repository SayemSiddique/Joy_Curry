// ============================================================================
// components/MenuSection.js
// Pure component: takes a category display name + its items, returns a
// <section> HTML string containing the heading and a .menu-grid of MenuCards.
//
// Empty sections are omitted entirely (return '') so no orphan headings appear
// when filters remove every item in a category.
// ============================================================================

import { MenuCard } from './MenuCard.js';

/**
 * Render one full category section.
 *
 * @param {string} categoryName - human-readable heading, e.g. "Appetizers"
 * @param {string} categorySlug - id-safe anchor, e.g. "appetizers"
 * @param {object[]} items - array of menu item objects for this category
 * @returns {string} <section> HTML, or '' if items is empty
 */
export const MenuSection = (categoryName, categorySlug, items) => {
  if (!Array.isArray(items) || items.length === 0) return '';

  const cards = items.map((item) => MenuCard(item)).join('');

  return `
    <section id="${categorySlug}" class="section" aria-labelledby="title-${categorySlug}">
      <h2 id="title-${categorySlug}" class="section__title">${categoryName}</h2>
      <div class="menu-grid">
        ${cards}
      </div>
    </section>
  `;
};
