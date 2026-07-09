import { db } from '../config/db.js';
import { generateOrderId } from '../utils/helpers.js';
import { DEFAULT_SLOT_CAPACITY } from '../config/slots.js';
import { resolveDeliveryFeeCents } from '../config/delivery.js';

const TAX_RATE_BPS = 875; // 8.75% NYC

export async function createOrder({
  userId, deliveryType, deliveryAddress, items, idempotencyKey, scheduledFor,
  deliveryPartner = 'in-house', withinRadius = true, partnerQuoteCents = null,
  notes = null, dropOffInstructions = null,
}) {
  if (idempotencyKey) {
    const existing = await db.get(
      'SELECT * FROM orders WHERE idempotency_key = $1',
      [idempotencyKey]
    );
    if (existing) {
      const lineItems = await db.all(
        'SELECT * FROM order_line_items WHERE order_id = $1',
        [existing.id]
      );
      return { order: existing, lineItems: lineItems.map(parseLineItem), duplicate: true };
    }
  }

  const subtotalCents    = items.reduce((sum, item) => sum + item.basePriceCents * item.qty, 0);
  const taxCents         = Math.round(subtotalCents * TAX_RATE_BPS / 10000);
  // Fee policy is centralized: in-house ($3, free at the $30 threshold) vs the
  // out-of-zone courier pass-through quote. See config/delivery.js.
  const deliveryFeeCents = resolveDeliveryFeeCents({
    deliveryType, withinRadius, subtotalCents, partnerQuoteCents,
  });
  const totalCents       = subtotalCents + taxCents + deliveryFeeCents;
  const pointsEarned     = Math.floor(totalCents / 100) * 100;
  const orderId          = generateOrderId();

  await db.transaction(async (tx) => {
    await tx.run(
      `INSERT INTO orders
         (id, user_id, delivery_type, delivery_address,
          subtotal_cents, tax_cents, delivery_fee_cents, total_cents,
          idempotency_key, points_earned, scheduled_for, delivery_partner,
          notes, drop_off_instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        orderId, userId, deliveryType, deliveryAddress ?? null,
        subtotalCents, taxCents, deliveryFeeCents, totalCents,
        idempotencyKey ?? null, pointsEarned, scheduledFor ?? null,
        deliveryType === 'delivery' ? (deliveryPartner ?? 'in-house') : 'in-house',
        notes ?? null, dropOffInstructions ?? null,
      ]
    );

    for (const item of items) {
      await tx.run(
        `INSERT INTO order_line_items
           (order_id, item_id, item_name, item_type,
            base_price_cents, qty, line_total_cents, selected_options, slot_choices)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          orderId,
          item.itemId,
          item.itemName,
          item.itemType,
          item.basePriceCents,
          item.qty,
          item.basePriceCents * item.qty,
          item.selectedOptions ? JSON.stringify(item.selectedOptions) : null,
          item.slotChoices     ? JSON.stringify(item.slotChoices)     : null,
        ]
      );
    }

    // Points are NOT credited here — orders are card-required (Session 4),
    // so loyalty points land in markOrderPaid() once Stripe confirms payment.
  });

  const order     = await db.get('SELECT * FROM orders WHERE id = $1', [orderId]);
  const lineItems = await db.all('SELECT * FROM order_line_items WHERE order_id = $1', [orderId]);
  return { order, lineItems: lineItems.map(parseLineItem), duplicate: false };
}

/**
 * Record the courier-partner dispatch result on an order (out-of-zone deliveries).
 * Stored after the order is created so the insert stays a clean single transaction.
 */
export async function setOrderDelivery(orderId, { externalDeliveryId, deliveryPartner }) {
  const row = await db.get(
    `UPDATE orders
        SET external_delivery_id = $1, delivery_partner = $2
      WHERE id = $3
      RETURNING *`,
    [externalDeliveryId ?? null, deliveryPartner, orderId],
  );
  return row ?? null;
}

