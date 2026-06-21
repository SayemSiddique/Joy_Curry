import { Router } from 'express';
import { createError } from '../middleware/errorHandler.js';
import { geocodeAddress, isWithinOwnDeliveryRadius, haversineMiles } from '../services/deliveryService.js';

const router = Router();

/**
 * GET /api/distance?address=...
 *
 * Returns delivery eligibility for a given address.
 * When GOOGLE_MAPS_API_KEY is not configured, returns a stub (withinRadius: true)
 * so the order flow degrades gracefully until the key is provided.
 */
router.get('/', async (req, res, next) => {
  try {
    const { address } = req.query;
    if (!address || typeof address !== 'string' || !address.trim()) {
      return next(createError('VALIDATION_ERROR', 'address query parameter is required'));
    }

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      return res.json({
        withinRadius: true,
        distanceMiles: 0,
        deliveryPartner: 'in-house',
        geocoded: false,
        note: 'Geocoding not configured — defaulting to in-house delivery.',
      });
    }

    const geo = await geocodeAddress(address.trim());
    if (!geo) {
      return next(createError('VALIDATION_ERROR', 'Could not geocode the provided address.'));
    }

    const RESTAURANT_LAT = 40.7549;
    const RESTAURANT_LNG = -73.9739;
    const distanceMiles = haversineMiles(RESTAURANT_LAT, RESTAURANT_LNG, geo.lat, geo.lng);
    const withinRadius  = distanceMiles <= 4;
    const deliveryPartner = withinRadius ? 'in-house' : 'uber';

    return res.json({
      withinRadius,
      distanceMiles: Math.round(distanceMiles * 100) / 100,
      deliveryPartner,
      formattedAddress: geo.formattedAddress,
      geocoded: true,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
