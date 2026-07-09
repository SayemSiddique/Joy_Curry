import { atom } from 'nanostores';

// Set of item IDs the current user has favorited. Empty when not authed.
export const favoriteItemIds = atom<Set<string>>(new Set());

export function setFavorites(ids: string[]) {
  favoriteItemIds.set(new Set(ids));
}

export function toggleFavoriteLocal(itemId: string) {
  const current = new Set(favoriteItemIds.get());
  if (current.has(itemId)) {
    current.delete(itemId);
  } else {
    current.add(itemId);
  }
  favoriteItemIds.set(current);
}