/**
 * Persist the Stripe PaymentIntent id on an order so a retried checkout can
 * reuse the same intent and webhooks can be cross-checked.
 */
export async function setOrderPaymentIntent(orderId, paymentIntentId) {
  const row = await db.get(
    'UPDATE orders SET payment_intent_id = $1 WHERE id = $2 RETURNING *',
    [paymentIntentId, orderId],
  );
  return row ?? null;
}

/**
 * Mark an order paid (webhook: payment_intent.succeeded).
 *
 * Idempotent at the row level: the conditional UPDATE only fires while the
 * order is still un-paid, so a redelivered webhook can never double-credit
 * loyalty points. Confirms the order in the same transaction.
 * Returns the updated order, or null if it was already paid / not found.
 */
export async function markOrderPaid(orderId, paymentIntentId) {
  let updated = null;
  await db.transaction(async (tx) => {
    const result = await tx.run(
      `UPDATE orders
          SET payment_status = 'paid',
              status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
              paid_at = now(),
              payment_intent_id = COALESCE(payment_intent_id, $2)
        WHERE id = $1 AND payment_status <> 'paid'
        RETURNING *`,
      [orderId, paymentIntentId ?? null],
    );
    const order = result.rows?.[0];
    if (!order) return;
    await tx.run(
      'UPDATE users SET rewards_points = rewards_points + $1, rewards_lifetime_cents = rewards_lifetime_cents + $2 WHERE id = $3',
      [order.points_earned, order.total_cents, order.user_id],
    );
    updated = order;
  });
  return updated;
}

/**
 * Record a failed payment attempt (webhook: payment_intent.payment_failed).
 * Never downgrades a paid order — the customer can retry, so 'failed' is a
 * transient marker, not a terminal state.
 */
export async function markOrderPaymentFailed(orderId) {
  const row = await db.get(
    `UPDATE orders SET payment_status = 'failed'
      WHERE id = $1 AND payment_status <> 'paid'
      RETURNING *`,
    [orderId],
  );
  return row ?? null;
}

/**
 * Idempotency ledger for Stripe webhooks (at-least-once delivery).
 * Returns true if this event id is new (caller should process it),
 * false if it was already recorded (caller should skip).
 */
export async function recordPaymentEvent(stripeEventId, eventType, orderId) {
  const result = await db.run(
    `INSERT INTO payment_events (stripe_event_id, event_type, order_id)
       VALUES ($1, $2, $3)
     ON CONFLICT (stripe_event_id) DO NOTHING
     RETURNING id`,
    [stripeEventId, eventType, orderId ?? null],
  );
  return Boolean(result.rows?.[0]);
}

