import { Router } from 'express';
import { getAllMenuItems, getMenuItemById } from '../models/menu.js';
import { sanitizeMenuQuery, validateIdParam } from '../middleware/validate.js';
import { createError } from '../middleware/errorHandler.js';

const router = Router();

router.get('/', sanitizeMenuQuery, async (req, res, next) => {
  try {
    const items = await getAllMenuItems(req.menuFilters);
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', validateIdParam, async (req, res, next) => {
  try {
    const item = await getMenuItemById(req.params.id);
    if (!item) return next(createError('NOT_FOUND', `Menu item "${req.params.id}" not found.`));
    res.json({ data: item });
  } catch (err) {
    next(err);
  }
});

export default router;
