import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { validateIdParam, validateOrder } from '../middleware/validate.js';
import { createError } from '../middleware/errorHandler.js';
import { createOrder, getOrdersByUserId, getOrderById, setOrderDelivery } from '../models/order.js';
import { geocodeAddress, isWithinOwnDeliveryRadius, milesFromRestaurant } from '../services/deliveryService.js';
import { quoteCheapestPartner, dispatchExternalDelivery } from '../services/deliveryPartners/index.js';

const router = Router();

router.use(verifyToken);

router.post('/', validateOrder, async (req, res, next) => {
  try {
    const { deliveryType, deliveryAddress, items, idempotencyKey, scheduledFor,
            customerName, customerPhone } = req.body;

    // Route the delivery via geocoding. Within radius → in-house. Beyond →
    // re-quote the cheapest courier partner server-side (authoritative price).
    // Geocoding/quoting are non-fatal: any failure defaults safely to in-house.
    let deliveryPartner = 'in-house';
    let withinRadius = true;
    let partnerQuoteCents = null;
    let partnerQuote = null;
    let dropoffAddress = deliveryAddress;
    if (deliveryType === 'delivery' && deliveryAddress) {
      try {
        const geo = await geocodeAddress(deliveryAddress);
        if (geo) {
          withinRadius = isWithinOwnDeliveryRadius(geo.lat, geo.lng);
          dropoffAddress = geo.formattedAddress;
          if (!withinRadius) {
            const subtotalCents = items.reduce((sum, i) => sum + i.basePriceCents * i.qty, 0);
            partnerQuote = await quoteCheapestPartner({
              distanceMiles: milesFromRestaurant(geo.lat, geo.lng),
              dropoffAddress,
              orderValueCents: subtotalCents,
            });
            deliveryPartner = partnerQuote.provider;
            partnerQuoteCents = partnerQuote.feeCents;
          }
        }
        // geo === null (no Maps key) → withinRadius stays true → in-house.
      } catch (geoErr) {
        console.error('[orders] delivery routing error (defaulting to in-house):', geoErr.message);
        withinRadius = true;
        deliveryPartner = 'in-house';
        partnerQuoteCents = null;
      }
    }

    const { order, lineItems, duplicate } = await createOrder({
      userId: req.user.sub,
      deliveryType,
      deliveryAddress,
      items,
      idempotencyKey,
      scheduledFor,
      deliveryPartner,
      withinRadius,
      partnerQuoteCents,
    });

    // Auto-dispatch out-of-zone deliveries to the chosen courier (customer never
    // leaves our site). Non-fatal + idempotent: skipped on a replayed order.
    if (!duplicate && deliveryType === 'delivery' && !withinRadius && partnerQuote) {
      try {
        const dispatch = await dispatchExternalDelivery({
          provider: partnerQuote.provider,
          quoteId: partnerQuote.quoteId,
          simulated: partnerQuote.simulated,
          dropoffAddress,
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

    // Confirmation email moved to the Stripe webhook (payment_intent.succeeded)
    // — orders are card-required, so "confirmed" now means "paid".

    if (duplicate) res.set('X-Idempotent-Replay', 'true');
    res.status(duplicate ? 200 : 201).json({ order, lineItems });
  } catch (err) {
    next(err);
  }
});

// /me must be declared before /:id to avoid param capture
router.get('/me', async (req, res, next) => {
  try {
    const orders = await getOrdersByUserId(req.user.sub);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', validateIdParam, async (req, res, next) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) {
      return next(createError('NOT_FOUND', `Order "${req.params.id}" not found.`));
    }
    if (order.user_id !== req.user.sub && req.user.role !== 'admin') {
      return next(createError('FORBIDDEN', 'You do not have permission to view this order.'));
    }
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

export default router;
