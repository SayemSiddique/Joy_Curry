import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createUser, getUserByEmail, getUserById, updateUser } from '../models/user.js';
import { verifyToken } from '../middleware/auth.js';
import { validateRegister, validateLogin } from '../middleware/validate.js';
import { createError } from '../middleware/errorHandler.js';
import { buildRewardsSummary } from '../config/rewards.js';

const router = Router();
const SALT_ROUNDS = 10;

function issueToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
  );
}

router.post('/register', validateRegister, async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const existing = await getUserByEmail(email);
    if (existing) {
      return next(createError('EMAIL_TAKEN', 'An account with that email already exists.'));
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser({ name: name.trim(), email, phone: phone ?? null, passwordHash });
    const token = issueToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const record = await getUserByEmail(email);
    if (!record) {
      return next(createError('INVALID_CREDENTIALS', 'Invalid email or password.'));
    }

    const match = await bcrypt.compare(password, record.passwordHash);
    if (!match) {
      return next(createError('INVALID_CREDENTIALS', 'Invalid email or password.'));
    }

    const { passwordHash: _stripped, ...user } = record;
    const token = issueToken(user);

    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const user = await getUserById(req.user.sub);
    if (!user) return next(createError('NOT_FOUND', 'User not found.'));
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.get('/me/rewards', verifyToken, async (req, res, next) => {
  try {
    const user = await getUserById(req.user.sub);
    if (!user) return next(createError('NOT_FOUND', 'User not found.'));

    const summary = buildRewardsSummary(user.rewardsPoints);
    res.json({
      rewards: {
        ...summary,
        lifetimeCents: user.rewardsLifetimeCents,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/me', verifyToken, async (req, res, next) => {
  try {
    const { name, phone, birthday, dietaryPrefs, addresses } = req.body;
    const user = await updateUser(req.user.sub, { name, phone, birthday, dietaryPrefs, addresses });
    if (!user) return next(createError('NOT_FOUND', 'User not found.'));
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
