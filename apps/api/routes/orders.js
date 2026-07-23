import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { validateIdParam, validateOrder } from '../middleware/validate.js';
import { createError } from '../middleware/errorHandler.js';
import { getOrdersByUserId, getOrderById } from '../models/order.js';
import { createOrderWithDelivery } from '../services/orderService.js';

const router = Router();

router.use(verifyToken);

router.post('/', validateOrder, async (req, res, next) => {
  try {
    const { deliveryType, deliveryAddress, items, idempotencyKey, scheduledFor,
            customerName, customerPhone, specialInstructions, dropOffInstructions } = req.body;

    // Delivery routing, pricing/persistence, and courier auto-dispatch all live
    // in the order service. Confirmation email is sent later from the Stripe
    // webhook (payment_intent.succeeded) — orders are card-required, so
    // "confirmed" means "paid".
    const { order, lineItems, duplicate } = await createOrderWithDelivery({
      userId: req.user.sub,
      deliveryType,
      deliveryAddress,
      items,
      idempotencyKey,
      scheduledFor,
      customerName,
      customerPhone,
      specialInstructions,
      dropOffInstructions,
    });

    if (duplicate) res.set('X-Idempotent-Replay', 'true');
    res.status(duplicate ? 200 : 201).json({ order, lineItems });
  } catch (err) {
    next(err);
  }
});

// /me must be declared before /:id to avoid param capture
router.get('/me', async (req, res, next) => {
  try {
    const orders = await getOrdersByUserId(req.user.sub);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', validateIdParam, async (req, res, next) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) {
      return next(createError('NOT_FOUND', `Order "${req.params.id}" not found.`));
    }
    if (order.user_id !== req.user.sub && req.user.role !== 'admin') {
      return next(createError('FORBIDDEN', 'You do not have permission to view this order.'));
    }
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

export default router;
