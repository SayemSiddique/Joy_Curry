import { db } from '../../config/db.js';

export async function up() {
  await db.run(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT`);
  await db.run(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS drop_off_instructions TEXT`);
}
