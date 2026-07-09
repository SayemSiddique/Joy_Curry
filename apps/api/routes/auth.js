import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createUser, getUserByEmail } from '../models/user.js';
import { createOtp, getActiveOtp, incrementOtpAttempts, consumeOtp } from '../models/otp.js';
import { sendOtpEmail } from '../utils/email.js';
import { createError } from '../middleware/errorHandler.js';

const router = Router();
const SALT_ROUNDS = 10;
const OTP_TTL_MS = 10 * 60 * 1000;   // 10 minutes
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function issueToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
  );
}

// Short-lived ticket that proves the email was OTP-verified, so the
// create-account step doesn't have to re-check the code.
function issueRegisterTicket(email) {
  return jwt.sign(
    { email: email.toLowerCase().trim(), purpose: 'otp_register' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function randomCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/** POST /api/auth/otp/request { email } — email a 6-digit code. */
router.post('/otp/request', async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? '').toLowerCase().trim();
    if (!EMAIL_RE.test(email)) {
      return next(createError('VALIDATION_ERROR', 'A valid email is required.'));
    }

    const code = randomCode();
    const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
    await createOtp({ email, codeHash, expiresAt });

    await sendOtpEmail(email, code);

    // In local dev (no Resend key) surface the code so the flow is testable.
    const devCode =
      !process.env.RESEND_API_KEY && process.env.NODE_ENV !== 'production'
        ? code
        : undefined;

    res.json({ sent: true, ...(devCode ? { devCode } : {}) });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/otp/verify { email, code } — validate the code. */
router.post('/otp/verify', async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? '').toLowerCase().trim();
    const code = String(req.body?.code ?? '').trim();
    if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
      return next(createError('VALIDATION_ERROR', 'Email and a 6-digit code are required.'));
    }

    const record = await getActiveOtp(email);
    if (!record) {
      return next(createError('VALIDATION_ERROR', 'No active code. Please request a new one.'));
    }
    if (new Date(record.expires_at).getTime() < Date.now()) {
      return next(createError('VALIDATION_ERROR', 'This code has expired. Please request a new one.'));
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      return next(createError('VALIDATION_ERROR', 'Too many attempts. Please request a new code.'));
    }

    const match = await bcrypt.compare(code, record.code_hash);
    if (!match) {
      await incrementOtpAttempts(record.id);
      return next(createError('VALIDATION_ERROR', 'Incorrect code. Please try again.'));
    }

    await consumeOtp(record.id);

    const existing = await getUserByEmail(email);
    if (existing) {
      const { passwordHash: _stripped, ...user } = existing;
      const token = issueToken(user);
      return res.json({ exists: true, token, user });
    }

    // New user — hand back a ticket to complete registration.
    res.json({ exists: false, ticket: issueRegisterTicket(email) });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/otp/register { ticket, name, phone? } — finish sign-up. */
router.post('/otp/register', async (req, res, next) => {
  try {
    const { ticket, name, phone } = req.body ?? {};
    if (!ticket || typeof name !== 'string' || name.trim().length < 2) {
      return next(createError('VALIDATION_ERROR', 'Name (2+ characters) is required.'));
    }

    let payload;
    try {
      payload = jwt.verify(ticket, process.env.JWT_SECRET);
    } catch {
      return next(createError('TOKEN_INVALID', 'Your verification expired. Please start again.'));
    }
    if (payload.purpose !== 'otp_register' || !payload.email) {
      return next(createError('TOKEN_INVALID', 'Invalid verification. Please start again.'));
    }

    const email = String(payload.email).toLowerCase().trim();
    const existing = await getUserByEmail(email);
    if (existing) {
      return next(createError('EMAIL_TAKEN', 'An account with that email already exists.'));
    }

    // OTP accounts are passwordless — the column is nullable (migration 010).
    const user = await createUser({
      name: name.trim(),
      email,
      phone: phone?.trim() || null,
      passwordHash: null,
    });
    const token = issueToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

export default router;
