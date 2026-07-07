import { db } from '../config/db.js';
import logger from '../utils/logger.js';
import { up as addUsers } from './migrations/001_add_users.js';
import { up as addOrders } from './migrations/002_add_orders.js';
import { up as addRewardsAndScheduling } from './migrations/003_add_rewards_and_scheduling.js';
import { up as convertTimestampsAndIndexes } from './migrations/004_timestamps_and_indexes.js';

export async function initializeSchema() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id               TEXT    PRIMARY KEY,
      name             TEXT    NOT NULL,
      category         TEXT    NOT NULL,
      subcategory      TEXT,
      description      TEXT    NOT NULL DEFAULT '',
      base_price_cents INTEGER NOT NULL,
      is_vegan         INTEGER NOT NULL DEFAULT 0,
      is_vegetarian    INTEGER NOT NULL DEFAULT 0,
      is_gluten_free   INTEGER NOT NULL DEFAULT 0,
      spice_level      INTEGER NOT NULL DEFAULT 0,
      allergen_note    TEXT,
      served_with      TEXT,
      protein_choices  TEXT,
      piece_count      INTEGER,
      tags             TEXT,
      search_keywords  TEXT,
      image_url        TEXT,
      in_stock         INTEGER NOT NULL DEFAULT 1,
      is_active        INTEGER NOT NULL DEFAULT 1,
      is_halal         INTEGER NOT NULL DEFAULT 1,
      deleted_at       TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS item_allergens (
      item_id  TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      allergen TEXT NOT NULL,
      PRIMARY KEY (item_id, allergen)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS item_modifiers (
      item_id           TEXT    NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      modifier_id       TEXT    NOT NULL,
      label             TEXT    NOT NULL,
      price_delta_cents INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (item_id, modifier_id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS item_size_options (
      item_id     TEXT    NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      label       TEXT    NOT NULL,
      price_cents INTEGER NOT NULL,
      PRIMARY KEY (item_id, label)
    )
  `);

  await db.run(
    'CREATE INDEX IF NOT EXISTS idx_menu_category  ON menu_items(category)'
  );
  await db.run(
    'CREATE INDEX IF NOT EXISTS idx_menu_is_active ON menu_items(is_active)'
  );
  await db.run(
    'CREATE INDEX IF NOT EXISTS idx_menu_in_stock  ON menu_items(in_stock)'
  );

  await addUsers();
  await addOrders();
  await addRewardsAndScheduling();
  await convertTimestampsAndIndexes();

  logger.info('Database schema ready.');
}
