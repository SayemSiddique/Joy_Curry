import { useState, useEffect } from 'react';
import { Receipt } from 'lucide-react';
import type { ReadableAtom } from 'nanostores';
import { orderHistoryOpen } from '@lib/core';
import { authState } from '@lib/core';
import { addToCart, cartOpen } from '@lib/core';
import { ordersApi, type Order } from '@lib/core';
import { formatPrice, formatDateTime } from '@lib/core';
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

export default function OrderHistory() {
  const open = useNano(orderHistoryOpen);
  const auth = useNano(authState);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch orders whenever the drawer opens and user is authenticated
  useEffect(() => {
    if (!open || !auth.token) return;

    setLoading(true);
    setError(null);

    ordersApi
      .myOrders(auth.token)
      .then(({ orders }) => {
        // newest first
        setOrders([...orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, auth.token]);

  const handleClose = () => orderHistoryOpen.set(false);

  const handleReorder = (order: Order) => {
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

    orderHistoryOpen.set(false);
    cartOpen.set(true);
    showToast('Items added to cart — review before checkout.', 'success');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`order-history-overlay${open ? ' order-history-overlay--visible' : ''}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`order-history-drawer${open ? ' order-history-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Order history"
      >
        <div className="order-history-drawer__header">
          <h2 className="order-history-drawer__title">My Orders</h2>
          <button
            className="order-history-drawer__close"
            onClick={handleClose}
            aria-label="Close order history"
          >
            ✕
          </button>
        </div>

        <div className="order-history-drawer__content">
          {loading && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="order-history-drawer__skeleton-card" aria-hidden="true" />
              ))}
            </>
          )}

          {!loading && error && (
            <div className="order-history-drawer__error" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="order-history-drawer__empty">
              <span className="order-history-drawer__empty-icon" aria-hidden="true"><Receipt size={36} strokeWidth={1.5} /></span>
              <p style={{ fontWeight: 700 }}>No orders yet</p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                Your order history will appear here after your first purchase.
              </p>
            </div>
          )}

          {!loading && !error && orders.map((order) => {
            const itemSummary = order.lineItems
              .map((li) => `${li.qty}× ${li.itemName}`)
              .join(', ');

            return (
              <div key={order.id} className="order-card">
                <div className="order-card__header">
                  <span className="order-card__id">#{order.id.slice(0, 8).toUpperCase()}</span>
                  <span className={`order-card__badge order-card__badge--${order.status}`}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>

                <div className="order-card__date">
                  {formatDateTime(order.createdAt)} &middot;{' '}
                  {order.deliveryType === 'pickup' ? 'Pickup' : 'Delivery'}
                </div>

                <div className="order-card__items">{itemSummary}</div>

                <div className="order-card__footer">
                  <span className="order-card__total">{formatPrice(order.totalCents)}</span>
                  <button
                    className="order-card__reorder"
                    onClick={() => handleReorder(order)}
                    aria-label={`Reorder items from order #${order.id.slice(0, 8).toUpperCase()}`}
                  >
                    Reorder
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
