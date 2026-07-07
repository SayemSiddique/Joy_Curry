# Joy Curry & Tandoor — Online Ordering Platform

A full-stack online ordering system for **Joy Curry & Tandoor**, a Halal Indian restaurant in Midtown Manhattan (est. 1994). Built as a pnpm + Turborepo monorepo — an Astro web app, an Express/PostgreSQL API, and a shared `@joy-curry/core` package that will also power the upcoming iOS/Android (Expo) app.

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
| Monorepo | pnpm workspaces + [Turborepo](https://turborepo.com) |
| Frontend | [Astro](https://astro.build) 6 SSR + React 19 islands, nanostores state |
| Shared core | `@joy-curry/core` — types, constants, API client, cart/auth stores (platform-agnostic) |
| Backend | Node.js + Express.js with Helmet, CORS, compression, and rate limiting |
| Database | PostgreSQL (hosted on Render) — prepared statements throughout |
| Auth | JWT + bcrypt — `verifyToken` + `requireRole` middleware |
| Hosting | Vercel (web) + Render (API + DB) |
| Mobile (planned) | Expo (React Native) sharing `@joy-curry/core` |

## Architecture Notes

**Share logic, not pixels.** Business logic (cart math, auth state, API client, formatters) lives in `packages/core` and is consumed by the web app today and the Expo mobile app later. UI stays per-platform: Astro/React for web, React Native screens for mobile.

**Currency — integer cents.** All monetary values are stored and computed as integers (`price_cents: 1550` = $15.50). `formatPrice()` converts to a display string only at render time, eliminating floating-point rounding errors at the source.

**Soft deletes.** Menu items use `is_active = 0` + `deleted_at`; orders use `status = 'cancelled'`. Transactional rows are never hard-deleted, preserving order history and analytics integrity.

**`isActive` vs `inStock`.** `is_active` controls menu visibility (an admin content decision); `in_stock` controls real-time kitchen availability (an ops toggle). These are separate flags backed by separate API routes.

**UTC timestamps everywhere.** All `created_at` / `updated_at` columns use `NOW() AT TIME ZONE 'UTC'`. Comparisons and sorts are consistent regardless of server locale.

## Local Development

**Prerequisites:** Node.js 22.12+ (repo pins v24 via `.nvmrc`), pnpm (via `corepack enable`), PostgreSQL 15+

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd Joy_Curry
corepack enable   # activates the pnpm version pinned in package.json

# 2. Install all workspaces (root, apps/web, apps/api, packages/core)
pnpm install

# 3. Configure and start the API
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — set DATABASE_URL (postgres://...) and JWT_SECRET (32+ chars)
pnpm --filter joy-curry-tandoor-backend dev
# API is now running at http://localhost:3000
# The database is seeded automatically on first start

# 4. Start the Astro web app (new terminal)
pnpm --filter astro-frontend dev
# Web is now running at http://localhost:4321
```

## Project Structure

```
joy-curry/
├── apps/
│   ├── web/                 # Astro 6 SSR web app (Vercel)
│   │   ├── src/
│   │   │   ├── pages/       # .astro page routes
│   │   │   ├── components/  # static .astro components + React islands
│   │   │   ├── layouts/     # Base layout wrappers
│   │   │   ├── stores/      # web-only UI state
│   │   │   └── lib/         # web-only helpers (toast, animations)
│   │   ├── public/          # Static assets (images, fonts)
│   │   └── vercel.json      # Vercel headers config
│   └── api/                 # Express.js REST API (Render)
│       ├── server.js
│       ├── routes/          # menu, users, orders, slots, distance, rewards, admin
│       ├── middleware/      # verifyToken, requireRole, rateLimiter, validate
│       ├── db/              # setup.js, seed.js, migrations, menu data
│       └── services/        # delivery, payments (stub), ai (stub)
├── packages/
│   └── core/                # @joy-curry/core — shared types, constants,
│                            # API client, cart/auth stores (web + mobile)
├── .agent/                  # agent team playbook (ORCHESTRATOR.md = ground truth)
├── scripts/                 # menu validation / seeding utilities
├── render.yaml              # Render Blueprint (rootDir: apps/api)
├── pnpm-workspace.yaml
└── turbo.json
```

## Deployment

**Backend — Render.com**
1. Connect the repo in the Render dashboard — `render.yaml` is auto-detected (`rootDir: apps/api`)
2. Set `DATABASE_URL` and `JWT_SECRET` in the Render environment tab
3. Deploy — the seed script runs on startup; `GET /api/health` confirms readiness

**Frontend — Vercel**
1. Import the repo and set the root directory to `apps/web`
2. Vercel auto-detects Astro; set `PUBLIC_API_BASE_URL` to the Render API URL
3. Push to `main` — deployments are automatic

## Restaurant

**Joy Curry & Tandoor** · 148 East 46th St, New York, NY 10017  
[joycurry.net](https://joycurry.net) · (212) 490-1277 · Est. 1994

## Author

Sam Siddique — [github.com/SayemSiddique](https://github.com/SayemSiddique)
