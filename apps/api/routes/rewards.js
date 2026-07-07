import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { getUserById } from '../models/user.js';
import { getMenuItemById, getAllMenuItems } from '../models/menu.js';
import { getMilestoneByPoints } from '../config/rewards.js';

const router = Router();

/**
 * POST /api/rewards/redeem  (JWT)  body: { milestonePoints, itemId? }
 *
 * Validates that the customer has enough points to unlock the requested
 * milestone, then returns a zero-price reward line item to add to the cart.
 * Points are not deducted here — they are burned at order time via the
 * order's points_redeemed column (wired up in Phase 3-D checkout).
 *
 * If `itemId` is supplied it must belong to the milestone's reward category;
 * otherwise the cheapest in-stock item in that category is chosen.
 */
router.post('/redeem', verifyToken, async (req, res, next) => {
  try {
    const { milestonePoints, itemId } = req.body;

    const milestone = getMilestoneByPoints(milestonePoints);
    if (!milestone) {
      return next(createError('VALIDATION_ERROR', 'Unknown reward milestone.'));
    }

    const user = await getUserById(req.user.sub);
    if (!user) return next(createError('NOT_FOUND', 'User not found.'));

    if (user.rewardsPoints < milestone.points) {
      return next(createError(
        'VALIDATION_ERROR',
        `You need ${milestone.points - user.rewardsPoints} more points to redeem "${milestone.label}".`
      ));
    }

    // Resolve the reward item: a caller-chosen item, or the cheapest eligible one.
    let rewardItem;
    if (itemId) {
      const item = await getMenuItemById(itemId);
      if (!item || item.category !== milestone.itemCategory) {
        return next(createError('VALIDATION_ERROR', `Item "${itemId}" is not eligible for this reward.`));
      }
      if (!item.inStock) {
        return next(createError('CONFLICT', `"${item.name}" is currently out of stock.`));
      }
      rewardItem = item;
    } else {
      const candidates = await getAllMenuItems({ category: milestone.itemCategory, inStock: 1 });
      if (candidates.length === 0) {
        return next(createError('CONFLICT', 'No reward items are available right now. Please try again later.'));
      }
      rewardItem = candidates.reduce((min, c) => (c.basePriceCents < min.basePriceCents ? c : min));
    }

    res.json({
      milestone,
      reward: {
        itemId:             rewardItem.id,
        itemName:           rewardItem.name,
        itemType:           'regular',
        basePriceCents:     0,
        originalPriceCents: rewardItem.basePriceCents,
        pointsCost:         milestone.points,
        isReward:           true,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
