import { db } from '../config/db.js';

function normalize(email) {
  return email.toLowerCase().trim();
}

/** Replace any existing codes for this email with a fresh one. */
export async function createOtp({ email, codeHash, expiresAt }) {
  const e = normalize(email);
  await db.run('DELETE FROM otp_codes WHERE email = $1', [e]);
  await db.run(
    `INSERT INTO otp_codes (email, code_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [e, codeHash, expiresAt]
  );
}

/** Most recent, non-consumed code for an email (or null). */
export async function getActiveOtp(email) {
  return db.get(
    `SELECT * FROM otp_codes
     WHERE email = $1 AND consumed = 0
     ORDER BY created_at DESC
     LIMIT 1`,
    [normalize(email)]
  );
}

export async function incrementOtpAttempts(id) {
  await db.run('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1', [id]);
}

export async function consumeOtp(id) {
  await db.run('UPDATE otp_codes SET consumed = 1 WHERE id = $1', [id]);
}
