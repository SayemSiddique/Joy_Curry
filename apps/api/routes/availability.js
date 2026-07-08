import { Router } from 'express';
import { getAvailability } from '../models/menu.js';

const router = Router();

/**
 * GET /api/availability  (public)
 *
 * Real-time stock snapshot for the storefront. Stock is a boolean in our
 * schema (no per-item quantity), so we report honest availability only —
 * `soldOut` lists the ids of active items currently out of stock. The client
 * badges those cards "Sold out today"; we never fabricate scarcity counts.
 */
router.get('/', async (_req, res, next) => {
  try {
    const items = await getAvailability();
    const soldOut = items.filter((i) => !i.inStock).map((i) => i.itemId);
    res.json({ soldOut, items });
  } catch (err) {
    next(err);
  }
});

export default router;
