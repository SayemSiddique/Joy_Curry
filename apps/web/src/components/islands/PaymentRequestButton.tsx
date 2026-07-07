import { useState, useEffect, useRef } from 'react';
import type { Stripe, PaymentRequest, PaymentRequestPaymentMethodEvent } from '@stripe/stripe-js';

interface Props {
  totalCents: number;
  onPaymentMethod: (event: PaymentRequestPaymentMethodEvent) => Promise<void>;
}

const STRIPE_KEY = import.meta.env.PUBLIC_STRIPE_KEY as string | undefined;

export default function PaymentRequestButton({ totalCents, onPaymentMethod }: Props) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const stripeRef = useRef<Stripe | null>(null);
  const prRef = useRef<PaymentRequest | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!STRIPE_KEY) { setLoading(false); return; }

    let cancelled = false;

    (async () => {
      try {
        const { loadStripe } = await import('@stripe/stripe-js');
        const stripe = await loadStripe(STRIPE_KEY);
        if (!stripe || cancelled) return;
        stripeRef.current = stripe;

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

          pr.on('paymentmethod', async (event: PaymentRequestPaymentMethodEvent) => {
            try {
              await onPaymentMethod(event);
              event.complete('success');
            } catch {
              event.complete('fail');
            }
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

  if (loading || !available || !STRIPE_KEY) return null;

  return (
    <div className="payment-request-wrap">
      <div ref={mountRef} className="payment-request-btn" />
      <div className="payment-request-divider">
        <span>or pay with card</span>
      </div>
    </div>
  );
}
