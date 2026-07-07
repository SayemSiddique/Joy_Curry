import { useState, useEffect, useRef } from 'react';
import type { ReadableAtom } from 'nanostores';
import { authState } from '@stores/auth';
import { addToCart, cartOpen } from '@stores/cart';
import { ordersApi, type Order } from '@lib/api';
import { formatPrice } from '@lib/formatters';
import { flyToCart } from '@lib/cartAnimation';
import { showToast } from '@lib/toast';

function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

interface TopItem {
  itemId: string;
  name: string;
  basePriceCents: number;
  count: number;
}

const DISMISS_KEY = 'jc_welcome_strip_dismissed';

export default function WelcomeStrip() {
  const auth = useNano(authState);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!auth.token || !auth.user) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    ordersApi
      .myOrders(auth.token)
      .then(({ orders }) => {
        const freq = new Map<string, TopItem>();
        for (const order of orders as Order[]) {
          for (const li of order.lineItems) {
            const existing = freq.get(li.itemId);
            if (existing) {
              existing.count += li.qty;
            } else {
              freq.set(li.itemId, {
                itemId: li.itemId,
                name: li.itemName,
                basePriceCents: li.basePriceCents,
                count: li.qty,
              });
            }
          }
        }
        const sorted = [...freq.values()]
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        if (sorted.length > 0) {
          setTopItems(sorted);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, [auth.token, auth.user]);

  // Auto-dismiss after 8s
  useEffect(() => {
    if (!visible) return;
    timerRef.current = setTimeout(() => dismiss(), 8000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISS_KEY, '1');
  };

  const handleAdd = (item: TopItem, e: React.MouseEvent<HTMLButtonElement>) => {
    addToCart({
      itemId: item.itemId,
      name: item.name,
      basePriceCents: item.basePriceCents,
      qty: 1,
      lineTotalCents: item.basePriceCents,
      itemType: 'regular',
    });
    flyToCart(e.currentTarget);
    cartOpen.set(true);
    showToast(`${item.name} added to cart!`, 'success');
  };

  if (!visible || topItems.length === 0) return null;

  const firstName = auth.user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="welcome-strip" role="region" aria-label="Personalized welcome">
      <div className="container welcome-strip__inner">
        <div className="welcome-strip__greeting">
          <span className="welcome-strip__wave">👋</span>
          <span>Welcome back, <strong>{firstName}</strong>! Your favourites:</span>
        </div>
        <div className="welcome-strip__items">
          {topItems.map(item => (
            <button
              key={item.itemId}
              className="welcome-strip__item-btn"
              onClick={e => handleAdd(item, e)}
              aria-label={`Add ${item.name} to cart, ${formatPrice(item.basePriceCents)}`}
            >
              <span className="welcome-strip__item-name">{item.name}</span>
              <span className="welcome-strip__item-price">{formatPrice(item.basePriceCents)}</span>
              <span className="welcome-strip__item-add">+ Add</span>
            </button>
          ))}
        </div>
        <button
          className="welcome-strip__close"
          onClick={dismiss}
          aria-label="Dismiss welcome banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
