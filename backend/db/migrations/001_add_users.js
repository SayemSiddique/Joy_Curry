import { db } from '../../config/db.js';

export async function up() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL  PRIMARY KEY,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      phone         TEXT,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'customer',
      dietary_prefs TEXT,
      addresses     TEXT,
      is_active     INTEGER NOT NULL DEFAULT 1,
      deleted_at    TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db.run(
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'
  );
}
