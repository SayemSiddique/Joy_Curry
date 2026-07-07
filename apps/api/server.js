import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { initializeSchema } from './db/setup.js';
import { seedIfEmpty } from './db/seed.js';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import { globalLimiter, loginLimiter } from './middleware/rateLimiter.js';
import menuRoutes from './routes/menu.js';
import adminRoutes from './routes/admin.js';
import usersRoutes from './routes/users.js';
import ordersRoutes from './routes/orders.js';
import slotsRoutes from './routes/slots.js';
import rewardsRoutes from './routes/rewards.js';
import distanceRoutes from './routes/distance.js';

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
      callback(new Error(`CORS: origin ${requestOrigin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Gzip compression for all JSON and text responses.
app.use(compression());

app.use(express.json({ limit: '10kb' }));
app.use(logger.request);
app.use(globalLimiter);

// Health check — used by CI/CD (GitHub Actions) and Render health checks.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.use('/api/menu', menuRoutes);
app.use('/api/users/login', loginLimiter);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/distance', distanceRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
});

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
