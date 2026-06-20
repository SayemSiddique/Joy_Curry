# Joy Curry & Tandoor — Online Ordering

A production-grade food-ordering website for Joy Curry & Tandoor, a Halal Indian restaurant in Midtown Manhattan (est. 1994). Built from scratch using vanilla JavaScript, Node.js, and SQLite across 8 phases — no frameworks, no shortcuts.

## Live

| | URL |
|---|---|
| **Frontend** | [joycurry.sayemsiddique.com](https://joycurry.sayemsiddique.com) |
| **Backend API** | [joy-curry-tandoor-api.onrender.com/api](https://joy-curry-tandoor-api.onrender.com/api/health) |
| **Docs** | [joycurry.sayemsiddique.com/docs](https://joycurry.sayemsiddique.com/docs) |

> **Note:** The backend runs on Render's free tier and spins down after 15 min of inactivity. The first request after idle takes ~30 s.

## Features

- Browse 145 real menu items across 12 categories with search, filter, and spice-level badges
- Add items to cart with size/modifier options; cart persists across page reloads via `localStorage`
- Guest checkout with name, email, and phone validation; order confirmation screen with order ID
- User registration and login (JWT-authenticated); order history drawer with reorder functionality
- Joy Combos — configurable bundle orders at a fixed price with per-slot item selection
- Admin panel (role-gated): toggle stock availability, edit prices, soft-delete items, add new items
- Responsive mobile-first layout; skeleton loading; focus-trapped modals; full keyboard navigation

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Vanilla JS (ES Modules), HTML5, CSS3 | No framework; `app.js` is the sole DOM entry point |
| Backend | Node.js + Express.js | Helmet, CORS, compression, rate limiting |
| Database | SQLite via `better-sqlite3` | WAL mode; prepared statements throughout |
| Auth | JWT + bcryptjs | 12 bcrypt rounds; `verifyToken` + `requireRole` middleware |
| Hosting | GitHub Pages + Render.com | CI via GitHub Actions |

## Architecture Decisions

**Currency — integer cents.** All monetary values are stored and computed as integers (`priceCents: 1550` = $15.50). `formatPrice()` converts to display string only at render time. Floating-point rounding errors are eliminated at the source.

**Timestamps — UTC everywhere.** SQLite `datetime('now')` produces UTC. All comparisons and sorts use UTC strings.

**Soft deletes — never `DELETE` transactional rows.** Menu items use `is_active = 0` + `deleted_at`. Orders use `status = 'cancelled'`. Preserves order history and analytics integrity.

**`isActive` ≠ `inStock`.** `is_active` controls menu visibility (admin decision); `in_stock` controls real-time kitchen availability (ops toggle). Separate flags, separate routes (`DELETE` vs `PATCH .../stock`).

**ES Modules throughout.** `<script type="module">` is mandatory on the `index.html` script tag. Components are pure functions returning HTML strings; `app.js` owns all DOM writes.

## Local Development

**Prerequisites:** Node.js 20+, npm

```bash
# 1. Clone
git clone https://github.com/SayemSiddique/joy-curry-tandoor.git
cd joy-curry-tandoor

# 2. Backend
cd backend
npm install
cp .env.example .env
# Edit .env: set JWT_SECRET to any 32+ character string
npm run dev
# → API running at http://localhost:3000
# → Database seeded automatically with 145 menu items

# 3. Frontend (new terminal)
cd frontend
# Open index.html with VS Code Live Server (port 5500)
# or: python3 -m http.server 5500
# → http://localhost:5500
```

The `API_BASE_URL` auto-switches: `localhost:3000` in development, `onrender.com` in production, based on `window.location.hostname`.

## Project Structure

```
joy-curry-tandoor/
├── frontend/
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── app.js               # DOM entry point
│       ├── components/          # pure HTML-string builders
│       ├── state/               # cartState, authState
│       ├── services/            # menuService, orderService, authService
│       ├── utils/               # formatters, validators, focusTrap
│       ├── config/constants.js  # API_BASE_URL (auto-switches dev/prod)
│       └── data/menu/           # 145 items as ES module seed files
├── backend/
│   ├── server.js
│   ├── routes/                  # menu, auth, orders, admin, payments
│   ├── models/                  # prepared-statement wrappers
│   ├── middleware/              # verifyToken, requireRole, rateLimiter
│   ├── db/                      # database.js, setup.js, seed.js
│   └── utils/                   # helpers, email, logger
├── docs/                        # Docsify documentation site
│   └── cheatsheets/             # one .md reference sheet per phase
├── .github/workflows/           # CI (ESLint + health check), docs deploy
├── render.yaml                  # Render.com web service definition
└── vercel.json                  # Vercel headers config (legacy)
```

## Deployment

**Backend (Render.com)**
1. Connect repo in Render dashboard — `render.yaml` is auto-detected
2. Set `JWT_SECRET` in the Render environment tab (never commit this)
3. Deploy — seed runs on start; `GET /api/health` confirms readiness

**Frontend & Docs (GitHub Pages)**

Push to `main` — GitHub Actions workflows deploy automatically:
- `ci.yml` — ESLint + optional Render health check
- `deploy-docs.yml` — Deploys `/docs` to the `gh-pages` branch under `/docs/`

Custom domain `joycurry.sayemsiddique.com` is set via a `CNAME` file in the `gh-pages` branch.

## Restaurant

**Joy Curry & Tandoor** — 148 East 46th St, between Lex. & 3rd Ave, New York, NY 10017  
[joycurry.net](https://joycurry.net) · 212-490-1277 · Est. 1994

## Author

Sam Siddique — [@SayemSiddique](https://github.com/SayemSiddique)
