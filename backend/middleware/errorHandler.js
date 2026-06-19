import logger from '../utils/logger.js';

const STATUS_MAP = {
  VALIDATION_ERROR:   400,
  EMAIL_TAKEN:        409,
  INVALID_CREDENTIALS: 401,
  UNAUTHORIZED:       401,
  TOKEN_INVALID:      401,
  FORBIDDEN:          403,
  NOT_FOUND:          404,
  RATE_LIMITED:       429,
};

export default function errorHandler(err, req, res, next) {
  const status = STATUS_MAP[err.code] ?? 500;

  if (status >= 500) {
    logger.error(err, { method: req.method, path: req.path });
  }

  const body = {
    error: {
      code: err.code ?? 'INTERNAL_ERROR',
      message: err.message ?? 'An unexpected error occurred.',
    },
  };

  if (process.env.NODE_ENV === 'development' && status >= 500) {
    body.error.stack = err.stack;
  }

  res.status(status).json(body);
}

export function createError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}
