import { db } from '../../config/db.js';

/**
 * Expo push notification device tokens (mobile — Session 12).
 *
 * One row per (user, device). The push token is globally UNIQUE: the same
 * physical device installs one token, and if a different user signs in on that
 * device the token must re-associate to them — so registration UPSERTs on the
 * token and overwrites user_id (see models/deviceToken.registerDeviceToken).
 * Tokens are Expo push tokens ("ExponentPushToken[...]"), not raw APNs/FCM.
 */
export async function up() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS device_tokens (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token       TEXT NOT NULL UNIQUE,
      platform    TEXT NOT NULL DEFAULT 'unknown',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx ON device_tokens (user_id)`);

  console.log('[011] device_tokens table created');
}

export async function down() {
  await db.run(`DROP TABLE IF EXISTS device_tokens`);
}
