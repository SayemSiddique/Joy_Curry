import { db } from '../config/db.js';

/**
 * Register (or re-associate) an Expo push token for a user.
 *
 * Idempotent + device-safe: the token is UNIQUE, so a device that was
 * previously registered to another user (someone else signed in on that phone,
 * or the same user re-signs in) is moved to the current user and its
 * updated_at bumped. Called on every app launch (tokens can rotate).
 */
export async function registerDeviceToken({ userId, token, platform = 'unknown' }) {
  await db.run(
    `INSERT INTO device_tokens (user_id, token, platform)
       VALUES ($1, $2, $3)
     ON CONFLICT (token) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           platform = EXCLUDED.platform,
           updated_at = NOW()`,
    [userId, token, platform],
  );
}

/** Remove a token (called on logout). Scoped to the owning user so one user
 *  can't delete another's token by guessing it. */
export async function deleteDeviceToken({ userId, token }) {
  await db.run(
    'DELETE FROM device_tokens WHERE token = $1 AND user_id = $2',
    [token, userId],
  );
}

/** All Expo push tokens registered to a user (across their devices). */
export async function getTokensByUserId(userId) {
  const rows = await db.all(
    'SELECT token FROM device_tokens WHERE user_id = $1',
    [userId],
  );
  return rows.map((r) => r.token);
}

/** Prune tokens Expo reported as invalid (DeviceNotRegistered receipts). */
export async function deleteTokens(tokens) {
  if (!tokens || tokens.length === 0) return;
  await db.run('DELETE FROM device_tokens WHERE token = ANY($1)', [tokens]);
}
