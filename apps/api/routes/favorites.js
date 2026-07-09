import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { db } from '../config/db.js';

const router = Router();

router.use(verifyToken);

// GET /api/favorites/me — return array of favorited item IDs for the authed user
router.get('/me', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT item_id FROM favorites WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ itemIds: result.rows.map((r) => r.item_id) });
  } catch (err) {
    next(err);
  }
});

// POST /api/favorites/:itemId — add a favorite (idempotent via ON CONFLICT DO NOTHING)
router.post('/:itemId', async (req, res, next) => {
  try {
    await db.query(
      'INSERT INTO favorites (user_id, item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.itemId]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/favorites/:itemId — remove a favorite
router.delete('/:itemId', async (req, res, next) => {
  try {
    await db.query(
      'DELETE FROM favorites WHERE user_id = $1 AND item_id = $2',
      [req.user.id, req.params.itemId]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
