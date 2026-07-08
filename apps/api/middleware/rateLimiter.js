import rateLimit from 'express-rate-limit';

const rateLimitResponse = (_req, res) => {
  res.status(429).json({
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
  });
};

// Per-IP ceiling across all routes. Raised from 100 to 300/15min (~20/min):
// the storefront legitimately polls /status (60s) and /availability (2min) and
// fires /reviews per dish view, so an engaged session was at risk of tripping
// the old limit. Still well under Agent 08's 60/min unauth guidance and low
// enough to blunt scraping/abuse.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
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

// Throttle account creation to blunt mass-signup abuse (fake accounts, points
// farming). Generous for a real household behind one IP; per-IP hourly window.
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
});
