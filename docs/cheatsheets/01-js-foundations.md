# Cheat Sheet 01 — JS Foundations

> Reference for Phase 1 of the Joy Curry & Tandoor build.

---

## Variables

**`const`** — A value that will never be reassigned.
```js
const TAX_RATE = 0.08875;           // NYC tax — never changes
const DELIVERY_FEE_CENTS = 300;     // $3.00 in cents
```

**`let`** — A value that may change during execution.
```js
let subtotalCents = 0;
subtotalCents += item.priceCents * item.qty;
```

---

## Data Types

**String** — Text, always in quotes.
```js
const name = 'Chicken Tikka Masala';
const allergens = `Contains: ${allergenList.join(', ')}`;   // template literal
```

**Number** — Integers and decimals. **Currency is always stored as integer cents.**
```js
const priceCents = 1550;    // $15.50 — never 15.50
```

**Boolean** — `true` or `false`.
```js
const inStock = true;
const isActive = false;
```

**`null` / `undefined`** — Intentionally empty vs. never set.
```js
const deletedAt = null;     // soft-delete: item exists but is removed
let searchQuery;            // undefined until user types
```

---

## Arrays

**Declaration & access**
```js
const allergens = ['gluten', 'dairy', 'nuts'];
allergens[0];               // 'gluten'
allergens.length;           // 3
```

**`.map()`** — Transform every element, return a new array.
```js
const labels = allergens.map(a => `<span class="allergen">${a}</span>`);
```

**`.filter()`** — Keep only elements that pass a test.
```js
const vegetarian = menuItems.filter(item => item.isVegetarian);
```

**`.find()`** — Return the first match (or `undefined`).
```js
const item = menuItems.find(i => i.id === targetId);
```

**`.reduce()`** — Collapse an array into a single value.
```js
const totalCents = cartItems.reduce((acc, item) => acc + item.priceCents * item.qty, 0);
```

**`.some()` / `.every()`** — Test if any/all elements match.
```js
const hasOutOfStock = cart.some(item => !item.inStock);
```

**`.includes()`** — Check membership.
```js
if (allergens.includes('nuts')) showWarning();
```

---

## Objects

**Declaration & property access**
```js
const menuItem = {
  id: 42,
  name: 'Lamb Rogan Josh',
  priceCents: 1895,
  category: 'curries',
  spiceLevel: 3,
  isVegetarian: false,
};
menuItem.name;              // 'Lamb Rogan Josh'
menuItem['priceCents'];     // 1895
```

**Shorthand property**
```js
const name = 'Lamb Rogan Josh';
const priceCents = 1895;
const item = { name, priceCents };    // same as { name: name, priceCents: priceCents }
```

**Spread operator** — Shallow copy / merge.
```js
const updated = { ...menuItem, priceCents: 1950 };
```

---

## Destructuring

**Array destructuring**
```js
const [first, second, ...rest] = allergens;
```

**Object destructuring**
```js
const { name, priceCents, category = 'uncategorised' } = menuItem;
```

**Function parameter destructuring** — Most common in Joy Curry components.
```js
function MenuCard({ id, name, priceCents, inStock }) {
  return `<div class="menu-card" data-id="${id}">...`;
}
```

---

## Functions

**Function declaration**
```js
function formatPrice(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
```

**Arrow function** — Preferred in this codebase.
```js
const formatPrice = (cents) => `$${(cents / 100).toFixed(2)}`;
```

**Default parameters**
```js
const buildUrl = (path, base = 'https://joy-curry-tandoor-api.onrender.com') =>
  `${base}${path}`;
```

---

## ES Modules

**Named export / import** — One file, many exports.
```js
// utils/formatters.js
export const formatPrice = (cents) => `$${(cents / 100).toFixed(2)}`;
export const formatDate  = (iso)   => new Date(iso).toLocaleDateString();

// app.js
import { formatPrice, formatDate } from './utils/formatters.js';
```

**Default export / import** — One main export per file.
```js
// components/MenuCard.js
export default function MenuCard(item) { ... }

// app.js
import MenuCard from './components/MenuCard.js';
```

> `type="module"` on the `<script>` tag in `index.html` is **mandatory** — without it, `import` throws an error.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `0.1 + 0.2` for currency | Store everything as integer cents; only divide by 100 at render time |
| Mutating an array directly (`arr.push`) inside a pure component | Return a new array: `[...arr, newItem]` |
| `item.category == 'curries'` (loose equality) | Always use `===` strict equality |
| Forgetting `.js` extension in ES module imports | `import { x } from './utils/helpers'` → `'./utils/helpers.js'` |
| Accessing `arr[0]` on an empty array without a guard | Check `arr.length` or use optional chaining `arr[0]?.name` |
