import { Router } from 'express';
import {
  getAllMenuItemsAdmin,
  createMenuItem,
  updateMenuItem,
  softDeleteMenuItem,
  toggleItemStock,
} from '../models/menu.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { requireBody, validateIdParam } from '../middleware/validate.js';
import { createError } from '../middleware/errorHandler.js';

const router = Router();

router.use(verifyToken, requireRole('admin'));

router.get('/menu', async (req, res, next) => {
  try {
    const items = await getAllMenuItemsAdmin();
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/menu',
  requireBody(['id', 'name', 'category', 'basePrice']),
  async (req, res, next) => {
    try {
      const item = await createMenuItem(req.body);
      res.status(201).json({ data: item });
    } catch (err) {
      next(err);
    }
  }
);

router.put('/menu/:id', validateIdParam, async (req, res, next) => {
  try {
    const item = await updateMenuItem(req.params.id, req.body);
    if (!item) return next(createError('NOT_FOUND', `Menu item "${req.params.id}" not found.`));
    res.json({ data: item });
  } catch (err) {
    next(err);
  }
});

router.delete('/menu/:id', validateIdParam, async (req, res, next) => {
  try {
    const result = await softDeleteMenuItem(req.params.id);
    if (!result) return next(createError('NOT_FOUND', `Menu item "${req.params.id}" not found.`));
    res.json({ data: result });
  } catch (err) {
    if (err.code === 'CONFLICT') return res.status(409).json({ error: { code: 'CONFLICT', message: err.message } });
    next(err);
  }
});

router.patch('/menu/:id/stock', validateIdParam, async (req, res, next) => {
  try {
    const { inStock } = req.body;
    if (typeof inStock !== 'boolean') {
      return next(createError('VALIDATION_ERROR', 'Field "inStock" must be a boolean.'));
    }
    const result = await toggleItemStock(req.params.id, inStock);
    if (!result) return next(createError('NOT_FOUND', `Menu item "${req.params.id}" not found.`));
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
