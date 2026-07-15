// The Stripe publishable key is public (safe to inline in the JS bundle, unlike
// the secret key which lives only on the API). Expo inlines EXPO_PUBLIC_* at
// bundle time. An absent/invalid key disables online payments gracefully — the
// checkout screen surfaces "payments unavailable" instead of placing an order
// that can never be paid (card-required policy, ORCHESTRATOR §3).
export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_KEY ?? '';

export function isStripeEnabled(): boolean {
  return STRIPE_PUBLISHABLE_KEY.startsWith('pk_');
}

// urlScheme powers Stripe's return-to-app after a 3-D Secure / bank redirect.
// Matches app.json's `scheme`.
export const STRIPE_URL_SCHEME = 'joycurry';
