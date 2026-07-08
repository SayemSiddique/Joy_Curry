import { Router } from 'express';
import { CURRENT_SPECIAL } from '../config/specials.js';
import { getMenuItemById } from '../models/menu.js';

const router = Router();

/**
 * GET /api/specials  (public)
 *
 * Returns the owner-curated weekly special, enriched with the live menu item's
 * name/description/image, or `{ special: null }` when none is configured or the
 * referenced item is missing/expired. Always a clean 200 — no 404 noise.
 */
router.get('/', async (_req, res, next) => {
  try {
    const special = CURRENT_SPECIAL;
    if (!special?.itemId) return res.json({ special: null });

    // Expired promotions self-retire.
    if (special.validUntil && new Date(special.validUntil) < new Date()) {
      return res.json({ special: null });
    }

    const item = await getMenuItemById(special.itemId);
    if (!item) return res.json({ special: null });

    res.json({
      special: {
        itemId: item.id,
        name: item.name,
        description: special.blurb ?? item.description,
        imageUrl: item.imageUrl ?? undefined,
        discountPct: special.discountPct ?? 0,
        validUntil: special.validUntil ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
