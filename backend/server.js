// ============================================================================
// server.js — Express.js main entry point
// Phase 5: Initial server setup
// ============================================================================

import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS — Phase 5 (will be properly configured)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Placeholder routes — to be implemented in Phase 5
app.get('/api/menu', (req, res) => {
  res.json({ message: 'Menu API — Phase 5' });
});

app.listen(PORT, () => {
  console.log(`🍛 Server running on http://localhost:${PORT}`);
});
