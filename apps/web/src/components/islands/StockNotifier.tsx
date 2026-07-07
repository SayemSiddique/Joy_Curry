import { useEffect } from 'react';

interface AvailabilityItem {
  itemId: string;
  remaining: number | null;
  urgent: boolean;
}

// Polls /api/availability and injects urgency badges directly onto menu card DOM nodes.
// Degrades silently on 404 (endpoint not deployed yet).
export default function StockNotifier() {
  useEffect(() => {
    async function fetchAndInject() {
      try {
        const res = await fetch('/api/availability');
        if (!res.ok) return;
        const { items }: { items: AvailabilityItem[] } = await res.json();

        // Clear stale badges from a previous poll
        document.querySelectorAll('.stock-urgency').forEach(el => el.remove());

        for (const avail of items) {
          if (!avail.urgent || avail.remaining === null) continue;
          // Match the card by scanning data-item-json attribute
          const card = document.querySelector(
            `[data-item-json*='"id":"${avail.itemId}"']`,
          ) as HTMLElement | null;
          if (!card) continue;

          const badge = document.createElement('span');
          badge.className = avail.remaining <= 3 ? 'stock-urgency stock-urgency--critical' : 'stock-urgency';
          badge.setAttribute('aria-label', `${avail.remaining} servings left today`);
          badge.textContent = avail.remaining <= 3
            ? `🔴 Only ${avail.remaining} left!`
            : `⚡ ${avail.remaining} left today`;

          const imgWrap = card.querySelector('.menu-card__img-wrap');
          if (imgWrap) imgWrap.appendChild(badge);
        }
      } catch {
        // Degrade silently — endpoint may not exist yet
      }
    }

    fetchAndInject();
    const interval = setInterval(fetchAndInject, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
