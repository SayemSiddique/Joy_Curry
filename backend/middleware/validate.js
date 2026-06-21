import { createError } from './errorHandler.js';

const ID_PATTERN = /^[a-zA-Z0-9-]+$/;

export function validateIdParam(req, res, next) {
  const { id } = req.params;
  if (!id || !ID_PATTERN.test(id)) {
    return next(createError('VALIDATION_ERROR', `Invalid id parameter: "${id}"`));
  }
  next();
}

export function requireBody(fields) {
  return (req, res, next) => {
    const missing = fields.filter(
      (f) => req.body[f] === undefined || req.body[f] === null || req.body[f] === ''
    );
    if (missing.length > 0) {
      return next(
        createError('VALIDATION_ERROR', `Missing required fields: ${missing.join(', ')}`)
      );
    }
    next();
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s\-().]{7,20}$/;

export function validateRegister(req, res, next) {
  const { name, email, password, phone } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('name must be at least 2 characters');
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    errors.push('valid email is required');
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('password must be at least 8 characters');
  }
  if (phone && !PHONE_PATTERN.test(phone)) {
    errors.push('invalid phone format');
  }

  if (errors.length > 0) {
    return next(createError('VALIDATION_ERROR', errors.join('; ')));
  }
  next();
}

export function validateLogin(req, res, next) {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !EMAIL_PATTERN.test(email)) errors.push('valid email is required');
  if (!password || typeof password !== 'string') errors.push('password is required');

  if (errors.length > 0) {
    return next(createError('VALIDATION_ERROR', errors.join('; ')));
  }
  next();
}

const DELIVERY_TYPES   = new Set(['delivery', 'pickup']);
const ITEM_TYPES       = new Set(['regular', 'bundle']);
const MIN_ORDER_CENTS  = 1000; // $10.00 minimum for delivery

const SLOT_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function validateOrder(req, res, next) {
  const { deliveryType, deliveryAddress, items, idempotencyKey, scheduledFor } = req.body;
  const errors = [];

  // scheduledFor is optional: null/undefined = ASAP, else a "YYYY-MM-DDTHH:MM" slot string.
  if (scheduledFor !== undefined && scheduledFor !== null) {
    if (typeof scheduledFor !== 'string' || !SLOT_TIME_PATTERN.test(scheduledFor)) {
      errors.push('scheduledFor must be null or a "YYYY-MM-DDTHH:MM" slot string');
    }
  }

  if (!DELIVERY_TYPES.has(deliveryType)) {
    errors.push('deliveryType must be "delivery" or "pickup"');
  }
  if (deliveryType === 'delivery' && (!deliveryAddress || typeof deliveryAddress !== 'string' || !deliveryAddress.trim())) {
    errors.push('deliveryAddress is required for delivery orders');
  }
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('items must be a non-empty array');
  } else if (items.length > 50) {
    errors.push('order may not exceed 50 line items');
  } else {
    items.forEach((item, i) => {
      if (!item.itemId || typeof item.itemId !== 'string') {
        errors.push(`items[${i}].itemId is required`);
      }
      if (!item.itemName || typeof item.itemName !== 'string') {
        errors.push(`items[${i}].itemName is required`);
      }
      if (!ITEM_TYPES.has(item.itemType)) {
        errors.push(`items[${i}].itemType must be "regular" or "bundle"`);
      }
      if (!Number.isInteger(item.basePriceCents) || item.basePriceCents < 0) {
        errors.push(`items[${i}].basePriceCents must be a non-negative integer`);
      }
      if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99) {
        errors.push(`items[${i}].qty must be an integer between 1 and 99`);
      }
    });

    if (errors.length === 0 && deliveryType === 'delivery') {
      const subtotal = items.reduce((sum, item) => sum + item.basePriceCents * item.qty, 0);
      if (subtotal < MIN_ORDER_CENTS) {
        errors.push(`minimum order for delivery is $${(MIN_ORDER_CENTS / 100).toFixed(2)}`);
      }
    }
  }

  if (idempotencyKey !== undefined && (typeof idempotencyKey !== 'string' || idempotencyKey.length > 128)) {
    errors.push('idempotencyKey must be a string of at most 128 characters');
  }

  if (errors.length > 0) {
    return next(createError('VALIDATION_ERROR', errors.join('; ')));
  }
  next();
}

export function sanitizeMenuQuery(req, res, next) {
  const { category, vegan, vegetarian, glutenFree, inStock, search } = req.query;

  if (search && search.length > 100) {
    return next(createError('VALIDATION_ERROR', 'Search query exceeds 100 characters.'));
  }

  req.menuFilters = {
    category: typeof category === 'string' ? category.trim() : null,
    isVegan: vegan === 'true' ? 1 : null,
    isVegetarian: vegetarian === 'true' ? 1 : null,
    isGlutenFree: glutenFree === 'true' ? 1 : null,
    inStock: inStock === 'true' ? 1 : inStock === 'false' ? 0 : null,
    search: typeof search === 'string' ? search.trim() : null,
  };

  next();
}
