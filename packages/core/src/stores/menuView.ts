import { atom } from 'nanostores';

// ── Category-first menu navigation (M2) ──────────────────────────────────────
// Tracks which menu category is "current" on the /order page so the Category
// Rail chips and the on-scroll spy stay in sync. Pure view state — no fetch,
// no persistence. Consumed by islands via the shared `useNano()` helper.

/** Active category id (e.g. "tandoori"), or '' when none is highlighted. */
export const activeCategory = atom<string>('');

export function setActiveCategory(id: string): void {
  if (activeCategory.get() !== id) activeCategory.set(id);
}

/** DOM id of a category's <MenuSection>. Single source of truth for anchors. */
export function sectionId(categoryId: string): string {
  return `cat-${categoryId}`;
}

/**
 * Parse a deep-link target from the URL: `?category=tandoori` or `#cat-tandoori`.
 * Returns the bare category id, or '' if none present. Hash wins over query.
 */
export function deepLinkCategory(): string {
  if (typeof window === 'undefined') return '';
  const hash = window.location.hash.replace(/^#/, '');
  if (hash.startsWith('cat-')) return hash.slice(4);
  const param = new URLSearchParams(window.location.search).get('category');
  return param ?? '';
}
