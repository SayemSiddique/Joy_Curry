# Cheat Sheet 04 — State, Cart Logic & localStorage

> Reference for Phase 4 of the Joy Curry & Tandoor build.

---

## What Is State?

**State** — The live data your UI reflects at any given moment. When state changes, the UI re-renders to match.

Joy Curry's state lives in `cartState` (a plain JS object with methods) imported by `app.js`. No framework needed.

```js
// frontend/js/state/cartState.js
const _state = {
  items: [],      // [{ id, name, priceCents, qty, modifiers }]
};
```

---

## Cart Operations (Integer Cents Throughout)

**`addItem(item)`** — Increment qty if already in cart, else push.
```js
addItem(item) {
  const existing = _state.items.find(i => i.id === item.id);
  if (existing) {
    existing.qty += 1;
  } else {
    _state.items.push({ ...item, qty: 1 });
  }
  _persist();
  _notify();
},
```

**`removeItem(id)`** — Filter out by id.
```js
removeItem(id) {
  _state.items = _state.items.filter(i => i.id !== id);
  _persist();
  _notify();
},
```

**`updateQty(id, qty)`** — Set qty directly; remove if qty reaches 0.
```js
updateQty(id, qty) {
  if (qty <= 0) return cartState.removeItem(id);
  const item = _state.items.find(i => i.id === id);
  if (item) item.qty = qty;
  _persist();
  _notify();
},
```

**`clearCart()`** — Empty the cart after order placement.
```js
clearCart() {
  _state.items = [];
  _persist();
  _notify();
},
```

---

## Derived Values (Always Computed, Never Stored)

**Totals are always computed on-the-fly** — storing them separately creates sync bugs.

```js
get totalItems() {
  return _state.items.reduce((sum, i) => sum + i.qty, 0);
},

get subtotalCents() {
  return _state.items.reduce((sum, i) => sum + i.priceCents * i.qty, 0);
},

get taxCents() {
  // NYC tax 8.875% — Math.round to stay in integer cents
  return Math.round(this.subtotalCents * 0.08875);
},

get totalCents() {
  return this.subtotalCents + this.taxCents + DELIVERY_FEE_CENTS;
},
```

---

## Subscriptions (Observer Pattern)

Components subscribe to state changes instead of polling.

```js
// cartState.js
const _listeners = new Set();

subscribe(fn) { _listeners.add(fn); },
unsubscribe(fn) { _listeners.delete(fn); },

function _notify() {
  _listeners.forEach(fn => fn(_state));
}
```

```js
// app.js
cartState.subscribe(() => {
  renderCartDrawer();
  updateCartBadge();
});
```

---

## localStorage

**`setItem` / `getItem`** — Persist cart so it survives page refresh.

```js
function _persist() {
  localStorage.setItem('joy_curry_cart', JSON.stringify(_state.items));
}

function _restore() {
  const raw = localStorage.getItem('joy_curry_cart');
  if (raw) _state.items = JSON.parse(raw);
}
```

> `localStorage` only stores strings — always `JSON.stringify` on write, `JSON.parse` on read.

**`reconcileCartWithMenu(menuItems)`** — Run on page load to remove out-of-stock items from a restored cart.
```js
export function reconcileCartWithMenu(menuItems) {
  const inStockIds = new Set(menuItems.filter(i => i.inStock).map(i => i.id));
  _state.items = _state.items.filter(i => inStockIds.has(i.id));
  _persist();
}
```

---

## Price Formatting (Render-Only)

```js
// utils/formatters.js
export const formatPrice = (cents) => `$${(cents / 100).toFixed(2)}`;
```

**Rule:** raw integers travel through all business logic; `formatPrice()` is called only at the moment a string hits the DOM.

---

## Checkout Validation

```js
export function validateCheckoutForm({ name, phone, email }) {
  const errors = {};
  if (!name.trim())                         errors.name  = 'Name is required';
  if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) errors.phone = 'Enter a 10-digit phone number';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email';
  return errors;   // empty object = valid
}
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `subtotal = item.price * item.qty` (floats) | `subtotalCents = item.priceCents * item.qty` (integers) |
| Storing `taxCents` in state | Compute it as a getter from `subtotalCents` — stored values drift |
| `localStorage.setItem('cart', _state.items)` | Must `JSON.stringify`: `localStorage.setItem('cart', JSON.stringify(_state.items))` |
| Mutating `_state.items` from outside `cartState` | All mutations go through cartState methods — treat `_state` as private |
| Calling `renderCart()` before restoring from localStorage | Restore first in `init()`, then subscribe, then render |
