import { db } from '../../config/db.js';

/**
 * Session 5 (Hardening) — customer reviews.
 *
 * Text + star rating only for launch (no photo storage in the stack yet;
 * `photo_url` is reserved for when object storage lands). One review per
 * (user, item) is enforced so a customer can't spam a dish — re-submitting
 * updates their existing review.
 *
 * Fully idempotent — safe to re-run on every boot.
 */
export async function up() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id         SERIAL  PRIMARY KEY,
      item_id    TEXT    NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment    TEXT    NOT NULL DEFAULT '',
      photo_url  TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (item_id, user_id)
    )
  `);

  await db.run(
    'CREATE INDEX IF NOT EXISTS idx_reviews_item_id ON reviews(item_id, created_at DESC)'
  );
}
