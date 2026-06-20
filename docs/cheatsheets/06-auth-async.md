# Cheat Sheet 06 — Async JS, Fetch & Authentication

> Reference for Phase 6 of the Joy Curry & Tandoor build.

---

## Async / Await

**`async` function** — Always returns a Promise, even if you return a plain value.
```js
async function loadMenu() {
  const items = await menuService.fetchMenu();
  renderMenu(items);
}
```

**`await`** — Pause execution until the Promise resolves. Only valid inside an `async` function.

**Error handling** — Wrap in try/catch; always handle rejections.
```js
async function loadMenu() {
  try {
    const items = await menuService.fetchMenu();
    renderMenu(items);
  } catch (err) {
    showToast('Could not load menu. Please refresh.', 'error');
    renderMenuError();
  }
}
```

---

## Fetch API

**GET request** — No body; query params go in the URL.
```js
const res = await fetch(`${API_BASE_URL}/api/menu?category=curries`);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const items = await res.json();
```

**POST request** — Send JSON body with credentials.
```js
const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
if (!res.ok) {
  const err = await res.json();
  throw new Error(err.error || 'Login failed');
}
const { token, user } = await res.json();
```

**Authenticated request** — Send JWT in the `Authorization` header.
```js
const res = await fetch(`${API_BASE_URL}/api/orders`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authState.token}`,
  },
  body: JSON.stringify(payload),
});
```

---

## AbortController (Request Timeouts)

**Cancel a hanging fetch** — prevents the UI from waiting forever.
```js
async function fetchMenu() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);  // 8 s timeout

  try {
    const res = await fetch(`${API_BASE_URL}/api/menu`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  }
}
```

Joy Curry timeouts: 8 s for menu, 10 s for order history, 15 s for order placement.

---

## JWT Authentication

**Flow:**

```
Register / Login → server validates → signs a JWT → client stores token
Every protected request → client sends token in header → server verifies → grants access
```

**Sign a token (server)**
```js
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' },
);
res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
```

**Verify middleware (server)**
```js
export function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorised' });

  try {
    req.user = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

**Role guard (server)**
```js
export const requireRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) return res.status(403).json({ error: 'Forbidden' });
  next();
};
// Usage: router.delete('/:id', verifyToken, requireRole('admin'), deleteItem);
```

---

## Client-Side Auth State

```js
// frontend/js/state/authState.js
const _state = { token: null, user: null };

export const authState = {
  get token()  { return _state.token; },
  get user()   { return _state.user; },
  get isAdmin(){ return _state.user?.role === 'admin'; },

  setAuth(token, user) {
    _state.token = token;
    _state.user  = user;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user',  JSON.stringify(user));
  },

  clearAuth() {
    _state.token = null;
    _state.user  = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  },

  restore() {
    const token = localStorage.getItem('auth_token');
    const user  = localStorage.getItem('auth_user');
    if (token && user) {
      _state.token = token;
      _state.user  = JSON.parse(user);
    }
  },
};
```

---

## Password Hashing (bcrypt)

```js
import bcrypt from 'bcryptjs';

// Register — hash before storing
const hash = await bcrypt.hash(password, 12);   // 12 rounds

// Login — compare plaintext against stored hash
const match = await bcrypt.compare(password, storedHash);
if (!match) return res.status(401).json({ error: 'Invalid credentials' });
```

---

## API_BASE_URL Auto-Switch

```js
// frontend/js/config/constants.js
const isProd = window.location.hostname !== 'localhost';

export const API_BASE_URL = isProd
  ? 'https://joy-curry-tandoor-api.onrender.com'
  : 'http://localhost:3000';
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `await` outside an `async` function | Wrap the calling function with `async` or use `.then()` |
| `fetch(url)` without checking `res.ok` | `if (!res.ok) throw new Error(...)` before `res.json()` |
| Storing JWT in `localStorage` for high-security apps | Fine for this project; for banking-level security use `httpOnly` cookies |
| `jwt.verify()` without try/catch | An expired or tampered token throws — always wrap in try/catch |
| `bcrypt.hash(password, 1)` (1 round) | Minimum 10 rounds; Joy Curry uses 12 |
