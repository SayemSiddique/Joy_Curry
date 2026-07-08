import { db } from '../config/db.js';

function toReview(row) {
  return {
    id: String(row.id),
    itemId: row.item_id,
    rating: row.rating,
    comment: row.comment,
    photoUrl: row.photo_url ?? undefined,
    userName: row.user_name,
    createdAt: row.created_at,
  };
}

/** Public list of reviews for a menu item, newest first. */
export async function getReviewsByItem(itemId) {
  const rows = await db.all(
    `SELECT r.id, r.item_id, r.rating, r.comment, r.photo_url, r.created_at,
            u.name AS user_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
      WHERE r.item_id = $1
      ORDER BY r.created_at DESC
      LIMIT 50`,
    [itemId]
  );
  return rows.map(toReview);
}

/**
 * Create or update the requesting user's review for an item (one per user per
 * item — resubmitting edits the existing row via the UNIQUE(item_id,user_id)
 * upsert). Returns the review joined with the author's name.
 */
export async function upsertReview({ itemId, userId, rating, comment }) {
  const row = await db.get(
    `INSERT INTO reviews (item_id, user_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (item_id, user_id)
     DO UPDATE SET rating = EXCLUDED.rating,
                   comment = EXCLUDED.comment,
                   updated_at = now()
     RETURNING id, item_id, rating, comment, photo_url, created_at`,
    [itemId, userId, rating, comment]
  );
  const user = await db.get('SELECT name FROM users WHERE id = $1', [userId]);
  return toReview({ ...row, user_name: user?.name ?? 'Guest' });
}
