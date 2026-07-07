import { useState, useEffect, useRef } from 'react';
import type { PaymentRequest, PaymentRequestPaymentMethodEvent } from '@stripe/stripe-js';
import { getStripe, isStripeEnabled } from '@lib/stripe';

interface Props {
  totalCents: number;
  // Handler owns the full lifecycle INCLUDING event.complete() — it must close
  // the wallet sheet itself (success/fail) before any 3DS challenge runs.
  onPaymentMethod: (event: PaymentRequestPaymentMethodEvent) => Promise<void>;
}

export default function PaymentRequestButton({ totalCents, onPaymentMethod }: Props) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const prRef = useRef<PaymentRequest | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isStripeEnabled()) { setLoading(false); return; }

    let cancelled = false;

    (async () => {
      try {
        const stripe = await getStripe();
        if (!stripe || cancelled) return;

        const pr = stripe.paymentRequest({
          country: 'US',
          currency: 'usd',
          total: { label: 'Joy Curry & Tandoor', amount: totalCents },
          requestPayerName: true,
          requestPayerEmail: true,
          requestPayerPhone: true,
        });

        const result = await pr.canMakePayment();
        if (cancelled) return;

        if (result) {
          prRef.current = pr;
          // Mount the Stripe Elements button
          const elements = stripe.elements();
          const prButton = elements.create('paymentRequestButton', {
            paymentRequest: pr,
            style: { paymentRequestButton: { type: 'default', theme: 'dark', height: '48px' } },
          });
          if (mountRef.current) prButton.mount(mountRef.current);
          setAvailable(true);

          // The handler calls event.complete() itself (it must close the sheet
          // before running any in-page 3DS challenge).
          pr.on('paymentmethod', (event: PaymentRequestPaymentMethodEvent) => {
            void onPaymentMethod(event);
          });
        }
      } catch {
        // Stripe failed to load — degrade silently
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  // Only run once on mount — totalCents used in payment request amount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update the payment request amount when totalCents changes
  useEffect(() => {
    if (prRef.current && totalCents > 0) {
      prRef.current.update({ total: { label: 'Joy Curry & Tandoor', amount: totalCents } });
    }
  }, [totalCents]);

  if (loading || !available || !isStripeEnabled()) return null;

  return (
    <div className="payment-request-wrap">
      <div ref={mountRef} className="payment-request-btn" />
      <div className="payment-request-divider">
        <span>or pay with card</span>
      </div>
    </div>
  );
}
