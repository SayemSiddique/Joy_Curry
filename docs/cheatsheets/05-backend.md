# Cheat Sheet 05 — Node.js, Express & REST APIs

> Reference for Phase 5 of the Joy Curry & Tandoor build.

---

## Node.js Basics

**Node.js** — JavaScript runtime outside the browser; runs the backend server.

**`package.json`** — The manifest for a Node project.
```json
{
  "name": "joy-curry-tandoor-api",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev":   "nodemon server.js"
  }
}
```

**`npm install <package>`** — Add a dependency.
```bash
npm install express better-sqlite3 bcryptjs jsonwebtoken
npm install --save-dev nodemon eslint
```

**`process.env`** — Read environment variables (secrets stay out of code).
```js
const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;   // set in .env, never hardcoded
```

---

## Express Server Setup

```js
// backend/server.js
import express from 'express';
import cors    from 'cors';
import helmet  from 'helmet';
import compression from 'compression';

const app = express();

app.use(helmet());         // security headers
app.use(compression());    // gzip responses
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());   // parse JSON request bodies

// Routes
import menuRoutes from './routes/menu.js';
app.use('/api/menu', menuRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

---

## REST Routes

**HTTP verbs map to CRUD operations.**

| Verb | Path | Action |
|------|------|--------|
| `GET` | `/api/menu` | List all active items |
| `GET` | `/api/menu/:id` | Get one item by id |
| `POST` | `/api/orders` | Create a new order |
| `PUT` | `/api/admin/menu/:id` | Full update of a menu item |
| `PATCH` | `/api/admin/menu/:id/stock` | Partial update — toggle stock |
| `DELETE` | `/api/admin/menu/:id` | Soft-delete (sets `is_active=0`) |

```js
// routes/menu.js
import { Router } from 'express';
import { getMenu, getMenuItem } from '../models/menu.js';

const router = Router();

router.get('/', (req, res) => {
  const { category, search } = req.query;
  const items = getMenu({ category, search });
  res.json(items);
});

router.get('/:id', (req, res) => {
  const item = getMenuItem(Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

export default router;
```

---

## SQLite with better-sqlite3

**Synchronous API** — No callbacks or Promises needed; simpler than async drivers.

```js
// backend/db/database.js
import Database from 'better-sqlite3';
const db = new Database('./joy-curry.db');
db.pragma('journal_mode = WAL');   // better concurrent read performance
export default db;
```

**Prepared statements** — Parameterised queries; prevent SQL injection.
```js
// backend/models/menu.js
import db from '../db/database.js';

const stmtAll = db.prepare(`
  SELECT id, name, price_cents, category, spice_level, is_vegetarian, in_stock
  FROM   menu_items
  WHERE  is_active = 1
  ORDER  BY category, name
`);

export const getMenu = () => stmtAll.all();

const stmtById = db.prepare('SELECT * FROM menu_items WHERE id = ? AND is_active = 1');
export const getMenuItem = (id) => stmtById.get(id);
```

---

## Schema Conventions

```sql
CREATE TABLE menu_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL,
  price_cents    INTEGER NOT NULL,          -- never REAL for currency
  category       TEXT    NOT NULL,
  spice_level    INTEGER DEFAULT 0,
  is_vegetarian  INTEGER DEFAULT 0,         -- SQLite has no BOOLEAN
  in_stock       INTEGER DEFAULT 1,         -- kitchen availability
  is_active      INTEGER DEFAULT 1,         -- soft-delete flag
  created_at     TEXT    DEFAULT (datetime('now')),  -- UTC
  deleted_at     TEXT                       -- set on soft-delete, never null-hard-delete
);
```

---

## Middleware

**Middleware** — A function that runs between the request arriving and the response being sent.

```js
// Logging middleware (runs on every request)
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();   // MUST call next() or the request hangs
});
```

**Error-handling middleware** — Four parameters; always last.
```js
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});
```

---

## Health Check

```js
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});
```

Used by CI, Render health checks, and uptime monitors.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `price_cents REAL` in schema | Use `INTEGER`; store 1550 for $15.50 |
| `db.exec(userInput)` (SQL injection) | Always use prepared statements with `?` placeholders |
| `res.send()` without a status code on errors | Always set the correct HTTP status: `res.status(404).json(...)` |
| Forgetting `next()` in middleware | The request will hang forever; always call `next()` |
| Putting secrets in code: `const secret = 'abc123'` | Use `process.env.JWT_SECRET` and set it only in the deployment environment |
