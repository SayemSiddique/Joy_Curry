import { db } from '../../config/db.js';

/**
 * Phase 3 (Session 4) — Stripe payments.
 *
 * Adds:
 *   orders: payment_status ('unpaid' → 'paid' / 'failed' / 'refunded'),
 *           payment_intent_id (Stripe pi_...), paid_at
 *   payment_events: processed Stripe webhook event IDs — the idempotency
 *                   ledger (Stripe delivers at-least-once)
 *
 * Fully idempotent — safe to re-run on every boot.
 */
export async function up() {
  await db.run(
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'"
  );
  await db.run(
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id TEXT DEFAULT NULL'
  );
  await db.run(
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ DEFAULT NULL'
  );

  // Guarded CHECK constraint (ADD CONSTRAINT has no IF NOT EXISTS).
  await db.run(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_check'
      ) THEN
        ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
          CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded'));
      END IF;
    END $$;
  `);

  // Webhook lookups resolve the order by its PaymentIntent id.
  await db.run(
    'CREATE INDEX IF NOT EXISTS idx_orders_payment_intent ON orders(payment_intent_id)'
  );

  await db.run(`
    CREATE TABLE IF NOT EXISTS payment_events (
      id              SERIAL PRIMARY KEY,
      stripe_event_id TEXT   NOT NULL UNIQUE,
      event_type      TEXT   NOT NULL,
      order_id        TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}
