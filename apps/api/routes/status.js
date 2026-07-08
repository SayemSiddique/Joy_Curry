import { Router } from 'express';
import { OPEN_HOUR, CLOSE_HOUR, localTimeStr } from '../config/slots.js';
import { getKitchenLoad } from '../models/order.js';

const router = Router();

/**
 * GET /api/status  (public)
 *
 * Live kitchen status for the storefront ticker. Everything here is REAL:
 *   - isOpen is derived from the restaurant's configured hours in America/New_York
 *     (the same OPEN_HOUR/CLOSE_HOUR the slot grid uses), so it stays correct
 *     across DST without a hard-coded offset.
 *   - waitMinutes is a load-aware estimate: a base prep time plus a bump for
 *     every few orders currently in the kitchen. No fabricated numbers.
 */
router.get('/', async (_req, res, next) => {
  try {
    // Current restaurant-local hour (0–23) from the DST-aware "HH:MM" helper.
    const hour = Number(localTimeStr().slice(0, 2));
    const isOpen = hour >= OPEN_HOUR && hour < CLOSE_HOUR;

    if (!isOpen) {
      return res.json({
        isOpen: false,
        message: `Kitchen closed · Open daily ${formatHour(OPEN_HOUR)}–${formatHour(CLOSE_HOUR)}`,
      });
    }

    const activeOrders = await getKitchenLoad();
    // Base prep 20 min + 5 min for every 3 orders in the queue, capped at 60.
    const waitMinutes = Math.min(20 + Math.floor(activeOrders / 3) * 5, 60);

    res.json({ isOpen: true, waitMinutes });
  } catch (err) {
    next(err);
  }
});

function formatHour(h) {
  const period = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${period}`;
}

export default router;
