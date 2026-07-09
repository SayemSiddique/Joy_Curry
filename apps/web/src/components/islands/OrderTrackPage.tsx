import { useState, useEffect, useRef } from 'react';
import { ChefHat, Bell, Truck, ShoppingBag, MapPin, ClipboardList } from 'lucide-react';
import type { ReadableAtom } from 'nanostores';
import { authState, ordersApi, formatPrice } from '@lib/core';
import type { Order } from '@lib/core';

function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

type Stage = { id: string; label: string; icon: React.ReactNode };

function getStages(deliveryType: 'delivery' | 'pickup'): Stage[] {
  return [
    { id: 'placed',  label: 'Order Placed',    icon: '✓' },
    { id: 'kitchen', label: 'In the Kitchen',   icon: <ChefHat size={26} strokeWidth={1.5} aria-hidden="true" /> },
    { id: 'ready',   label: 'Ready',            icon: <Bell size={26} strokeWidth={1.5} aria-hidden="true" /> },
    {
      id:    'final',
      label: deliveryType === 'delivery' ? 'Out for Delivery' : 'Ready to Collect',
      icon:  deliveryType === 'delivery' ? <Truck size={26} strokeWidth={1.5} aria-hidden="true" /> : <ShoppingBag size={26} strokeWidth={1.5} aria-hidden="true" />,
    },
  ];
}

function statusToStageIdx(status: Order['status']): number {
  switch (status) {
    case 'pending':    return 0;
    case 'confirmed':  return 1;
    case 'ready':      return 2;
    case 'completed':  return 3;
    case 'cancelled':  return -1;
    default:           return 0;
  }
}

export default function OrderTrackPage() {
  const auth = useNano(authState);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const orderId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('id')
    : null;

  useEffect(() => {
    // Hard redirect if not authed — order cannot be placed without sign-in
    if (!auth.token) {
      window.location.replace('/');
      return;
    }
    if (!orderId) {
      setError('No order ID provided.');
      setLoading(false);
      return;
    }

    async function fetchOrder() {
      try {
        const res = await ordersApi.getById(orderId!, auth.token!);
        setOrder(res.order);
        setError(null);
        // Stop polling once order reaches a terminal state
        if (res.order.status === 'completed' || res.order.status === 'cancelled') {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch {
        setError('Unable to load order. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
    intervalRef.current = setInterval(fetchOrder, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [auth.token, orderId]);

  if (!auth.token) return null; // redirecting

  if (loading) {
    return (
      <div className="track-page track-page--loading">
        <div className="track-page__spinner" aria-label="Loading order status…" />
        <p className="form-hint">Loading your order…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="track-page track-page--error">
        <p className="form-error" role="alert">{error ?? 'Order not found.'}</p>
        <a href="/order" className="btn btn--primary" style={{ marginTop: 'var(--space-4)' }}>Back to Menu</a>
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const stages = getStages(order.deliveryType);
  const stageIdx = statusToStageIdx(order.status);

  return (
    <div className="track-page">
      <div className="track-page__inner">

        {/* Header */}
        <div className="track-page__header">
          <h1 className="track-page__title">
            {isCancelled ? 'Order Cancelled' : stages[stageIdx]?.label ?? 'Tracking'}
          </h1>
          <p className="track-page__order-id">Order #{order.id}</p>
          {!isCancelled && order.estimatedWaitMin && stageIdx < 3 && (
            <p className="track-page__eta">Est. wait: <strong>{order.estimatedWaitMin} min</strong></p>
          )}
          {stageIdx === 3 && !isCancelled && (
            <p className="track-page__final-msg">
              {order.deliveryType === 'delivery'
                ? 'Your food is on its way!'
                : "Your order is ready at the counter — we'll see you soon!"}
            </p>
          )}
        </div>

        {/* Stage progress */}
        {!isCancelled && (
          <div className="track-page__stages" role="list">
            {stages.map((stage, i) => (
              <div
                key={stage.id}
                className={[
                  'track-page__stage',
                  i < stageIdx ? 'track-page__stage--done' : '',
                  i === stageIdx ? 'track-page__stage--active' : '',
                ].join(' ').trim()}
                role="listitem"
              >
                <div className="track-page__stage-dot">
                  {i < stageIdx
                    ? <span className="track-page__check" aria-hidden="true">✓</span>
                    : i === stageIdx
                      ? <span className="track-page__pulse" aria-hidden="true" />
                      : null}
                </div>
                <span className="track-page__stage-icon" aria-hidden="true">{stage.icon}</span>
                <span className="track-page__stage-name">{stage.label}</span>
                {i < stages.length - 1 && (
                  <div className={`track-page__connector${i < stageIdx ? ' track-page__connector--done' : ''}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Order summary */}
        <div className="track-page__summary">
          <div className="track-page__summary-row">
            <span>Total paid</span>
            <strong>{formatPrice(order.totalCents)}</strong>
          </div>
          <div className="track-page__summary-row">
            <span>Order type</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              {order.deliveryType === 'delivery'
                ? <><Truck size={13} aria-hidden="true" /> Delivery</>
                : <><ShoppingBag size={13} aria-hidden="true" /> Pickup</>}
            </span>
          </div>
          {order.deliveryType === 'delivery' && order.deliveryAddress && (
            <div className="track-page__summary-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <MapPin size={13} aria-hidden="true" /> Delivering to
              </span>
              <span className="track-page__address">{order.deliveryAddress}</span>
            </div>
          )}
          {order.dropOffInstructions && (
            <div className="track-page__summary-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <ClipboardList size={13} aria-hidden="true" /> Drop-off
              </span>
              <span>{order.dropOffInstructions}</span>
            </div>
          )}
          {order.deliveryType === 'pickup' && (
            <div className="track-page__summary-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <MapPin size={13} aria-hidden="true" /> Pickup at
              </span>
              <span>148 E 46th St, New York, NY 10017</span>
            </div>
          )}
        </div>

        <a href="/order" className="btn btn--secondary track-page__back">Back to Menu</a>
      </div>
    </div>
  );
}
