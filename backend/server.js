import 'dotenv/config';
import express from 'express';
import { initializeSchema } from './db/setup.js';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import { globalLimiter, loginLimiter } from './middleware/rateLimiter.js';
import menuRoutes from './routes/menu.js';
import adminRoutes from './routes/admin.js';
import usersRoutes from './routes/users.js';
import ordersRoutes from './routes/orders.js';

const app = express();
const PORT = process.env.PORT ?? 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5500';

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(logger.request);
app.use(globalLimiter);

app.use('/api/menu', menuRoutes);
app.use('/api/users/login', loginLimiter);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/orders', ordersRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
});

app.use(errorHandler);

initializeSchema()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database schema:', err.message);
    process.exit(1);
  });
