// Courier-partner orchestrator (Uber Direct + DoorDash Drive).
//
// quoteCheapestPartner(): ask every *configured* partner for a quote and return
// the cheapest. dispatchExternalDelivery(): create the delivery with the chosen
// partner. Both degrade to a deterministic SIMULATION when no partner credentials
// are present (mirrors the geocoding "no key → graceful default" pattern), so the
// out-of-zone flow is fully testable today and flips to live couriers the moment
// credentials are added — no code change.

import crypto from 'node:crypto';
import * as uber from './uberDirect.js';
import * as doordash from './doordashDrive.js';

const PARTNERS = [uber, doordash];

// Deterministic simulation pricing — distance-based so the frontend estimate
// (from /api/distance) and the authoritative order price always agree in sim.
const SIM_BASE_CENTS     = 599;
const SIM_PER_MILE_CENTS = 199;

export function anyPartnerConfigured() {
  return PARTNERS.some((p) => p.isConfigured());
}

function simulatedQuote(distanceMiles) {
  const miles = Number.isFinite(distanceMiles) ? distanceMiles : 0;
  return {
    provider: 'uber', // nominal provider for the DB column; external id marks it sim
    quoteId: `sim_quote_${crypto.randomUUID()}`,
    feeCents: SIM_BASE_CENTS + Math.round(miles * SIM_PER_MILE_CENTS),
    etaMinutes: Math.round(15 + miles * 4),
    simulated: true,
  };
}

/**
 * Quote every configured partner and return the cheapest. Falls back to a
 * deterministic simulated quote when nothing is configured (or every live
 * partner errors), so an out-of-zone order can always be priced.
 *
 * @param {object} p
 * @param {number} p.distanceMiles
 * @param {string} p.dropoffAddress
 * @param {number} p.orderValueCents
 * @returns {Promise<{provider:string, quoteId:string, feeCents:number, etaMinutes:number|null, simulated:boolean}>}
 */
export async function quoteCheapestPartner({ distanceMiles, dropoffAddress, orderValueCents }) {
  const configured = PARTNERS.filter((p) => p.isConfigured());
  if (configured.length === 0) return simulatedQuote(distanceMiles);

  const settled = await Promise.allSettled(
    configured.map((p) => p.getQuote({ dropoffAddress, orderValueCents })),
  );
  const quotes = settled
    .filter((s) => s.status === 'fulfilled' && Number.isInteger(s.value?.feeCents))
    .map((s) => ({ ...s.value, simulated: false }));

  settled
    .filter((s) => s.status === 'rejected')
    .forEach((s) => console.error('[delivery] partner quote failed:', s.reason?.message));

  if (quotes.length === 0) return simulatedQuote(distanceMiles); // fail-safe
  return quotes.reduce((cheapest, q) => (q.feeCents < cheapest.feeCents ? q : cheapest));
}

/**
 * Create the delivery with the chosen partner. On a simulated quote (or any live
 * dispatch error) returns a sim_* delivery id so the customer's order still
 * completes; a sim id flags the order for manual dispatch when running live.
 *
 * @returns {Promise<{provider:string, externalDeliveryId:string, trackingUrl:string|null, simulated:boolean}>}
 */
export async function dispatchExternalDelivery({ provider, quoteId, simulated, dropoffAddress, dropoffName, dropoffPhone, orderValueCents, manifestItems }) {
  if (simulated) {
    return { provider, externalDeliveryId: `sim_${crypto.randomUUID()}`, trackingUrl: null, simulated: true };
  }

  const adapter = PARTNERS.find((p) => p.isConfigured() && quoteId && p.getQuote && providerName(p) === provider);
  try {
    if (!adapter) throw new Error(`No configured adapter for provider "${provider}"`);
    const result = await adapter.createDelivery({
      quoteId, dropoffAddress, dropoffName, dropoffPhone, orderValueCents, manifestItems,
    });
    return { ...result, simulated: false };
  } catch (err) {
    console.error('[delivery] dispatch failed, recording for manual handling:', err.message);
    return { provider, externalDeliveryId: `sim_${crypto.randomUUID()}`, trackingUrl: null, simulated: true };
  }
}

// Each adapter tags its quotes with provider; map a module back to that name.
function providerName(mod) {
  return mod === uber ? 'uber' : mod === doordash ? 'doordash' : null;
}
