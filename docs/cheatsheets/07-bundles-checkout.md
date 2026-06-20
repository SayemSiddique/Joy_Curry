# Cheat Sheet 07 — Bundles, Checkout, Orders & Email

> Reference for Phase 7 of the Joy Curry & Tandoor build.

---

## Bundle Data Structure

A bundle is a fixed-price combination of items with a configurable slot per category.

```js
// frontend/js/data/menu/joy-combos.js
export const bundles = [
  {
    id:          'combo-1',
    name:        'Joy Combo for 1',
    priceCents:  1695,
    slots: [
      { label: 'Curry',   category: 'curries',    required: true  },
      { label: 'Bread',   category: 'breads',     required: true  },
      { label: 'Rice',    category: 'rice-dishes', required: false },
    ],
  },
];
```

**Bundle price is fixed** — `priceCents` comes from the bundle definition, not the sum of selected items.

---

## BundleModal State Machine

The bundle modal has three internal views managed by a `step` variable.

```
'select-slot' → user picks from filtered menu items → item stored in slots[slotIndex]
'review'      → all required slots filled → show summary + price
'confirm'     → POST /api/orders → order confirmed
```

```js
let bundleSelection = {};  // { slotIndex: menuItem }

function selectSlotItem(slotIndex, item) {
  bundleSelection[slotIndex] = item;
  if (allRequiredSlotsFilled()) showReviewStep();
}
```

---

## Order Payload

**Always integer cents.** Include UTC timestamp from the server, not the client.

```js
const payload = {
  items: cartItems.map(i => ({
    menuItemId:  i.id,
    name:        i.name,
    qty:         i.qty,
    unitCents:   i.priceCents,
    lineCents:   i.priceCents * i.qty,
  })),
  subtotalCents:     cartState.subtotalCents,
  taxCents:          cartState.taxCents,
  deliveryFeeCents:  DELIVERY_FEE_CENTS,
  totalCents:        cartState.totalCents,
  customer: { name, email, phone },
  specialInstructions: instructions.trim() || null,
};
```

---

## Order Model (Backend)

```js
// backend/models/order.js
const stmtInsert = db.prepare(`
  INSERT INTO orders (order_id, user_id, total_cents, status, items_json, customer_json, created_at)
  VALUES (@orderId, @userId, @totalCents, 'pending', @itemsJson, @customerJson, datetime('now'))
`);

export function createOrder(data) {
  const orderId = generateOrderId();   // 'JC-XXXXXX'
  stmtInsert.run({
    orderId,
    userId:       data.userId ?? null,
    totalCents:   data.totalCents,
    itemsJson:    JSON.stringify(data.items),
    customerJson: JSON.stringify(data.customer),
  });
  return orderId;
}
```

**`items_json` / `customer_json`** — Storing a snapshot prevents order history from breaking if menu prices change later.

---

## generateOrderId

```js
// backend/utils/helpers.js
export function generateOrderId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no ambiguous chars
  const rand  = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `JC-${rand}`;
}
```

---

## Order History

```js
// GET /api/orders (authenticated)
router.get('/', verifyToken, (req, res) => {
  const orders = getOrdersByUser(req.user.userId);
  res.json(orders);
});
```

```js
// frontend — load on drawer open
async function loadOrderHistory() {
  if (!authState.token) return renderSignInPrompt();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${API_BASE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${authState.token}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.status === 401) { clearAuth(); return renderSignInPrompt(); }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    renderOrderHistory(await res.json());
  } catch (err) {
    if (err.name !== 'AbortError') renderOrderHistoryError();
  }
}
```

---

## Reorder

```js
function reorder(orderId) {
  const order = orderHistory.find(o => o.order_id === orderId);
  if (!order) return;
  const items = JSON.parse(order.items_json);
  cartState.clearCart();
  items.forEach(item => cartState.addItem({
    id:         item.menuItemId,
    name:       item.name,
    priceCents: item.unitCents,
  }));
  openCartDrawer();
}
```

---

## Transactional Email (Stub)

```js
// backend/utils/email.js
export async function sendOrderConfirmation({ to, orderId, totalCents, items }) {
  // PLACEHOLDER — wire SendGrid/Resend here
  console.log(`[email stub] Order ${orderId} confirmation → ${to}`);
}
```

Called inside the `POST /api/orders` handler after the DB insert succeeds.

---

## Admin Panel Operations

```js
// PATCH /api/admin/menu/:id/stock — toggle in_stock (kitchen only, not is_active)
router.patch('/:id/stock', verifyToken, requireRole('admin'), (req, res) => {
  const { inStock } = req.body;
  toggleStock(Number(req.params.id), inStock ? 1 : 0);
  res.json({ success: true });
});

// DELETE /api/admin/menu/:id — soft-delete (never hard-delete)
router.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  softDeleteItem(Number(req.params.id));
  res.json({ success: true });
});
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Bundle price computed from selected items | Price is fixed at the bundle level — `bundle.priceCents` only |
| `total: 18.95` in order payload | `totalCents: 1895` — all monetary values are integer cents |
| Hard-deleting an order row | Soft-delete only (`status = 'cancelled'`) — order history must be immutable |
| Sending email inside the DB transaction | Send email after `createOrder()` returns successfully, not inside it |
| `order.items` stored without snapshotting price | Store `unitCents` at the time of order — live price may change later |
