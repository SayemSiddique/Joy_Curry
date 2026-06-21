import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { getSlotAvailability, reserveSlot } from '../models/order.js';
import {
  DEFAULT_SLOT_CAPACITY,
  generateSlotTimes,
  isBookableDate,
  isPastSlot,
  isValidDateStr,
  isValidSlotTime,
} from '../config/slots.js';

const router = Router();

/**
 * GET /api/slots?date=YYYY-MM-DD  (public)
 *
 * Returns the full 15-minute slot grid for a bookable day (today or tomorrow,
 * restaurant-local). Each slot carries derived capacity info so the frontend
 * can colour it (available / filling / full). Past slots on today are omitted.
 */
router.get('/', async (req, res, next) => {
  try {
    const { date } = req.query;

    if (!isValidDateStr(date)) {
      return next(createError('VALIDATION_ERROR', 'date query param must be YYYY-MM-DD.'));
    }
    if (!isBookableDate(date)) {
      return next(createError('VALIDATION_ERROR', 'Scheduling is only available for today or tomorrow.'));
    }

    // Existing reservation counts for the day, keyed by slot_time.
    const booked = await getSlotAvailability(date);
    const bookedMap = new Map(booked.map((s) => [s.slotTime, s]));

    const slots = generateSlotTimes(date)
      .filter((slotTime) => !isPastSlot(slotTime))
      .map((slotTime) => {
        const existing = bookedMap.get(slotTime);
        const capacity = existing?.capacity ?? DEFAULT_SLOT_CAPACITY;
        const bookedCount = existing?.booked ?? 0;
        const remaining = Math.max(0, capacity - bookedCount);
        return {
          slotTime,
          capacity,
          booked: bookedCount,
          remaining,
          soldOut: remaining === 0,
          filling: remaining > 0 && remaining < 3,
        };
      });

    res.json({ date, slots });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/slots/reserve  (JWT)  body: { slotTime }
 *
 * Atomically books one seat in the given slot. Called right before order
 * submission. Returns 409 if the slot filled up first.
 */
router.post('/reserve', verifyToken, async (req, res, next) => {
  try {
    const { slotTime } = req.body;

    if (!isValidSlotTime(slotTime)) {
      return next(createError('VALIDATION_ERROR', 'slotTime must be "YYYY-MM-DDTHH:MM".'));
    }
    const [datePart] = slotTime.split('T');
    if (!isBookableDate(datePart)) {
      return next(createError('VALIDATION_ERROR', 'Scheduling is only available for today or tomorrow.'));
    }
    if (isPastSlot(slotTime)) {
      return next(createError('VALIDATION_ERROR', 'That time slot has already passed.'));
    }

    const slot = await reserveSlot(slotTime);
    if (!slot) {
      return next(createError('CONFLICT', 'That time slot is fully booked. Please choose another.'));
    }

    res.status(201).json({ slot });
  } catch (err) {
    next(err);
  }
});

export default router;
