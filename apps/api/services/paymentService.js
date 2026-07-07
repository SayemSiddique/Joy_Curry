// Stripe payment processing — not yet activated.
// Stripe handles: Visa, Mastercard, Amex, Discover, Apple Pay, Google Pay,
// PayPal, and Venmo — all through one integration.
// Docs: https://stripe.com/docs/payments

/**
 * Create a Stripe PaymentIntent for the given amount.
 * The frontend uses the returned clientSecret to render Stripe Elements
 * (card, Apple Pay, Google Pay, etc.) without any card data touching the server.
 *
 * Requires env vars: STRIPE_SECRET_KEY
 *
 * @param {number} amountCents - integer cents (e.g. 1550 for $15.50)
 * @param {string} currency    - ISO 4217 lowercase (e.g. 'usd')
 * @returns {Promise<{ clientSecret: string }>}
 */
export async function createPaymentIntent(_amountCents, _currency = 'usd') {
  throw new Error('Stripe payment processing is not yet activated.');
}

/**
 * Verify a Stripe webhook event signature to prevent replay attacks.
 * Called from POST /api/payments/webhook.
 *
 * Requires env vars: STRIPE_WEBHOOK_SECRET
 *
 * @param {Buffer} rawBody - raw request body (not parsed)
 * @param {string} signature - value of the Stripe-Signature header
 * @returns {object} verified Stripe event
 */
export function constructWebhookEvent(_rawBody, _signature) {
  throw new Error('Stripe webhook verification is not yet activated.');
}
