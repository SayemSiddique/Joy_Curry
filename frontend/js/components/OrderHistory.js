import { formatPrice } from '../utils/formatters.js';

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function formatDate(utcString) {
  return new Date(utcString).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  });
}

function renderOrderCard(order) {
  const dateStr  = escapeHtml(formatDate(order.created_at));
  const totalStr = formatPrice(order.total_cents / 100);
  const typeLabel = order.delivery_type === 'pickup' ? 'Pickup' : 'Delivery';

  const itemLines = (order.lineItems ?? [])
    .map(li => `<li class="order-history-card__item">${li.qty}&times; ${escapeHtml(li.item_name)}</li>`)
    .join('');

  return `
    <article class="order-history-card">
      <div class="order-history-card__header">
        <span class="order-history-card__id">#${escapeHtml(order.id)}</span>
        <span class="order-history-card__date">${dateStr}</span>
      </div>
      <p class="order-history-card__type">${escapeHtml(typeLabel)}</p>
      <ul class="order-history-card__items" aria-label="Items ordered">${itemLines}</ul>
      <div class="order-history-card__footer">
        <span class="order-history-card__total">${totalStr}</span>
        <button
          class="btn btn--secondary btn--sm"
          data-action="reorder"
          data-order-id="${escapeHtml(order.id)}"
          aria-label="Reorder from ${dateStr}"
        >Reorder</button>
      </div>
    </article>
  `;
}

export function renderOrderHistory(orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    return `<p class="order-history__empty">No orders yet — place your first order today!</p>`;
  }
  return orders.map(renderOrderCard).join('');
}
