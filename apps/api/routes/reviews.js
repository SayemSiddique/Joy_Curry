import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { getReviewsByItem, upsertReview } from '../models/review.js';
import { getMenuItemById } from '../models/menu.js';

const router = Router();

const MAX_COMMENT = 500;

/**
 * GET /api/reviews?itemId=...  (public)
 * Returns up to 50 reviews for a menu item, newest first.
 */
router.get('/', async (req, res, next) => {
  try {
    const itemId = req.query.itemId;
    if (!itemId || typeof itemId !== 'string') {
      return next(createError('VALIDATION_ERROR', 'itemId query parameter is required.'));
    }
    const reviews = await getReviewsByItem(itemId);
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reviews  (JWT)  body: { itemId, rating, comment? }
 *
 * Text + star rating only (no photo storage yet). One review per user per item
 * — resubmitting edits the existing review. The item must exist.
 */
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { itemId, rating, comment } = req.body ?? {};

    if (!itemId || typeof itemId !== 'string') {
      return next(createError('VALIDATION_ERROR', 'itemId is required.'));
    }
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return next(createError('VALIDATION_ERROR', 'rating must be an integer from 1 to 5.'));
    }
    const text = typeof comment === 'string' ? comment.trim().slice(0, MAX_COMMENT) : '';

    const item = await getMenuItemById(itemId);
    if (!item) return next(createError('NOT_FOUND', `Menu item "${itemId}" not found.`));

    const review = await upsertReview({
      itemId,
      userId: req.user.sub,
      rating: ratingNum,
      comment: text,
    });
    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
});

export default router;
