import rateLimit from 'express-rate-limit';

const rateLimitResponse = (_req, res) => {
  res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
  });
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
});
