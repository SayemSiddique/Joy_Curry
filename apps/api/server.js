import 'dotenv/config';
// Import BEFORE anything else so Sentry can instrument downstream modules.
import { Sentry } from './instrument.js';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { initializeSchema } from './db/setup.js';
import { seedIfEmpty } from './db/seed.js';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import { globalLimiter, loginLimiter, registerLimiter } from './middleware/rateLimiter.js';
import menuRoutes from './routes/menu.js';
import adminRoutes from './routes/admin.js';
import usersRoutes from './routes/users.js';
import ordersRoutes from './routes/orders.js';
import slotsRoutes from './routes/slots.js';
import rewardsRoutes from './routes/rewards.js';
import distanceRoutes from './routes/distance.js';
import paymentsRoutes, { webhookHandler } from './routes/payments.js';
import statusRoutes from './routes/status.js';
import availabilityRoutes from './routes/availability.js';
import specialsRoutes from './routes/specials.js';
import reviewsRoutes from './routes/reviews.js';
import favoritesRoutes from './routes/favorites.js';
import contactRoutes from './routes/contact.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

// CORS_ORIGIN accepts a comma-separated list so we can allow both the custom
// domain and the Vercel preview URL without opening the API to all origins.
const CORS_ORIGINS = (process.env.CORS_ORIGIN ?? 'http://localhost:5500')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Security headers — helmet sets CSP, X-Frame-Options, HSTS, X-Content-Type-Options, etc.
// unsafe-inline on styleSrc is required because the frontend uses inline CSS custom properties.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:'],
      connectSrc: ["'self'", ...CORS_ORIGINS],
    },
  },
}));

// CORS — allow every explicitly listed origin; rejects everything else.
app.use(cors({
  origin(requestOrigin, callback) {
    if (!requestOrigin || CORS_ORIGINS.includes(requestOrigin)) {
      callback(null, true);
    } else {
      // Give the error a code so errorHandler maps it to a clean 403 instead
      // of a bare 500 that leaks a stack-trace-shaped response.
      const err = new Error('Origin not allowed by CORS policy.');
      err.code = 'FORBIDDEN';
      callback(err);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Gzip compression for all JSON and text responses.
app.use(compression());

// Stripe webhook — MUST be mounted before express.json: signature verification
// needs the raw body, and the JSON parser would consume it first.
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), webhookHandler);

app.use(express.json({ limit: '10kb' }));
app.use(logger.request);
app.use(globalLimiter);

// Health check — used by CI/CD (GitHub Actions) and Render health checks.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.use('/api/menu', menuRoutes);
app.use('/api/users/login', loginLimiter);
app.use('/api/users/register', registerLimiter);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/distance', distanceRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/specials', specialsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/contact', contactRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
});

// Report unhandled errors to Sentry (no-op when SENTRY_DSN is unset) before the
// JSON error handler shapes the client response.
Sentry.setupExpressErrorHandler(app);

app.use(errorHandler);

initializeSchema()
  .then(() => seedIfEmpty())
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database schema:', err);
    process.exit(1);
  });
