// DoorDash Drive adapter — white-label, on-demand courier dispatch.
// Docs: https://developer.doordash.com/en-US/docs/drive/how_to/get_started
//
// Auth is a short-lived HS256 JWT signed with the (base64url) signing secret.
// Flow: create a quote → accept the quote (which creates the delivery).
// The external_delivery_id we generate doubles as the quote handle.
//
// Activates only when all three env vars are present; otherwise isConfigured()
// returns false and the orchestrator falls back to simulation.

import crypto from 'node:crypto';

const API_BASE = 'https://openapi.doordash.com/drive/v2';

const PICKUP_ADDRESS = '148 East 46th St, New York, NY 10017';

export function isConfigured() {
  return Boolean(
    process.env.DOORDASH_DEVELOPER_ID &&
    process.env.DOORDASH_KEY_ID &&
    process.env.DOORDASH_SIGNING_SECRET,
  );
}

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** Build a DoorDash-flavored HS256 JWT (valid ~5 min). */
function signJwt() {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
    'dd-ver': 'DD-JWT-V1',
    kid: process.env.DOORDASH_KEY_ID,
  };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: 'doordash',
    iss: process.env.DOORDASH_DEVELOPER_ID,
    kid: process.env.DOORDASH_KEY_ID,
    iat: now,
    exp: now + 300,
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  // The signing secret is base64url-encoded per DoorDash.
  const secret = Buffer.from(process.env.DOORDASH_SIGNING_SECRET, 'base64');
  const sig = crypto.createHmac('sha256', secret).update(signingInput).digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${signingInput}.${sig}`;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${signJwt()}`,
    'Content-Type': 'application/json',
  };
}

/**
 * @returns {Promise<{provider:'doordash', quoteId:string, feeCents:number, currency:string, etaMinutes:number|null}>}
 */
export async function getQuote({ dropoffAddress, orderValueCents }) {
  const externalDeliveryId = crypto.randomUUID();
  const res = await fetch(`${API_BASE}/quotes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      external_delivery_id: externalDeliveryId,
      pickup_address: PICKUP_ADDRESS,
      dropoff_address: dropoffAddress,
      order_value: orderValueCents,
    }),
  });
  if (!res.ok) throw new Error(`DoorDash quote HTTP ${res.status}`);
  const q = await res.json();
  return {
    provider: 'doordash',
    quoteId: externalDeliveryId,        // accept the quote by this id
    feeCents: q.fee,                    // DoorDash returns the fee in cents
    currency: q.currency ?? 'USD',
    etaMinutes: null,
  };
}

/**
 * @returns {Promise<{provider:'doordash', externalDeliveryId:string, trackingUrl:string|null, feeCents:number, status:string}>}
 */
export async function createDelivery({ quoteId }) {
  // Accepting the quote creates the delivery. quoteId === external_delivery_id.
  const res = await fetch(`${API_BASE}/quotes/${encodeURIComponent(quoteId)}/accept`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`DoorDash accept HTTP ${res.status}`);
  const d = await res.json();
  return {
    provider: 'doordash',
    externalDeliveryId: d.external_delivery_id ?? quoteId,
    trackingUrl: d.tracking_url ?? null,
    feeCents: d.fee,
    status: d.delivery_status ?? 'created',
  };
}