export async function getOrdersByUserId(userId) {
  const orders = await db.all(
    'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return attachLineItems(orders);
}

export async function getOrderById(id) {
  const order = await db.get('SELECT * FROM orders WHERE id = $1', [id]);
  if (!order) return null;
  const lineItems = await db.all(
    'SELECT * FROM order_line_items WHERE order_id = $1',
    [id]
  );
  return { ...order, lineItems: lineItems.map(parseLineItem) };
}

/**
 * Returns every order slot for a given calendar day (YYYY-MM-DD), oldest first.
 * `remaining` and `soldOut` are derived so callers don't repeat the math.
 * slot_time is stored as an ISO datetime string, so a prefix match on the
 * date selects all 15-minute slots within that day.
 */
export async function getSlotAvailability(dateStr) {
  const rows = await db.all(
    'SELECT * FROM order_slots WHERE slot_time LIKE $1 ORDER BY slot_time ASC',
    [`${dateStr}%`]
  );
  return rows.map((row) => ({
    id:        row.id,
    slotTime:  row.slot_time,
    capacity:  row.capacity,
    booked:    row.booked,
    remaining: Math.max(0, row.capacity - row.booked),
    soldOut:   row.booked >= row.capacity,
  }));
}

/**
 * Atomically reserve one seat in a slot.
 *
 * The slot row is lazily created on first reservation. The conditional
 * `ON CONFLICT ... WHERE booked < capacity` makes capacity enforcement
 * atomic at the database level — concurrent reservations on the last seat
 * can never both succeed. Returns the updated slot, or null if it was full.
 */
export async function reserveSlot(slotTime, capacity = DEFAULT_SLOT_CAPACITY) {
  const result = await db.run(
    `INSERT INTO order_slots (slot_time, capacity, booked)
       VALUES ($1, $2, 1)
     ON CONFLICT (slot_time) DO UPDATE
       SET booked = order_slots.booked + 1
       WHERE order_slots.booked < order_slots.capacity
     RETURNING id, slot_time, capacity, booked`,
    [slotTime, capacity]
  );

  const row = result.rows[0];
  if (!row) return null; // slot exists and is full

  return {
    id:        row.id,
    slotTime:  row.slot_time,
    capacity:  row.capacity,
    booked:    row.booked,
    remaining: Math.max(0, row.capacity - row.booked),
    soldOut:   row.booked >= row.capacity,
  };
}

export async function getAllOrders(limit = 200) {
  const orders = await db.all(
    'SELECT * FROM orders ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return attachLineItems(orders);
}

export async function updateOrderStatus(id, status) {
  const VALID = ['pending', 'confirmed', 'ready', 'completed', 'cancelled'];
  if (!VALID.includes(status)) throw new Error(`Invalid status: ${status}`);
  const row = await db.get(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return row ?? null;
}

export async function getDashboardStats() {
  // Today in UTC (restaurant does not need TZ offset for a daily summary).
  // Half-open range [today, tomorrow) is sargable — it uses the created_at
  // B-tree index, unlike the old `created_at::date = $1` cast which forced a
  // full table scan.
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const todayRow = await db.get(
    `SELECT COUNT(*)::int AS order_count, COALESCE(SUM(total_cents), 0)::int AS revenue_cents
       FROM orders
      WHERE created_at >= $1::timestamptz
        AND created_at <  ($1::timestamptz + INTERVAL '1 day')
        AND status != 'cancelled'`,
    [today]
  );
  const pendingRow = await db.get(
    `SELECT COUNT(*)::int AS pending_count FROM orders WHERE status = 'pending'`
  );
  return {
    todayOrderCount: todayRow?.order_count ?? 0,
    todayRevenueCents: todayRow?.revenue_cents ?? 0,
    pendingOrderCount: pendingRow?.pending_count ?? 0,
  };
}

/**
 * Count orders currently "in the kitchen" (paid/confirmed but not yet ready or
 * completed). Used by GET /api/status to derive a real, load-aware wait
 * estimate instead of a hard-coded number.
 */
export async function getKitchenLoad() {
  const row = await db.get(
    `SELECT COUNT(*)::int AS active FROM orders
      WHERE status IN ('confirmed', 'pending')
        AND payment_status = 'paid'`
  );
  return row?.active ?? 0;
}

// N+1 fix: load line items for many orders in a single `= ANY($1)` query,
// then group in memory — instead of one query per order.
async function attachLineItems(orders) {
  if (orders.length === 0) return [];
  const ids = orders.map((o) => o.id);
  const rows = await db.all(
    'SELECT * FROM order_line_items WHERE order_id = ANY($1)',
    [ids]
  );

  const byOrder = new Map();
  for (const row of rows) {
    const parsed = parseLineItem(row);
    const list = byOrder.get(row.order_id);
    if (list) list.push(parsed);
    else byOrder.set(row.order_id, [parsed]);
  }

  return orders.map((order) => ({ ...order, lineItems: byOrder.get(order.id) ?? [] }));
}

function parseLineItem(row) {
  return {
    ...row,
    selectedOptions: row.selected_options ? JSON.parse(row.selected_options) : null,
    slotChoices:     row.slot_choices     ? JSON.parse(row.slot_choices)     : null,
  };
}
