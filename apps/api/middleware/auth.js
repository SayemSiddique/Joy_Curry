import jwt from 'jsonwebtoken';
import { createError } from './errorHandler.js';

export function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(createError('UNAUTHORIZED', 'Authorization token required.', 401));
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    next(createError('TOKEN_INVALID', 'Token is invalid or expired.', 401));
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return next(createError('FORBIDDEN', 'Insufficient permissions.', 403));
    }
    next();
  };
}
