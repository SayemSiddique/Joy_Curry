# Joy Curry & Tandoor — Online Ordering Platform

A full-stack online ordering system for **Joy Curry & Tandoor**, a Halal Indian restaurant in Midtown Manhattan (est. 1994). Built with Astro, Node.js/Express, and PostgreSQL — featuring a complete customer-facing storefront, guest and authenticated checkout, and a role-gated admin panel.

## Status

Preparing for first production deployment. Live URLs will be published here once the frontend (Vercel) and backend (Render) environments are provisioned. Run locally with the steps under [Local Development](#local-development).

## Features

- **Menu** — 145 items across 12 categories with search, category filter, and spice-level badges
- **Cart** — Add items with size/modifier selection; cart persists via `localStorage` across sessions
- **Checkout** — Guest checkout with name, email, and phone validation; order confirmation with order ID
- **Authentication** — JWT-based registration and login; order history drawer with one-click reorder
- **Joy Combos** — Configurable bundle orders at a fixed price with per-slot item selection
- **Admin Panel** — Role-gated: toggle stock availability, edit prices, soft-delete items, add new items
- **UX** — Mobile-first responsive layout, skeleton loading states, focus-trapped accessible modals

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | [Astro](https://astro.build) (SSG) — `.astro` components with vanilla JS islands |
| Backend | Node.js + Express.js with Helmet, CORS, compression, and rate limiting |
| Database | PostgreSQL (hosted on Render) — prepared statements throughout |
| Auth | JWT + bcryptjs — `verifyToken` + `requireRole` middleware |
| Hosting | Vercel (frontend) + Render (backend + DB) |
| CI | GitHub Actions — ESLint lint check + API health check on push |

## Architecture Notes

**Currency — integer cents.** All monetary values are stored and computed as integers (`price_cents: 1550` = $15.50). `formatPrice()` converts to a display string only at render time, eliminating floating-point rounding errors at the source.

**Soft deletes.** Menu items use `is_active = 0` + `deleted_at`; orders use `status = 'cancelled'`. Transactional rows are never hard-deleted, preserving order history and analytics integrity.

**`isActive` vs `inStock`.** `is_active` controls menu visibility (an admin content decision); `in_stock` controls real-time kitchen availability (an ops toggle). These are separate flags backed by separate API routes.

**UTC timestamps everywhere.** All `created_at` / `updated_at` columns use `NOW() AT TIME ZONE 'UTC'`. Comparisons and sorts are consistent regardless of server locale.

## Local Development

**Prerequisites:** Node.js 20+, npm, PostgreSQL 15+

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd Joy_Curry

# 2. Start the backend
cd backend
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL (postgres://...) and JWT_SECRET (32+ chars)
npm run dev
# API is now running at http://localhost:3000
# The database is seeded automatically on first start

# 3. Start the Astro frontend (new terminal)
cd ../astro-frontend
npm install
npm run dev
# Frontend is now running at http://localhost:4321
```

## Project Structure

```
joy-curry-tandoor/
├── astro-frontend/          # Astro SSG frontend
│   ├── src/
│   │   ├── pages/           # .astro page routes
│   │   ├── components/      # Reusable Astro components
│   │   ├── layouts/         # Base layout wrappers
│   │   └── scripts/         # Client-side JS modules
│   └── public/              # Static assets (images, fonts)
├── backend/                 # Express.js REST API
│   ├── server.js
│   ├── routes/              # menu, auth, orders, admin
│   ├── middleware/          # verifyToken, requireRole, rateLimiter
│   ├── db/                  # database.js, setup.js, seed.js
│   └── utils/               # helpers, logger
├── docs/                    # Docsify documentation site
├── .github/workflows/       # CI — lint + health check + docs deploy
├── render.yaml              # Render web service definition
└── vercel.json              # Vercel headers config
```

## Deployment

**Backend — Render.com**
1. Connect the repo in the Render dashboard — `render.yaml` is auto-detected
2. Set `DATABASE_URL` and `JWT_SECRET` in the Render environment tab
3. Deploy — the seed script runs on startup; `GET /api/health` confirms readiness

**Frontend — Vercel**
1. Import the repo and set the root directory to `astro-frontend`
2. Vercel auto-detects Astro and configures the build command
3. Push to `main` — deployments are automatic

**Docs — GitHub Pages**
`deploy-docs.yml` deploys the `/docs` Docsify site to the `gh-pages` branch on every push to `main`.

## Restaurant

**Joy Curry & Tandoor** · 148 East 46th St, New York, NY 10017  
[joycurry.net](https://joycurry.net) · (212) 490-1277 · Est. 1994

## Author

Sam Siddique — [github.com/SayemSiddique](https://github.com/SayemSiddique)
