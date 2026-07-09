import { db } from '../../config/db.js';

export async function up() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id     UUID NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, item_id)
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON favorites (user_id)`);
}

export async function down() {
  await db.run(`DROP TABLE IF EXISTS favorites`);
}
