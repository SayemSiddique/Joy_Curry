import { db } from '../../config/db.js';

export async function up() {
  await db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE`);
  console.log('[009] birthday column added to users');
}
