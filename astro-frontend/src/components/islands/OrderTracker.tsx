import { useState, useEffect, useRef } from 'react';
import type { Order } from '@lib/api';
import { formatPrice } from '@lib/formatters';

type DeliveryType = 'delivery' | 'pickup';

interface Stage {
  id: string;
  label: string;
  icon: string;
  durationMs: number; // simulated time to stay on this stage
}

function getStages(deliveryType: DeliveryType): Stage[] {
  return [
    { id: 'placed',    label: 'Order Placed',   icon: '✓',  durationMs: 5_000   },
    { id: 'kitchen',   label: 'In the Kitchen',  icon: '👨‍🍳', durationMs: 15_000  },
    { id: 'ready',     label: 'Ready',           icon: '🔔', durationMs: 8_000   },
    {
      id:    'final',
      label: deliveryType === 'delivery' ? 'Out for Delivery' : 'Ready to Collect',
      icon:  deliveryType === 'delivery' ? '🛵' : '🥡',
      durationMs: Infinity,
    },
  ];
}

export default function OrderTracker() {
  const [order, setOrder] = useState<Order | null>(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [secsLeft, setSecsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for the custom event fired by CheckoutModal on success
  useEffect(() => {
    const handler = (e: Event) => {
      const confirmed = (e as CustomEvent<Order>).detail;
      setOrder(confirmed);
      setStageIdx(0);
      setSecsLeft(confirmed.estimatedWaitMin ? confirmed.estimatedWaitMin * 60 : 25 * 60);
    };
    window.addEventListener('order:confirmed', handler);
    return () => window.removeEventListener('order:confirmed', handler);
  }, []);

  // ETA countdown
  useEffect(() => {
    if (!order) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecsLeft(s => Math.max(0, s - 1));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [order]);

  // Simulate stage advancement
  useEffect(() => {
    if (!order) return;
    const stages = getStages(order.deliveryType);
    if (stageIdx >= stages.length - 1) return;
    const dur = stages[stageIdx].durationMs;
    if (!isFinite(dur)) return;
    if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    stageTimerRef.current = setTimeout(() => setStageIdx(i => i + 1), dur);
    return () => { if (stageTimerRef.current) clearTimeout(stageTimerRef.current); };
  }, [order, stageIdx]);

  const close = () => {
    setOrder(null);
    if (timerRef.current) clearInterval(timerRef.current);
    if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
  };

  if (!order) return null;

  const stages = getStages(order.deliveryType);
  const mins = Math.floor(secsLeft / 60);
  const secs = secsLeft % 60;
  const eta = secsLeft > 0
    ? mins > 0 ? `${mins}m ${String(secs).padStart(2, '0')}s` : `${secs}s`
    : 'Any moment now…';

  return (
    <div className="order-tracker-overlay" role="dialog" aria-modal="true" aria-label="Order status">
      <div className="order-tracker">
        <button className="order-tracker__close" onClick={close} aria-label="Close tracker">✕</button>

        <div className="order-tracker__hero">
          <span className="order-tracker__stage-icon" aria-hidden="true">
            {stages[stageIdx].icon}
          </span>
          <h2 className="order-tracker__stage-label">{stages[stageIdx].label}</h2>
          <p className="order-tracker__order-id">Order #{order.id}</p>
          {secsLeft > 0 && stageIdx < stages.length - 1 && (
            <div className="order-tracker__eta">
              <span className="order-tracker__eta-label">Est. wait</span>
              <span className="order-tracker__eta-value">{eta}</span>
            </div>
          )}
          {stageIdx === stages.length - 1 && (
            <p className="order-tracker__final-msg">
              {order.deliveryType === 'delivery'
                ? 'Your food is on its way!'
                : 'Your order is ready at the counter'}
            </p>
          )}
        </div>

        {/* Stage progress bar */}
        <div className="order-tracker__stages" role="list">
          {stages.map((stage, i) => (
            <div
              key={stage.id}
              className={`order-tracker__stage${i < stageIdx ? ' order-tracker__stage--done' : i === stageIdx ? ' order-tracker__stage--active' : ''}`}
              role="listitem"
            >
              <div className="order-tracker__stage-dot">
                {i < stageIdx ? '✓' : i === stageIdx ? <span className="order-tracker__pulse" /> : null}
              </div>
              <span className="order-tracker__stage-name">{stage.label}</span>
              {i < stages.length - 1 && (
                <div className={`order-tracker__connector${i < stageIdx ? ' order-tracker__connector--done' : ''}`} />
              )}
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="order-tracker__summary">
          <div className="order-tracker__summary-row">
            <span>Total paid</span>
            <strong>{formatPrice(order.totalCents)}</strong>
          </div>
          {order.deliveryType === 'delivery' && order.deliveryAddress && (
            <div className="order-tracker__summary-row">
              <span>Delivering to</span>
              <span className="order-tracker__address">{order.deliveryAddress}</span>
            </div>
          )}
        </div>

        <button className="order-tracker__done-btn" onClick={close}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}
