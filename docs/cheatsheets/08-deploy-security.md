# Cheat Sheet 08 — Deployment, Performance & Security

> Reference for Phase 8 of the Joy Curry & Tandoor build.

---

## Deployment Architecture

```
GitHub (main branch)
  │
  ├── GitHub Actions: CI (ESLint + health check) on every push
  ├── GitHub Actions: Deploy frontend → gh-pages branch → joycurry.sayemsiddique.com
  └── Render.com: Auto-deploy backend on push → joy-curry-tandoor-api.onrender.com
```

**Frontend:** static files served by GitHub Pages — no Node process needed.
**Backend:** Node.js on Render free tier — spins down after 15 min idle; first request takes ~30 s.

---

## Environment Variables

| Variable | Where set | Value |
|----------|-----------|-------|
| `JWT_SECRET` | Render dashboard (never in code) | 32+ random chars |
| `NODE_ENV` | Render environment tab | `production` |
| `CORS_ORIGIN` | Render environment tab | `https://joycurry.sayemsiddique.com` |
| `JWT_EXPIRES_IN` | `render.yaml` | `7d` |

```bash
# Generate a strong secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Security Headers (helmet)

```js
app.use(helmet());    // sets all recommended headers automatically
```

Key headers set by helmet + custom config:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | `default-src 'self'` | Blocks XSS |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `Strict-Transport-Security` | `max-age=31536000` | Force HTTPS for 1 year |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |

---

## CORS

```js
import cors from 'cors';

app.use(cors({
  origin: process.env.CORS_ORIGIN,   // 'https://joycurry.sayemsiddique.com'
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));
```

**Never use `origin: '*'` in production** — any site could make authenticated requests to your API.

---

## Rate Limiting

```js
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,                     // 10 login/register attempts per window
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
});

app.use('/api/auth', authLimiter);
```

---

## Compression

```js
import compression from 'compression';
app.use(compression());    // gzip all responses > 1 KB
```

Reduces JSON response size by ~60–80%. Required for acceptable performance on mobile.

---

## AbortController Timeout Reference

```js
// menuService.js  — 8 s
// orderService.js order history — 10 s
// orderService.js place order   — 15 s
```

Always `clearTimeout(timer)` in the success branch to avoid aborting a completed request.

---

## GitHub Actions CI

```yaml
# .github/workflows/ci.yml
- name: Run ESLint
  run: npx eslint .
  working-directory: backend

- name: Health check (live Render backend)
  if: ${{ secrets.RENDER_API_URL != '' }}
  run: curl --fail --max-time 15 ${{ secrets.RENDER_API_URL }}/api/health
```

**Zero warnings policy** — `eslint.config.js` is set to `warn: 'error'` so CI fails on any lint warning.

---

## Soft-Delete Pattern

```sql
-- Never DELETE rows from transactional tables
UPDATE menu_items SET is_active = 0, deleted_at = datetime('now') WHERE id = ?;
UPDATE orders     SET status    = 'cancelled'                      WHERE order_id = ?;
```

**Why:** deleted rows break order history, analytics, and audit trails.

---

## Performance Checklist

- [x] `compression()` middleware — gzip API responses
- [x] `Cache-Control: public, max-age=31536000` on `/js/*` and `/css/*` (Vercel config)
- [x] `Cache-Control: no-cache` on `index.html` — always fresh
- [x] SQLite `PRAGMA journal_mode = WAL` — concurrent reads without locking
- [x] Prepared statements in every model — query compilation cached by SQLite
- [x] Skeleton loading — perceived performance while API responds
- [x] AbortController timeouts — no hanging requests

---

## Security Audit Commands

```bash
# Check for vulnerabilities in production dependencies
npm audit --omit=dev

# Verify security headers are present
curl -I https://joy-curry-tandoor-api.onrender.com/api/health

# Confirm CORS blocks unexpected origins
curl -H "Origin: https://evil.com" https://joy-curry-tandoor-api.onrender.com/api/menu
```

---

## render.yaml Key Fields

```yaml
services:
  - type: web
    name: joy-curry-tandoor-api
    runtime: node
    plan: free
    rootDir: backend
    buildCommand: npm install
    startCommand: node server.js
```

`plan: free` — SQLite DB resets on every redeploy (ephemeral). Acceptable for this demo; switch to Render Postgres for persistence.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `JWT_SECRET` hardcoded in `server.js` | Set only in Render environment variables; read via `process.env.JWT_SECRET` |
| `origin: '*'` in CORS config | Set to the exact frontend domain |
| `npm audit` ignored with vulnerabilities in prod deps | Fix or justify each — 0 production vulnerabilities is the target |
| Forgetting `.nojekyll` file in GitHub Pages `/docs` | Jekyll ignores `_` prefixed files — `.nojekyll` disables it |
| Deploying without checking `NODE_ENV=production` | Without it, dev dependencies and verbose logging may run in prod |
