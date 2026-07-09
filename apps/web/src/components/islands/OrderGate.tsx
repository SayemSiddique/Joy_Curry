import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Truck } from 'lucide-react';
import type { ReadableAtom } from 'nanostores';
import { orderType, orderGateOpen, deliveryAddress, subtotalCents, setOrderType, setDeliveryRouting } from '@lib/core';
import { distanceApi } from '@lib/core';
import { formatPrice } from '@lib/core';
import { FREE_DELIVERY_THRESHOLD_CENTS } from '@lib/core';
import { useFocusTrap } from '@lib/hooks';

// React 19 + Astro SSR: subscribe manually instead of @nanostores/react useStore.
function useNano<T>(store: ReadableAtom<T>): T {
  const [val, setVal] = useState<T>(() => store.get());
  useEffect(() => store.subscribe(setVal), [store]);
  return val;
}

type Step = 'choose' | 'address';

export default function OrderGate() {
  const open = useNano(orderGateOpen);
  const currentType = useNano(orderType);
  const savedAddress = useNano(deliveryAddress);

  const [step, setStep] = useState<Step>(
    orderType.get() === 'delivery' && deliveryAddress.get().trim() === '' ? 'address' : 'choose',
  );
  const [address, setAddress] = useState(savedAddress);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [distanceNote, setDistanceNote] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, open);

  // First visit to /order with no choice yet → open the gate automatically.
  // Also reopens (landing on the address step) if the home-screen toggle
  // already set orderType='delivery' but no address was collected yet.
  useEffect(() => {
    const type = orderType.get();
    const needsAddress = type === 'delivery' && deliveryAddress.get().trim() === '';
    if (type === null || needsAddress) orderGateOpen.set(true);
  }, []);

  // Reset the inner step each time the gate opens.
  // Start on 'address' only when delivery is chosen but has no address yet
  // (home-screen toggle case). Otherwise always start at 'choose' so the user
  // can switch between pickup and delivery even when reopened from within the
  // checkout "Change" button.
  useEffect(() => {
    if (open) {
      setStep(orderType.get() === 'delivery' && deliveryAddress.get().trim() === '' ? 'address' : 'choose');
      setAddress(deliveryAddress.get());
      setError(null);
      setDistanceNote(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const choosePickup = () => {
    setOrderType('pickup');
    orderGateOpen.set(false);
  };

  const chooseDelivery = () => {
    setStep('address');
    setError(null);
  };

  const submitDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (trimmed.length < 5) {
      setError('Please enter a full street address.');
      return;
    }

    setChecking(true);
    setError(null);
    setDistanceNote(null);

    // Delivery radius check. Degrades gracefully (null) if the API is unreachable —
    // the server re-routes authoritatively at order time regardless.
    const sub = subtotalCents.get();
    const result = await distanceApi.check(trimmed, sub);
    setChecking(false);

    if (result) {
      // Cache the routing so the cart/checkout fee reflects in-house vs courier.
      setDeliveryRouting({
        withinRadius: result.withinRadius,
        distanceMiles: result.distanceMiles,
        partner: result.deliveryPartner,
        quoteCents: result.withinRadius ? 0 : result.deliveryFeeCents,
      });

      if (result.withinRadius) {
        const willBeFree = sub >= FREE_DELIVERY_THRESHOLD_CENTS;
        setDistanceNote(
          `✓ ${result.distanceMiles.toFixed(1)} mi away — within our delivery zone` +
            (willBeFree ? ' · free delivery!' : '.'),
        );
      } else {
        setDistanceNote(
          `${result.distanceMiles.toFixed(1)} mi away — delivered by our courier partner ` +
            `(${formatPrice(result.deliveryFeeCents)} delivery).`,
        );
      }
    } else {
      // No routing info → treat as in-house so the order still proceeds.
      setDeliveryRouting(null);
    }

    setOrderType('delivery', trimmed);
    orderGateOpen.set(false);
  };

  const handleClose = () => {
    // Only allow dismissing once a choice exists, so the gate truly gates.
    if (orderType.get() !== null) orderGateOpen.set(false);
  };

  return (
    <div
      className={`modal-overlay${open ? ' modal-overlay--visible' : ''}`}
      style={{ zIndex: 'calc(var(--z-modal) + 20)' }}
      onClick={handleClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="modal order-gate"
        role="dialog"
        aria-modal="true"
        aria-label="Choose pickup or delivery"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">
            {step === 'choose' ? 'How would you like your order?' : 'Where are we delivering?'}
          </h2>
          {currentType !== null && (
            <button className="modal__close" onClick={handleClose} aria-label="Close">
              ✕
            </button>
          )}
        </div>

        <div className="modal__body">
          {step === 'choose' ? (
            <div className="order-gate__choices">
              <button type="button" className="order-gate__choice" onClick={choosePickup}>
                <span className="order-gate__choice-icon" aria-hidden="true"><ShoppingBag size={36} strokeWidth={1.5} /></span>
                <span className="order-gate__choice-title">Secure Pickup</span>
                <span className="order-gate__choice-sub">
                  Ready at 148 E 46th St — no delivery fee
                </span>
              </button>

              <button type="button" className="order-gate__choice" onClick={chooseDelivery}>
                <span className="order-gate__choice-icon" aria-hidden="true"><Truck size={36} strokeWidth={1.5} /></span>
                <span className="order-gate__choice-title">Bespoke Delivery</span>
                <span className="order-gate__choice-sub">
                  Brought to your door across Midtown
                </span>
              </button>
            </div>
          ) : (
            <form onSubmit={submitDelivery}>
              <div className="form-group">
                <label htmlFor="gate-address" className="form-label form-label--required">
                  Delivery Address
                </label>
                <input
                  id="gate-address"
                  type="text"
                  className={`form-input${error ? ' form-input--error' : ''}`}
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (error) setError(null);
                  }}
                  autoComplete="street-address"
                  placeholder="123 Main St, New York, NY 10017"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                />
                {error && (
                  <span className="form-error" role="alert">
                    {error}
                  </span>
                )}
                {distanceNote && <p className="form-hint">{distanceNote}</p>}
              </div>

              <div className="order-gate__actions">
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setStep('choose')}
                >
                  ← Back
                </button>
                <button type="submit" className="btn btn--primary" disabled={checking}>
                  {checking ? 'Checking…' : 'Continue →'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
