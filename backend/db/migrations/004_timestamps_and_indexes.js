import { db } from '../../config/db.js';
import logger from '../../utils/logger.js';

/**
 * Phase review C2/P2 — convert timestamp columns from TEXT to timestamptz and
 * add scalable indexes.
 *
 * Why:
 *   - created_at/updated_at were stored as TEXT (a SQLite-era artifact). Date
 *     range/`::date` queries on TEXT can't use a B-tree index and rely on
 *     string-format luck. Native timestamptz makes them sargable and TZ-correct.
 *   - Menu search uses `ILIKE '%term%'`; a leading wildcard can never use a
 *     B-tree, so a pg_trgm GIN index is needed for it to scale.
 *
 * Fully idempotent: the type conversion only fires when a column is still TEXT
 * (re-running on a timestamptz column would needlessly rewrite the table under
 * an ACCESS EXCLUSIVE lock), and every index uses IF NOT EXISTS.
 */

// (table, column) pairs are hardcoded constants — safe to interpolate.
const TIMESTAMP_COLUMNS = [
  ['users', 'created_at'],
  ['users', 'updated_at'],
  ['menu_items', 'created_at'],
  ['menu_items', 'updated_at'],
  ['orders', 'created_at'],
  ['orders', 'updated_at'],
  ['order_line_items', 'created_at'],
];

export async function up() {
  // --- 1. TEXT → timestamptz, guarded so it only runs once per column ---
  for (const [table, col] of TIMESTAMP_COLUMNS) {
    await db.run(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = '${table}' AND column_name = '${col}' AND data_type = 'text'
        ) THEN
          EXECUTE 'ALTER TABLE ${table} ALTER COLUMN ${col} TYPE timestamptz USING ${col}::timestamptz';
          EXECUTE 'ALTER TABLE ${table} ALTER COLUMN ${col} SET DEFAULT now()';
        END IF;
      END $$;
    `);
  }

  // --- 2. Sargable composite index for the hot menu filter path ---
  await db.run(
    `CREATE INDEX IF NOT EXISTS idx_menu_active_cat
       ON menu_items (is_active, category) WHERE deleted_at IS NULL`
  );

  // --- 3. pg_trgm GIN indexes for ILIKE search (defensive: a managed host may
  //        not grant CREATE EXTENSION — warn and continue rather than brick boot) ---
  try {
    await db.run('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await db.run(
      `CREATE INDEX IF NOT EXISTS idx_menu_search_trgm
         ON menu_items USING gin (search_keywords gin_trgm_ops)`
    );
    await db.run(
      `CREATE INDEX IF NOT EXISTS idx_menu_name_trgm
         ON menu_items USING gin (name gin_trgm_ops)`
    );
  } catch (err) {
    logger.warn(`pg_trgm unavailable — menu search will work but won't be index-accelerated: ${err.message}`);
  }
}
