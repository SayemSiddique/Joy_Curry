import { db } from '../../config/db.js';

/**
 * Phase 3-A — Rewards (Artisan Vault) + Scheduled Orders.
 *
 * Adds:
 *   users:  rewards_points, rewards_lifetime_cents
 *   orders: scheduled_for, delivery_partner, external_delivery_id,
 *           points_earned, points_redeemed
 *   order_slots: 15-minute capacity-throttled time slots
 *
 * Fully idempotent — uses `ADD COLUMN IF NOT EXISTS` and a guarded
 * constraint block so it is safe to re-run on every boot.
 */
export async function up() {
  // --- users: loyalty balance + lifetime spend audit trail ---
  await db.run(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS rewards_points INTEGER NOT NULL DEFAULT 0'
  );
  await db.run(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS rewards_lifetime_cents INTEGER NOT NULL DEFAULT 0'
  );

  // --- orders: scheduling + delivery routing + points ledger ---
  // scheduled_for is NULL for ASAP orders, otherwise an ISO datetime string.
  await db.run(
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_for TEXT DEFAULT NULL'
  );
  await db.run(
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_partner TEXT NOT NULL DEFAULT 'in-house'"
  );
  await db.run(
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_delivery_id TEXT DEFAULT NULL'
  );
  await db.run(
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_earned INTEGER NOT NULL DEFAULT 0'
  );
  await db.run(
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_redeemed INTEGER NOT NULL DEFAULT 0'
  );

  // delivery_partner CHECK constraint — added separately so the column add
  // stays idempotent; guarded so re-runs don't error on the existing constraint.
  await db.run(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_partner_check'
      ) THEN
        ALTER TABLE orders ADD CONSTRAINT orders_delivery_partner_check
          CHECK (delivery_partner IN ('in-house', 'uber', 'doordash'));
      END IF;
    END $$;
  `);

  // --- order_slots: kitchen capacity throttling, 15-min granularity ---
  await db.run(`
    CREATE TABLE IF NOT EXISTS order_slots (
      id        SERIAL  PRIMARY KEY,
      slot_time TEXT    NOT NULL UNIQUE,   -- ISO datetime, rounded to 15-min
      capacity  INTEGER NOT NULL DEFAULT 10,
      booked    INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.run(
    'CREATE INDEX IF NOT EXISTS idx_order_slots_slot_time ON order_slots(slot_time)'
  );
  await db.run(
    'CREATE INDEX IF NOT EXISTS idx_orders_scheduled_for  ON orders(scheduled_for)'
  );
}
