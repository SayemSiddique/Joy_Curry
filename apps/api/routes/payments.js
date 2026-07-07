// POST /api/payments/intent — Stripe payment intent stub.
// Not yet activated. Wire into server.js and implement paymentService.js
// when the owner approves the site for live payment processing.

import express from 'express';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/payments/intent
// Authenticated — requires a valid JWT.
// Body: { amountCents: number, currency: string }
router.post('/intent', verifyToken, (_req, res) => {
  res.status(503).json({
    error: {
      code: 'PAYMENT_NOT_ACTIVATED',
      message: 'Online payment processing is not yet available. Please pay at pickup or on delivery.',
    },
  });
});

export default router;
