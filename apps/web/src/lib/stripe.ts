// Shared Stripe.js singleton — used by CheckoutModal (Payment Element) and
// PaymentRequestButton (Apple Pay / Google Pay). The publishable key is safe
// to expose; card data goes straight from the browser to Stripe (SAQ A).
import type { Stripe } from '@stripe/stripe-js';

const STRIPE_KEY = import.meta.env.PUBLIC_STRIPE_KEY as string | undefined;

let stripePromise: Promise<Stripe | null> | null = null;

export function isStripeEnabled(): boolean {
  return Boolean(STRIPE_KEY);
}

export function getStripe(): Promise<Stripe | null> {
  if (!STRIPE_KEY) return Promise.resolve(null);
  if (!stripePromise) {
    stripePromise = import('@stripe/stripe-js').then(({ loadStripe }) => loadStripe(STRIPE_KEY));
  }
  return stripePromise;
}
