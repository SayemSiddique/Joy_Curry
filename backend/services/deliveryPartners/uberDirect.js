// Uber Direct adapter — white-label, on-demand courier dispatch.
// Docs: https://developer.uber.com/docs/deliveries
//
// Flow: OAuth2 client-credentials → create a delivery_quote → create a delivery
// (referencing the quote id to lock the price).
//
// Activates only when all three env vars are present; otherwise isConfigured()
// returns false and the orchestrator falls back to simulation.

const OAUTH_URL = 'https://login.uber.com/oauth/v2/token';
const API_BASE  = 'https://api.uber.com/v1/customers';

const PICKUP = {
  name: 'Joy Curry & Tandoor',
  address: '148 East 46th St, New York, NY 10017',
  phone_number: '+12125550123',
};

let cachedToken = null; // { access_token, expiresAt }

export function isConfigured() {
  return Boolean(
    process.env.UBER_DIRECT_CUSTOMER_ID &&
    process.env.UBER_DIRECT_CLIENT_ID &&
    process.env.UBER_DIRECT_CLIENT_SECRET,
  );
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.access_token;
  }
  const body = new URLSearchParams({
    client_id: process.env.UBER_DIRECT_CLIENT_ID,
    client_secret: process.env.UBER_DIRECT_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: 'eats.deliveries',
  });
  const res = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Uber OAuth HTTP ${res.status}`);
  const json = await res.json();
  cachedToken = {
    access_token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 1800) * 1000,
  };
  return cachedToken.access_token;
}

/**
 * @returns {Promise<{provider:'uber', quoteId:string, feeCents:number, currency:string, etaMinutes:number|null}>}
 */
export async function getQuote({ dropoffAddress }) {
  const token = await getAccessToken();
  const customerId = process.env.UBER_DIRECT_CUSTOMER_ID;
  const res = await fetch(`${API_BASE}/${customerId}/delivery_quotes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pickup_address: PICKUP.address,
      dropoff_address: dropoffAddress,
    }),
  });
  if (!res.ok) throw new Error(`Uber quote HTTP ${res.status}`);
  const q = await res.json();
  return {
    provider: 'uber',
    quoteId: q.id,
    feeCents: q.fee,             // Uber returns the fee in the smallest currency unit
    currency: q.currency ?? 'usd',
    etaMinutes: q.duration ?? null,
  };
}

/**
 * @returns {Promise<{provider:'uber', externalDeliveryId:string, trackingUrl:string|null, feeCents:number, status:string}>}
 */
export async function createDelivery({ quoteId, dropoffAddress, dropoffName, dropoffPhone, orderValueCents, manifestItems }) {
  const token = await getAccessToken();
  const customerId = process.env.UBER_DIRECT_CUSTOMER_ID;
  const res = await fetch(`${API_BASE}/${customerId}/deliveries`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      quote_id: quoteId,
      pickup_name: PICKUP.name,
      pickup_address: PICKUP.address,
      pickup_phone_number: PICKUP.phone_number,
      dropoff_name: dropoffName || 'Customer',
      dropoff_address: dropoffAddress,
      dropoff_phone_number: dropoffPhone || PICKUP.phone_number,
      manifest_total_value: orderValueCents,
      manifest_items: manifestItems ?? [],
    }),
  });
  if (!res.ok) throw new Error(`Uber createDelivery HTTP ${res.status}`);
  const d = await res.json();
  return {
    provider: 'uber',
    externalDeliveryId: d.id,
    trackingUrl: d.tracking_url ?? null,
    feeCents: d.fee,
    status: d.status ?? 'pending',
  };
}
