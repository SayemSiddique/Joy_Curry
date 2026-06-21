import { db } from '../../config/db.js';

export async function up() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id                 TEXT    PRIMARY KEY,
      user_id            INTEGER NOT NULL REFERENCES users(id),
      delivery_type      TEXT    NOT NULL CHECK (delivery_type IN ('delivery', 'pickup')),
      delivery_address   TEXT,
      subtotal_cents     INTEGER NOT NULL,
      tax_cents          INTEGER NOT NULL,
      delivery_fee_cents INTEGER NOT NULL DEFAULT 0,
      total_cents        INTEGER NOT NULL,
      status             TEXT    NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'confirmed', 'ready', 'completed', 'cancelled')),
      idempotency_key    TEXT    UNIQUE,
      estimated_wait_min INTEGER NOT NULL DEFAULT 30,
      created_at         TEXT    NOT NULL DEFAULT (NOW()),
      updated_at         TEXT    NOT NULL DEFAULT (NOW())
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS order_line_items (
      id               SERIAL  PRIMARY KEY,
      order_id         TEXT    NOT NULL REFERENCES orders(id),
      item_id          TEXT    NOT NULL,
      item_name        TEXT    NOT NULL,
      item_type        TEXT    NOT NULL CHECK (item_type IN ('regular', 'bundle')),
      base_price_cents INTEGER NOT NULL,
      qty              INTEGER NOT NULL DEFAULT 1,
      line_total_cents INTEGER NOT NULL,
      selected_options TEXT,
      slot_choices     TEXT,
      created_at       TEXT    NOT NULL DEFAULT (NOW())
    )
  `);

  await db.run(
    'CREATE INDEX IF NOT EXISTS idx_orders_user_id        ON orders(user_id)'
  );
  await db.run(
    'CREATE INDEX IF NOT EXISTS idx_orders_created_at     ON orders(created_at)'
  );
  await db.run(
    'CREATE INDEX IF NOT EXISTS idx_order_items_order_id  ON order_line_items(order_id)'
  );
}
