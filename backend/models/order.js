import { db } from '../config/db.js';
import { generateOrderId } from '../utils/helpers.js';

const TAX_RATE_BPS       = 875; // 8.75% NYC
const DELIVERY_FEE_CENTS = 300; // $3.00

export async function createOrder({ userId, deliveryType, deliveryAddress, items, idempotencyKey }) {
  if (idempotencyKey) {
    const existing = await db.get(
      'SELECT * FROM orders WHERE idempotency_key = ?',
      [idempotencyKey]
    );
    if (existing) {
      const lineItems = await db.all(
        'SELECT * FROM order_line_items WHERE order_id = ?',
        [existing.id]
      );
      return { order: existing, lineItems: lineItems.map(parseLineItem), duplicate: true };
    }
  }

  const subtotalCents    = items.reduce((sum, item) => sum + item.basePriceCents * item.qty, 0);
  const taxCents         = Math.round(subtotalCents * TAX_RATE_BPS / 10000);
  const deliveryFeeCents = deliveryType === 'delivery' ? DELIVERY_FEE_CENTS : 0;
  const totalCents       = subtotalCents + taxCents + deliveryFeeCents;
  const orderId          = generateOrderId();

  await db.run('BEGIN');
  try {
    await db.run(
      `INSERT INTO orders
         (id, user_id, delivery_type, delivery_address,
          subtotal_cents, tax_cents, delivery_fee_cents, total_cents, idempotency_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId, userId, deliveryType, deliveryAddress ?? null,
        subtotalCents, taxCents, deliveryFeeCents, totalCents,
        idempotencyKey ?? null,
      ]
    );

    for (const item of items) {
      await db.run(
        `INSERT INTO order_line_items
           (order_id, item_id, item_name, item_type,
            base_price_cents, qty, line_total_cents, selected_options, slot_choices)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.itemId,
          item.itemName,
          item.itemType,
          item.basePriceCents,
          item.qty,
          item.basePriceCents * item.qty,
          item.selectedOptions ? JSON.stringify(item.selectedOptions) : null,
          item.slotChoices    ? JSON.stringify(item.slotChoices)     : null,
        ]
      );
    }

    await db.run('COMMIT');
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }

  const order     = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
  const lineItems = await db.all('SELECT * FROM order_line_items WHERE order_id = ?', [orderId]);
  return { order, lineItems: lineItems.map(parseLineItem), duplicate: false };
}

export async function getOrdersByUserId(userId) {
  const orders = await db.all(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );

  const result = [];
  for (const order of orders) {
    const lineItems = await db.all(
      'SELECT * FROM order_line_items WHERE order_id = ?',
      [order.id]
    );
    result.push({ ...order, lineItems: lineItems.map(parseLineItem) });
  }
  return result;
}

export async function getOrderById(id) {
  const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
  if (!order) return null;
  const lineItems = await db.all(
    'SELECT * FROM order_line_items WHERE order_id = ?',
    [id]
  );
  return { ...order, lineItems: lineItems.map(parseLineItem) };
}

function parseLineItem(row) {
  return {
    ...row,
    selectedOptions: row.selected_options ? JSON.parse(row.selected_options) : null,
    slotChoices:     row.slot_choices     ? JSON.parse(row.slot_choices)     : null,
  };
}
