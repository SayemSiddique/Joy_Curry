/**
 * Delivery routing & fee policy — single source of truth.
 *
 * Restaurant: Joy Curry & Tandoor, 148 East 46th St, NYC.
 *
 * Routing model (McDonald's-style white-label dispatch):
 *   • Within OWN_DELIVERY_RADIUS_MILES → we deliver in-house.
 *       - flat IN_HOUSE_DELIVERY_FEE_CENTS, waived once the subtotal reaches
 *         FREE_DELIVERY_THRESHOLD_CENTS (free delivery applies in-house only).
 *   • Beyond the radius → the order is dispatched to a courier partner
 *     (Uber Direct / DoorDash Drive) and the customer pays the courier's
 *     live quoted fee (pass-through). The free-delivery waiver does NOT apply.
 *
 * The frontend mirrors FREE_DELIVERY_THRESHOLD_CENTS / IN_HOUSE_DELIVERY_FEE_CENTS
 * in astro-frontend/src/lib/constants.ts for display only — this file is the
 * authoritative copy used when an order is priced server-side.
 */

export const RESTAURANT_LAT = 40.7549;
export const RESTAURANT_LNG = -73.9739;

// Self-delivery radius. Beyond this we hand the drop-off to a courier partner.
export const OWN_DELIVERY_RADIUS_MILES = 2;

// In-house fee policy (integer cents).
export const IN_HOUSE_DELIVERY_FEE_CENTS = 300;   // $3.00
export const FREE_DELIVERY_THRESHOLD_CENTS = 3000; // $30.00 subtotal → free (in-house only)

/**
 * Resolve the customer-facing delivery fee (integer cents).
 *
 * Pure + deterministic so the order model, the /api/distance endpoint, and the
 * frontend all agree on the number.
 *
 * @param {object} p
 * @param {'delivery'|'pickup'} p.deliveryType
 * @param {boolean} p.withinRadius        true → in-house, false → courier partner
 * @param {number}  p.subtotalCents
 * @param {number|null} [p.partnerQuoteCents]  courier quote (required when !withinRadius)
 * @returns {number} fee in integer cents
 */
export function resolveDeliveryFeeCents({ deliveryType, withinRadius, subtotalCents, partnerQuoteCents = null }) {
  if (deliveryType !== 'delivery') return 0;

  if (withinRadius) {
    return subtotalCents >= FREE_DELIVERY_THRESHOLD_CENTS ? 0 : IN_HOUSE_DELIVERY_FEE_CENTS;
  }

  // Out of zone: pass through the courier's live quote. If a quote couldn't be
  // obtained we fail safe to the in-house fee rather than charging $0.
  return Number.isInteger(partnerQuoteCents) ? partnerQuoteCents : IN_HOUSE_DELIVERY_FEE_CENTS;
}
