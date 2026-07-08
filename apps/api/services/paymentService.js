// Stripe payment processing (Session 4 — test mode).
// Stripe handles: Visa, Mastercard, Amex, Discover, Apple Pay, Google Pay —
// all through one PaymentIntent integration. Card data never touches this
// server (PCI-DSS SAQ A): the client confirms with Stripe Elements using the
// clientSecret returned here.
// Docs: https://stripe.com/docs/payments

import Stripe from 'stripe';

let stripeClient = null;

export function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      const err = new Error('Stripe is not configured (STRIPE_SECRET_KEY missing).');
      err.code = 'PAYMENT_NOT_CONFIGURED';
      throw err;
    }
    // Pin the API version so a Stripe-side account upgrade can't silently
    // change the shape of PaymentIntents or webhook events under us. Matches
    // the version the installed SDK's types are generated against.
    stripeClient = new Stripe(key, { apiVersion: '2026-06-24.dahlia' });
  }
  return stripeClient;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Get-or-create the PaymentIntent for an order. The amount is ALWAYS the
 * server-computed order total — never a client-supplied number.
 *
 * Reuse rules: if the order already has an intent and it is still usable and
 * matches the current total, return it (so a retried checkout doesn't strand
 * intents). Otherwise create a fresh one keyed to the order id.
 *
 * @param {object} order - full order row (id, total_cents, payment_intent_id)
 * @returns {Promise<{ clientSecret: string, paymentIntentId: string }>}
 */
export async function getOrCreateIntentForOrder(order) {
  const stripe = getStripe();

  if (order.payment_intent_id) {
    try {
      const existing = await stripe.paymentIntents.retrieve(order.payment_intent_id);
      const usable = !['succeeded', 'canceled'].includes(existing.status);
      if (usable) {
        if (existing.amount !== order.total_cents) {
          const updated = await stripe.paymentIntents.update(existing.id, {
            amount: order.total_cents,
          });
          return { clientSecret: updated.client_secret, paymentIntentId: updated.id };
        }
        return { clientSecret: existing.client_secret, paymentIntentId: existing.id };
      }
    } catch (err) {
      // Missing/foreign intent id — fall through and mint a new one.
      console.error('[payments] could not reuse intent, creating new:', err.message);
    }
  }

  const intent = await getStripe().paymentIntents.create(
    {
      amount: order.total_cents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: { orderId: order.id },
      description: `Joy Curry & Tandoor — Order ${order.id}`,
    },
    // Stripe-side idempotency: a retried request for the same order+amount
    // returns the same intent instead of minting a duplicate.
    { idempotencyKey: `order-${order.id}-${order.total_cents}` },
  );
  return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
}

/**
 * Verify a Stripe webhook signature and return the parsed event.
 * MUST be called with the raw request body (Buffer), not parsed JSON.
 *
 * @param {Buffer} rawBody
 * @param {string} signature - Stripe-Signature header
 * @returns {import('stripe').Stripe.Event}
 */
export function constructWebhookEvent(rawBody, signature) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    const err = new Error('Stripe webhook secret is not configured.');
    err.code = 'PAYMENT_NOT_CONFIGURED';
    throw err;
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}
