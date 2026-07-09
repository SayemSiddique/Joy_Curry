import { useEffect } from 'react';
import { API_BASE_URL } from '@lib/core';

interface AvailabilityResponse {
  soldOut: string[];
  items: { itemId: string; inStock: boolean }[];
}

// Polls /api/availability and marks sold-out menu cards. Stock is a boolean in
// our data (no per-item quantity), so we surface honest "Sold out today"
// status only — never fabricated "N left" scarcity. Degrades silently on error.
export default function StockNotifier() {
  useEffect(() => {
    async function fetchAndInject() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/availability`);
        if (!res.ok) return;
        const { soldOut }: AvailabilityResponse = await res.json();

        // Clear stale badges from a previous poll.
        document.querySelectorAll('.stock-urgency').forEach(el => el.remove());

        for (const itemId of soldOut) {
          const card = document.querySelector(
            `[data-item-json*='"id":"${itemId}"']`,
          ) as HTMLElement | null;
          if (!card) continue;

          const badge = document.createElement('span');
          badge.className = 'stock-urgency stock-urgency--critical';
          badge.setAttribute('aria-label', 'Sold out today');
          badge.textContent = 'Sold out today';

          const imgWrap = card.querySelector('.menu-card__img-wrap');
          if (imgWrap) imgWrap.appendChild(badge);
        }
      } catch {
        // Degrade silently.
      }
    }

    fetchAndInject();
    const interval = setInterval(fetchAndInject, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
