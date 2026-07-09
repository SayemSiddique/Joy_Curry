import { useState, useEffect } from 'react';
import type { ReadableAtom } from 'nanostores';
import { authState, ordersApi, addToCart, cartOpen, formatPrice, formatDateTime } from '@lib/core';
import type { Order } from '@lib/core';
import { showToast } from '@lib/toast';

function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'ready']);

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);

  const handleReorder = () => {
    order.lineItems.forEach((li) => {
      addToCart({
        itemId: li.itemId,
        name: li.itemName,
        basePriceCents: li.basePriceCents,
        qty: li.qty,
        lineTotalCents: li.lineTotalCents,
        itemType: li.itemType,
      });
    });
    cartOpen.set(true);
    showToast('Items added to cart — review before checkout.', 'success');
  };

  const isActive = ACTIVE_STATUSES.has(order.status);
  const shortId = order.id.slice(0, 8).toUpperCase();

  return (
    <div className={`orders-card${expanded ? ' orders-card--expanded' : ''}`}>
      {/* Card header — always visible */}
      <button
        className="orders-card__summary"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls={`order-detail-${order.id}`}
      >
        <div className="orders-card__summary-left">
          <span className="orders-card__id">#{shortId}</span>
          <span className={`orders-card__badge orders-card__badge--${order.status}`}>
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>
        <div className="orders-card__summary-right">
          <span className="orders-card__total">{formatPrice(order.totalCents)}</span>
          <span className="orders-card__date">{formatDateTime(order.createdAt)}</span>
          <span className="orders-card__chevron" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Compact preview when collapsed */}
      {!expanded && (
        <p className="orders-card__preview">
          {order.lineItems.slice(0, 3).map((li) => `${li.qty}× ${li.itemName}`).join(', ')}
          {order.lineItems.length > 3 && ` +${order.lineItems.length - 3} more`}
          {' · '}
          {order.deliveryType === 'pickup' ? 'Pickup' : 'Delivery'}
        </p>
      )}

      {/* Full detail when expanded */}
      {expanded && (
        <div id={`order-detail-${order.id}`} className="orders-card__detail">
          <p className="orders-card__meta">
            {order.deliveryType === 'pickup' ? '🥡 Pickup' : '🛵 Delivery'}
            {' · '}
            {formatDateTime(order.createdAt)}
          </p>

          <ul className="orders-card__line-items" aria-label="Order items">
            {order.lineItems.map((li) => (
              <li key={li.id} className="orders-card__line-item">
                <span className="orders-card__line-qty">{li.qty}×</span>
                <span className="orders-card__line-name">{li.itemName}</span>
                <span className="orders-card__line-price">{formatPrice(li.lineTotalCents)}</span>
              </li>
            ))}
          </ul>

          <div className="orders-card__totals">
            <span>Total</span>
            <span className="orders-card__grand-total">{formatPrice(order.totalCents)}</span>
          </div>

          {order.notes && (
            <p className="orders-card__notes">
              <strong>Note:</strong> {order.notes}
            </p>
          )}

          <div className="orders-card__actions">
            {isActive && (
              <a
                href={`/track?id=${order.id}`}
                className="orders-card__track-btn"
              >
                Track order →
              </a>
            )}
            <button className="orders-card__reorder-btn" onClick={handleReorder}>
              Reorder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const auth = useNano(authState);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth gate — redirect to home if not logged in
  useEffect(() => {
    if (!auth.token) {
      window.location.href = '/';
    }
  }, [auth.token]);

  useEffect(() => {
    if (!auth.token) return;
    setLoading(true);
    setError(null);
    ordersApi
      .myOrders(auth.token)
      .then(({ orders }) => {
        setOrders([...orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [auth.token]);

  if (!auth.token) return null;

  return (
    <section className="orders-page">
      <div className="container">
        <div className="orders-page__header">
          <a href="/" className="orders-page__back">← Back</a>
          <h1 className="orders-page__title">My Orders</h1>
        </div>

        {loading && (
          <div className="orders-page__list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="orders-card orders-card--skeleton" aria-hidden="true" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="orders-page__error" role="alert">{error}</div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="orders-page__empty">
            <span className="orders-page__empty-icon" aria-hidden="true">🧾</span>
            <p className="orders-page__empty-heading">No orders yet</p>
            <p className="orders-page__empty-sub">Your order history will appear here after your first purchase.</p>
            <a href="/order" className="orders-page__empty-cta">Browse the menu →</a>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="orders-page__list">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
