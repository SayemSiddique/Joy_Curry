import { useState, useEffect } from 'react';
import type { ReadableAtom } from 'nanostores';
import { authState } from '@lib/core';
import { addToCart, cartOpen } from '@lib/core';
import { ordersApi, type Order } from '@lib/core';
import { formatPrice } from '@lib/core';
import { showToast } from '@lib/toast';

function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

export default function ReorderStrip() {
  const auth = useNano(authState);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.token) { setOrders([]); return; }
    setLoading(true);
    ordersApi
      .myOrders(auth.token)
      .then(({ orders }) => {
        const completed = orders
          .filter(o => o.status === 'completed')
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .slice(0, 3);
        setOrders(completed);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [auth.token]);

  if (!auth.token || loading || orders.length === 0) return null;

  const handleReorder = (order: Order) => {
    order.lineItems.forEach(li => {
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
    showToast('Your usual is in the cart — review before checkout.', 'success');
  };

  return (
    <section className="reorder-strip" aria-label="Your recent orders">
      <div className="container">
        <h2 className="reorder-strip__heading">Your Usual</h2>
        <div className="reorder-strip__grid">
          {orders.map(order => (
            <div key={order.id} className="reorder-card">
              <div className="reorder-card__items">
                {order.lineItems.slice(0, 3).map(li => (
                  <span key={li.id} className="reorder-card__item-name">{li.itemName}</span>
                ))}
                {order.lineItems.length > 3 && (
                  <span className="reorder-card__more">+{order.lineItems.length - 3} more</span>
                )}
              </div>
              <div className="reorder-card__meta">
                <span className="reorder-card__total">{formatPrice(order.totalCents)}</span>
                <span className="reorder-card__type">
                  {order.deliveryType === 'pickup' ? '🥡 Pickup' : '🛵 Delivery'}
                </span>
              </div>
              <button
                className="reorder-card__btn"
                onClick={() => handleReorder(order)}
                aria-label={`Reorder ${order.lineItems.map(l => l.itemName).join(', ')}`}
              >
                Reorder →
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
