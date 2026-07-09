import { db } from '../../config/db.js';

/**
 * Email one-time-passcode (OTP) storage for passwordless sign-in / sign-up.
 *
 * One active code per email at a time (we delete prior codes on each request).
 * code_hash = bcrypt of the 6-digit code (never store the raw code).
 * Codes expire after ~10 minutes; `attempts` guards against brute force.
 */
export async function up() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id         SERIAL       PRIMARY KEY,
      email      TEXT         NOT NULL,
      code_hash  TEXT         NOT NULL,
      expires_at TIMESTAMPTZ  NOT NULL,
      attempts   INTEGER      NOT NULL DEFAULT 0,
      consumed   INTEGER      NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
    )
  `);

  await db.run(
    'CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email)'
  );

  // OTP-created accounts have no password; make the column nullable.
  await db.run(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`);

  console.log('[010] otp_codes table created; users.password_hash now nullable');
}
