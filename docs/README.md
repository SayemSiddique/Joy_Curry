# Joy Curry & Tandoor — Dev Docs

> Phase-by-phase reference for the full-stack ordering website built for Joy Curry & Tandoor, a Halal Indian restaurant in NYC (est. 1994).

## Live Links

| | URL |
|---|---|
| **Frontend** | [joycurry.sayemsiddique.com](https://joycurry.sayemsiddique.com) |
| **Backend API** | [joy-curry-tandoor-api.onrender.com/api](https://joy-curry-tandoor-api.onrender.com/api) |
| **GitHub** | [SayemSiddique/joy-curry-tandoor](https://github.com/SayemSiddique/joy-curry-tandoor) |

> **Cold start notice:** The Render free tier spins down after 15 min of inactivity. The first API request after idle takes ~30 s.

---

## What Was Built

A production-grade food ordering website — from zero JavaScript knowledge to a deployed, authenticated, full-stack application across 8 phases:

| Phase | Focus | Key Deliverables |
|-------|-------|-----------------|
| 0 | Setup | Git, folder structure, tooling |
| 1 | JS Foundations | Variables, arrays, objects, modules, ES6 |
| 2 | CSS Architecture | Design tokens, BEM, flexbox, mobile-first |
| 3 | DOM & Events | Card rendering, search, filter, skeletons, error states |
| 4 | State & Cart | cartState, localStorage, checkout, form validation |
| 5 | Backend | Express, SQLite, REST API, 145 seeded menu items |
| 6 | Auth & Async | JWT, bcrypt, fetch, AbortController, admin role |
| 7 | Bundles & Orders | BundleModal, order placement, history, reorder, admin panel |
| 8 | Polish & Deploy | Security headers, CI/CD, GitHub Pages + Render deployment |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS (ES Modules), HTML5, CSS3 |
| Backend | Node.js, Express.js |
| Database | SQLite via `better-sqlite3` |
| Auth | JWT + bcrypt |
| Hosting | GitHub Pages (frontend) + Render.com (backend) |
| CI | GitHub Actions (ESLint + health check) |

---

## Architectural Rules (Non-Negotiable)

- **Currency:** integer cents everywhere (`priceCents: 1550` = $15.50). Format only at render via `formatPrice()`.
- **Timestamps:** all stored and compared in UTC (`datetime('now')` in SQLite).
- **Soft deletes:** `is_active = 0` / `deleted_at` — never `DELETE` transactional rows.
- **`isActive` ≠ `inStock`:** menu visibility and kitchen availability are separate flags with independent toggle routes.
- **`app.js` is the only DOM entry point:** all components are pure string-returning functions.
- **ES Modules throughout:** `<script type="module">` is mandatory — never remove it.

---

## Cheat Sheets

One reference sheet per phase. Use the sidebar to navigate.

Each sheet covers the concepts introduced in that phase using real Joy Curry code examples. Every sheet ends with a **Common Mistakes** table showing the fix.

---

## Local Development

```bash
# Backend
cd backend
npm install
cp .env.example .env          # fill in JWT_SECRET
npm run dev                   # http://localhost:3000

# Frontend
cd frontend
# Open index.html with VS Code Live Server
# or: python3 -m http.server 5500
```

Seed data loads automatically on backend start (`scripts/seed.js` runs in `server.js`).
