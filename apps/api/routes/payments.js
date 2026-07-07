// Stripe payments (Session 4 — activated in test mode).
//
//   POST /api/payments/intent   (JWT) — get-or-create the PaymentIntent for an
//                               order; amount is the server-computed total.
//   POST /api/payments/webhook  (Stripe signature) — payment_intent.succeeded
//                               marks the order paid; mounted in server.js with
//                               express.raw BEFORE the JSON body parser.

import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import {
  getOrderById,
  setOrderPaymentIntent,
  markOrderPaid,
  markOrderPaymentFailed,
  recordPaymentEvent,
} from '../models/order.js';
import { getUserById } from '../models/user.js';
import { sendOrderConfirmation } from '../utils/email.js';
import {
  getOrCreateIntentForOrder,
  constructWebhookEvent,
  isStripeConfigured,
} from '../services/paymentService.js';

const router = express.Router();

// POST /api/payments/intent
// Body: { orderId } — the amount is NEVER taken from the client; it is the
// total_cents already computed and stored server-side when the order was created.
router.post('/intent', verifyToken, async (req, res, next) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({
        error: {
          code: 'PAYMENT_NOT_CONFIGURED',
          message: 'Online payment processing is temporarily unavailable.',
        },
      });
    }

    const { orderId } = req.body ?? {};
    if (!orderId || typeof orderId !== 'string' || orderId.length > 64) {
      return next(createError('VALIDATION_ERROR', 'orderId is required.'));
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return next(createError('NOT_FOUND', `Order "${orderId}" not found.`));
    }
    if (order.user_id !== req.user.sub) {
      return next(createError('FORBIDDEN', 'You do not have permission to pay for this order.'));
    }
    if (order.payment_status === 'paid') {
      return next(createError('CONFLICT', 'This order has already been paid.'));
    }
    if (order.status === 'cancelled') {
      return next(createError('CONFLICT', 'This order was cancelled and cannot be paid.'));
    }

    const { clientSecret, paymentIntentId } = await getOrCreateIntentForOrder(order);
    if (order.payment_intent_id !== paymentIntentId) {
      await setOrderPaymentIntent(order.id, paymentIntentId);
    }

    res.json({ clientSecret, amountCents: order.total_cents });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/webhook — mounted with express.raw in server.js.
// Responds 400 on bad signatures, 200 otherwise (5xx would make Stripe retry).
export async function webhookHandler(req, res) {
  let event;
  try {
    event = constructWebhookEvent(req.body, req.headers['stripe-signature']);
  } catch (err) {
    console.error('[payments] webhook signature verification failed:', err.message);
    return res.status(400).json({
      error: { code: 'WEBHOOK_SIGNATURE_INVALID', message: 'Invalid webhook signature.' },
    });
  }

  try {
    const intent = event.data?.object;
    const orderId = intent?.metadata?.orderId ?? null;

    switch (event.type) {
      case 'payment_intent.succeeded': {
        if (!orderId) break;
        const order = await markOrderPaid(orderId, intent.id);
        if (order) {
          // Confirmation email is sent on PAYMENT success (not order creation).
          // Fire-and-forget: the webhook must respond fast; email is best-effort.
          const full = await getOrderById(orderId);
          const user = await getUserById(order.user_id);
          if (user?.email && full) {
            sendOrderConfirmation(full, full.lineItems, user.email).catch((err) =>
              console.error('[payments] confirmation email error:', err)
            );
          }
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        if (!orderId) break;
        await markOrderPaymentFailed(orderId);
        break;
      }
      default:
        // Unhandled event types are recorded (audit trail) and acknowledged.
        break;
    }

    // Ledger is recorded AFTER successful processing (a mid-processing failure
    // must leave the event unrecorded so Stripe's retry re-runs it). Double
    // side effects on redelivery are prevented inside markOrderPaid's
    // conditional UPDATE, not by this ledger — it is audit + duplicate marker.
    const isNew = await recordPaymentEvent(event.id, event.type, orderId);
    res.json({ received: true, duplicate: !isNew });
  } catch (err) {
    // Processing failed AFTER signature verification — respond 500 so Stripe
    // retries (the event is only in the ledger if recordPaymentEvent ran, and
    // a retry that hits the ledger short-circuits above).
    console.error('[payments] webhook processing error:', err);
    res.status(500).json({
      error: { code: 'WEBHOOK_PROCESSING_ERROR', message: 'Webhook processing failed.' },
    });
  }
}

export default router;
