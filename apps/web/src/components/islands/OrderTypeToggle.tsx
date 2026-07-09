import { useState, useEffect } from 'react';
import { ShoppingBag, Truck } from 'lucide-react';
import type { ReadableAtom } from 'nanostores';
import { orderType, setOrderType } from '@lib/core';

// React 19 + Astro SSR: subscribe manually instead of @nanostores/react useStore.
function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

export default function OrderTypeToggle() {
  const current = useNano(orderType);

  return (
    <section className="order-toggle container" aria-label="Choose an order type">
      <p className="order-toggle__heading">Choose An Order Type</p>
      <div className="order-toggle__group" role="group" aria-label="Choose an order type">
        <button
          type="button"
          className={`order-toggle__pill${current === 'pickup' ? ' order-toggle__pill--selected' : ''}`}
          aria-pressed={current === 'pickup'}
          onClick={() => setOrderType('pickup')}
        >
          <ShoppingBag size={20} aria-hidden="true" />
          <span>Pick-Up</span>
        </button>
        <button
          type="button"
          className={`order-toggle__pill${current === 'delivery' ? ' order-toggle__pill--selected' : ''}`}
          aria-pressed={current === 'delivery'}
          onClick={() => setOrderType('delivery')}
        >
          <Truck size={20} aria-hidden="true" />
          <span>Delivery</span>
        </button>
      </div>
    </section>
  );
}
