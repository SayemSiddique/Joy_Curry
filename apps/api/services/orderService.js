// Application/domain service for order creation.
//
// Owns the checkout orchestration that used to live inline in routes/orders.js:
// route the delivery (geocode → radius → courier quote), price + persist the
// order (models/order.js), then auto-dispatch out-of-zone deliveries to a
// courier. Keeping this out of the HTTP handler makes the flow unit-testable
// and keeps the route thin (parse → delegate → respond).
import { createOrder, setOrderDelivery } from '../models/order.js';
import { geocodeAddress, isWithinOwnDeliveryRadius, milesFromRestaurant } from './deliveryService.js';
import { quoteCheapestPartner, dispatchExternalDelivery } from './deliveryPartners/index.js';

// Neutral in-house routing — the safe default for pickup, in-radius delivery,
// or any geocoding/quoting failure.
function inHouseRouting(deliveryAddress) {
  return {
    deliveryPartner: 'in-house',
    withinRadius: true,
    partnerQuoteCents: null,
    partnerQuote: null,
    dropoffAddress: deliveryAddress,
  };
}

/**
 * Decide how a delivery order should be routed BEFORE it is priced/persisted.
 * Within the in-house radius → in-house. Beyond → re-quote the cheapest courier
 * partner server-side (the authoritative price). Non-fatal: any geocoding or
 * quoting failure defaults safely to in-house.
 *
 * @returns {Promise<{deliveryPartner:string, withinRadius:boolean,
 *   partnerQuoteCents:number|null, partnerQuote:object|null, dropoffAddress:string}>}
 */
async function routeDelivery({ deliveryType, deliveryAddress, items }) {
  if (deliveryType !== 'delivery' || !deliveryAddress) {
    return inHouseRouting(deliveryAddress);
  }

  try {
    const geo = await geocodeAddress(deliveryAddress);
    // geo === null (no Maps key) → withinRadius stays true → in-house.
    if (!geo) return inHouseRouting(deliveryAddress);

    const withinRadius = isWithinOwnDeliveryRadius(geo.lat, geo.lng);
    if (withinRadius) {
      return { ...inHouseRouting(geo.formattedAddress), withinRadius: true };
    }

    const subtotalCents = items.reduce((sum, i) => sum + i.basePriceCents * i.qty, 0);
    const partnerQuote = await quoteCheapestPartner({
      distanceMiles: milesFromRestaurant(geo.lat, geo.lng),
      dropoffAddress: geo.formattedAddress,
      orderValueCents: subtotalCents,
    });
    return {
      deliveryPartner: partnerQuote.provider,
      withinRadius: false,
      partnerQuoteCents: partnerQuote.feeCents,
      partnerQuote,
      dropoffAddress: geo.formattedAddress,
    };
  } catch (geoErr) {
    console.error('[orders] delivery routing error (defaulting to in-house):', geoErr.message);
    return inHouseRouting(deliveryAddress);
  }
}

/**
 * Dispatch an out-of-zone order to the chosen courier and persist the result.
 * Non-fatal: a dispatch failure is logged, never thrown, so the customer's order
 * still completes. Mutates `order` in place with the external delivery id/partner
 * so the caller's response reflects the dispatch.
 */
async function dispatchOutOfZone({ order, lineItems, routing, customerName, customerPhone }) {
  try {
    const dispatch = await dispatchExternalDelivery({
      provider: routing.partnerQuote.provider,
      quoteId: routing.partnerQuote.quoteId,
      simulated: routing.partnerQuote.simulated,
      dropoffAddress: routing.dropoffAddress,
      dropoffName: customerName,
      dropoffPhone: customerPhone,
      orderValueCents: order.subtotal_cents,
      manifestItems: lineItems.map((li) => ({ name: li.item_name, quantity: li.qty })),
    });
    await setOrderDelivery(order.id, {
      externalDeliveryId: dispatch.externalDeliveryId,
      deliveryPartner: dispatch.provider,
    });
    order.external_delivery_id = dispatch.externalDeliveryId;
    order.delivery_partner = dispatch.provider;
  } catch (dispatchErr) {
    console.error('[orders] courier dispatch error:', dispatchErr.message);
  }
}

/**
 * Create an order end-to-end: route its delivery, price + persist it, then
 * auto-dispatch out-of-zone deliveries to a courier (the customer never leaves
 * our site). Dispatch is idempotent — skipped on a replayed order.
 *
 * @returns {Promise<{order:object, lineItems:object[], duplicate:boolean}>}
 */
export async function createOrderWithDelivery({
  userId, deliveryType, deliveryAddress, items, idempotencyKey, scheduledFor,
  customerName, customerPhone, specialInstructions, dropOffInstructions,
}) {
  const routing = await routeDelivery({ deliveryType, deliveryAddress, items });

  const { order, lineItems, duplicate } = await createOrder({
    userId,
    deliveryType,
    deliveryAddress,
    items,
    idempotencyKey,
    scheduledFor,
    deliveryPartner: routing.deliveryPartner,
    withinRadius: routing.withinRadius,
    partnerQuoteCents: routing.partnerQuoteCents,
    notes: specialInstructions ?? null,
    dropOffInstructions: dropOffInstructions ?? null,
  });

  const shouldDispatch =
    !duplicate && deliveryType === 'delivery' && !routing.withinRadius && routing.partnerQuote;
  if (shouldDispatch) {
    await dispatchOutOfZone({ order, lineItems, routing, customerName, customerPhone });
  }

  return { order, lineItems, duplicate };
}
