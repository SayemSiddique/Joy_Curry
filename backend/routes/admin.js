import { Router } from 'express';
import {
  getAllMenuItemsAdmin,
  createMenuItem,
  updateMenuItem,
  softDeleteMenuItem,
  toggleItemStock,
} from '../models/menu.js';
import {
  getAllOrders,
  updateOrderStatus,
  getDashboardStats,
} from '../models/order.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { requireBody, validateIdParam } from '../middleware/validate.js';
import { createError } from '../middleware/errorHandler.js';
import { generateMenuItemId } from '../utils/helpers.js';

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
  requireBody(['name', 'category']),
  async (req, res, next) => {
    try {
      const body = { ...req.body };
      // Auto-generate id if not provided (frontend doesn't send one)
      if (!body.id) body.id = generateMenuItemId(body.name);
      // Accept basePriceCents (cents int) OR basePrice (dollars float)
      if (body.basePriceCents !== undefined && body.basePrice === undefined) {
        body.basePrice = body.basePriceCents / 100;
      }
      if (!body.basePrice || body.basePrice <= 0) {
        return next(createError('VALIDATION_ERROR', 'A valid price is required'));
      }
      const item = await createMenuItem(body);
      res.status(201).json({ data: item });
    } catch (err) {
      next(err);
    }
  }
);

router.put('/menu/:id', validateIdParam, async (req, res, next) => {
  try {
    const body = { ...req.body };
    // Accept basePriceCents (cents int) OR basePrice (dollars float)
    if (body.basePriceCents !== undefined && body.basePrice === undefined) {
      body.basePrice = body.basePriceCents / 100;
    }
    const item = await updateMenuItem(req.params.id, body);
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

// ── Order management ──────────────────────────────────────────────────────
const VALID_STATUSES = ['pending', 'confirmed', 'ready', 'completed', 'cancelled'];

router.get('/orders', async (req, res, next) => {
  try {
    const orders = await getAllOrders(200);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

router.patch('/orders/:id/status', validateIdParam, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return next(createError('VALIDATION_ERROR', `status must be one of: ${VALID_STATUSES.join(', ')}`));
    }
    const order = await updateOrderStatus(req.params.id, status);
    if (!order) return next(createError('NOT_FOUND', `Order "${req.params.id}" not found.`));
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

// ── Dashboard stats ───────────────────────────────────────────────────────
router.get('/dashboard', async (_req, res, next) => {
  try {
    const stats = await getDashboardStats();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

export default router;
