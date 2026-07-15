import type { CartItem } from './stores/cart';

export interface UpsellSuggestion {
  itemId: string;
  name: string;
  reason: string;
  priceCents: number;
  emoji: string;
}

// Category → suggested add-ons. itemId values must match real menu item IDs.
// Keep as a static rule table; no AI needed for this signal.
const RULES: { matchCategory: string[]; suggestions: Omit<UpsellSuggestion, 'reason'>[] }[] = [
  {
    matchCategory: ['chicken-entree', 'meat-entree', 'fish-shrimp', 'tandoori'],
    suggestions: [
      { itemId: 'garlic-naan',   name: 'Garlic Naan',         priceCents: 399,  emoji: '🫓' },
      { itemId: 'basmati-rice',  name: 'Basmati Rice',         priceCents: 349,  emoji: '🍚' },
    ],
  },
  {
    matchCategory: ['vegetable-entree', 'vegan-entree'],
    suggestions: [
      { itemId: 'garlic-naan',   name: 'Garlic Naan',          priceCents: 399,  emoji: '🫓' },
      { itemId: 'raita',         name: 'Raita',                priceCents: 299,  emoji: '🥛' },
    ],
  },
  {
    matchCategory: ['rice-biryani'],
    suggestions: [
      { itemId: 'raita',         name: 'Raita',                priceCents: 299,  emoji: '🥛' },
      { itemId: 'papadom',       name: 'Papadom',              priceCents: 199,  emoji: '🌮' },
    ],
  },
  {
    matchCategory: ['appetizer', 'salad'],
    suggestions: [
      { itemId: 'mango-lassi',   name: 'Mango Lassi',          priceCents: 499,  emoji: '🥤' },
    ],
  },
];

const REASON_MAP: Record<string, string> = {
  'garlic-naan':  'Pairs perfectly',
  'basmati-rice': 'Great alongside your curry',
  'raita':        'Cools it down nicely',
  'papadom':      'Crispy side',
  'mango-lassi':  'Refreshing with spicy food',
};

export function getUpsells(cartItems: readonly CartItem[]): UpsellSuggestion[] {
  if (cartItems.length === 0) return [];

  const cartItemIds = new Set(cartItems.map(i => i.itemId));
  const seen = new Set<string>();
  const results: UpsellSuggestion[] = [];

  // Determine which categories are in the cart via itemId prefix heuristic.
  // Real categories aren't stored in CartItem — we match on known item IDs instead.
  for (const rule of RULES) {
    // Check if any cart item's id starts with a known pattern for this rule's categories.
    // For robustness we also accept any cart item whose itemId mentions a category keyword.
    const ruleKeywords = rule.matchCategory.join(' ');
    const hasMatch = cartItems.some(ci => {
      const parts = ci.itemId.split('-');
      return rule.matchCategory.some(cat => {
        const catParts = cat.split('-');
        return catParts.some(p => parts.includes(p));
      }) || ruleKeywords.split('-').some(k => ci.name.toLowerCase().includes(k));
    });

    if (!hasMatch) continue;

    for (const sug of rule.suggestions) {
      if (cartItemIds.has(sug.itemId)) continue; // already in cart
      if (seen.has(sug.itemId)) continue;
      seen.add(sug.itemId);
      results.push({ ...sug, reason: REASON_MAP[sug.itemId] ?? 'Goes well together' });
      if (results.length >= 2) return results; // cap at 2 suggestions
    }
  }

  return results;
}
