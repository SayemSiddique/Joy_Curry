import { useEffect } from 'react';
import { authState, favoritesApi, favoriteItemIds, setFavorites, toggleFavoriteLocal } from '@lib/core';
import { showToast } from '@lib/toast';

// Syncs the DOM's [data-favorite-item-id] buttons with the favoriteItemIds store,
// and handles toggle clicks. Mounted once in BaseLayout.
export default function FavoritesManager() {
  // Load favorites whenever the user signs in or out
  useEffect(() => {
    return authState.subscribe((auth) => {
      if (!auth.token) {
        setFavorites([]);
        syncDOM(new Set());
        return;
      }
      favoritesApi
        .getMyFavorites(auth.token)
        .then(({ itemIds }) => {
          setFavorites(itemIds);
        })
        .catch(() => {});
    });
  }, []);

  // Re-sync DOM whenever the store changes
  useEffect(() => {
    return favoriteItemIds.subscribe((ids) => syncDOM(ids));
  }, []);

  // Delegated click handler for all heart buttons
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const btn = (e.target as Element).closest<HTMLElement>('[data-favorite-item-id]');
      if (!btn) return;

      // Prevent the dish modal from opening
      e.stopPropagation();

      const auth = authState.get();
      if (!auth.token) {
        showToast('Sign in to save favorites.', 'info');
        return;
      }

      const itemId = btn.dataset.favoriteItemId!;
      const isFav = favoriteItemIds.get().has(itemId);

      // Optimistic update
      toggleFavoriteLocal(itemId);

      const call = isFav
        ? favoritesApi.removeFavorite(itemId, auth.token)
        : favoritesApi.addFavorite(itemId, auth.token);

      call.catch(() => {
        // Revert on failure
        toggleFavoriteLocal(itemId);
        showToast('Could not update favorites. Try again.', 'error');
      });
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return null;
}

function syncDOM(ids: Set<string>) {
  document.querySelectorAll<HTMLElement>('[data-favorite-item-id]').forEach((btn) => {
    const itemId = btn.dataset.favoriteItemId!;
    const active = ids.has(itemId);
    btn.setAttribute('aria-pressed', String(active));
    btn.setAttribute('aria-label', active ? btn.getAttribute('aria-label')?.replace('Save', 'Remove') ?? '' : btn.getAttribute('aria-label')?.replace('Remove', 'Save') ?? '');
    btn.classList.toggle('menu-card__heart--active', active);
    btn.textContent = active ? '♥' : '♡';
  });
}
