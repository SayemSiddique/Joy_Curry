export async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id     UUID NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, item_id)
    );
    CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON favorites (user_id);
  `);
}

export async function down(pool) {
  await pool.query(`DROP TABLE IF EXISTS favorites;`);
}
