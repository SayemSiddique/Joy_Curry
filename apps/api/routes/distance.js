import { Router } from 'express';
import { createError } from '../middleware/errorHandler.js';
import { geocodeAddress, isWithinOwnDeliveryRadius, milesFromRestaurant } from '../services/deliveryService.js';
import { IN_HOUSE_DELIVERY_FEE_CENTS, FREE_DELIVERY_THRESHOLD_CENTS } from '../config/delivery.js';
import { quoteCheapestPartner } from '../services/deliveryPartners/index.js';

const router = Router();

/**
 * GET /api/distance?address=...&subtotalCents=NNN
 *
 * Returns delivery eligibility + an estimated fee for an address:
 *   • within radius → in-house ($3, free at the $30 subtotal threshold)
 *   • beyond radius → cheapest courier-partner quote (pass-through), with a
 *     quoteId the order route can use to lock the price.
 *
 * When GOOGLE_MAPS_API_KEY is not configured, returns a stub (withinRadius:true)
 * so the order flow degrades gracefully to in-house until the key is provided.
 */
router.get('/', async (req, res, next) => {
  try {
    const { address } = req.query;
    if (!address || typeof address !== 'string' || !address.trim()) {
      return next(createError('VALIDATION_ERROR', 'address query parameter is required'));
    }
    const subtotalCents = Number.parseInt(req.query.subtotalCents, 10) || 0;

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return res.json({
        withinRadius: true,
        distanceMiles: 0,
        deliveryPartner: 'in-house',
        deliveryFeeCents: subtotalCents >= FREE_DELIVERY_THRESHOLD_CENTS ? 0 : IN_HOUSE_DELIVERY_FEE_CENTS,
        freeDeliveryThresholdCents: FREE_DELIVERY_THRESHOLD_CENTS,
        geocoded: false,
        note: 'Geocoding not configured — defaulting to in-house delivery.',
      });
    }

    const geo = await geocodeAddress(address.trim());
    if (!geo) {
      return next(createError('VALIDATION_ERROR', 'Could not geocode the provided address.'));
    }

    const distanceMiles = milesFromRestaurant(geo.lat, geo.lng);
    const withinRadius  = isWithinOwnDeliveryRadius(geo.lat, geo.lng);

    if (withinRadius) {
      return res.json({
        withinRadius: true,
        distanceMiles: round2(distanceMiles),
        deliveryPartner: 'in-house',
        deliveryFeeCents: subtotalCents >= FREE_DELIVERY_THRESHOLD_CENTS ? 0 : IN_HOUSE_DELIVERY_FEE_CENTS,
        freeDeliveryThresholdCents: FREE_DELIVERY_THRESHOLD_CENTS,
        formattedAddress: geo.formattedAddress,
        geocoded: true,
      });
    }

    // Out of zone → cheapest courier-partner quote (pass-through fee).
    const quote = await quoteCheapestPartner({
      distanceMiles,
      dropoffAddress: geo.formattedAddress,
      orderValueCents: subtotalCents,
    });

    return res.json({
      withinRadius: false,
      distanceMiles: round2(distanceMiles),
      deliveryPartner: quote.provider,
      deliveryFeeCents: quote.feeCents,
      quoteId: quote.quoteId,
      etaMinutes: quote.etaMinutes,
      simulated: quote.simulated,
      formattedAddress: geo.formattedAddress,
      geocoded: true,
    });
  } catch (err) {
    next(err);
  }
});

function round2(n) {
  return Math.round(n * 100) / 100;
}

export default router;
