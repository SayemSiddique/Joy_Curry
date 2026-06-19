# Joy Curry & Tandoor — Git & Deployment Status

> Tracks the push-to-live plan for the client demo at `joycurry.sayemsiddique.com`.
> Updated after each step is completed.
> Legend: ✅ Done | 🔄 In Progress | ⬜ Not Started

---

## Infrastructure

| Component | Platform | URL / Details |
|-----------|----------|---------------|
| Source repo | GitHub | https://github.com/SayemSiddique/joy-curry-tandoor |
| Frontend (static) | GitHub Pages → `gh-pages` branch | https://joycurry.sayemsiddique.com |
| Backend API | Render.com free tier | https://joy-curry-tandoor-api.onrender.com/api |
| Database | SQLite, seeded on every Render deploy | ephemeral — resets on redeploy; demo-safe |

---

## Phase A — Git Catch-Up (Phases 3D → 7D)

| # | Commit | Status |
|---|--------|--------|
| 1 | `feat(dom): skeleton loading, zero-results state, error boundary (M3.7)` | ✅ Done |
| 2 | `feat(cart): cartState (add/remove/update/cents), options modal (M4.1+M4.2)` | ✅ Done |
| 3 | `feat(cart): CartItem component, cart drawer, live totals, badge count (M4.3)` | ✅ Done |
| 4 | `feat(cart): localStorage persistence, CheckoutModal, validators, confirmation (M4.5+M4.6+M4.7)` | ✅ Done |
| 5 | `feat(backend): Express server, SQLite schema, middleware stack (M5.2+M5.3+M5.7+M5.8)` | ✅ Done |
| 6 | `feat(backend): seed 145 items, menu model, GET /api/menu routes (M5.4–M5.6+M7.1)` | ✅ Done |
| 7 | `feat(auth): users table, register/login/logout routes, JWT, bcrypt (M6.A+M6.B)` | ✅ Done |
| 8 | `feat(auth): verifyToken, requireRole, admin routes, rate limiting (M6.C–M6.E)` | ✅ Done |
| 9 | `feat(api): menuService, authService, authState, async menu init (M6.F)` | ✅ Done |
| 10 | `feat(orders): BundleModal, checkout→confirmation→history→reorder (M7.2–M7.7)` | ✅ Done |
| 11 | `docs: add PROJECT_PLAN, Roadmap, Developer_Role, update .env.example` | ✅ Done |

---

## Phase B — Production Config & Deploy Files

| # | Task | Status |
|---|------|--------|
| 12 | `render.yaml` — Render.com web service definition | ✅ Done |
| 13 | `.github/workflows/deploy-frontend.yml` — auto-deploy frontend to `gh-pages` | ✅ Done |
| 14 | `frontend/js/config/constants.js` — auto-switch API_BASE_URL dev vs prod | ✅ Done |
| 15 | `chore(deploy): render.yaml + GitHub Actions workflow` committed & pushed | ✅ Done |
| 16 | `feat(config): auto-switch API_BASE_URL` committed & pushed | ✅ Done |

---

## Phase C — Backend Deployment (Render.com)

| # | Task | Status |
|---|------|--------|
| 17 | Create Render Web Service from GitHub repo | ⬜ |
| 18 | Set `JWT_SECRET` env var in Render dashboard | ⬜ |
| 19 | Deploy succeeds (green build log) | ⬜ |
| 20 | `curl https://[render-url]/api/menu` returns 200 + 145 items | ⬜ |
| 21 | Confirm actual Render URL matches `constants.js` — update if different | ⬜ |

---

## Phase D — Frontend Deployment (GitHub Pages)

| # | Task | Status |
|---|------|--------|
| 22 | GitHub Actions workflow triggers on push to `main` | ⬜ |
| 23 | `gh-pages` branch created with `frontend/` contents + `CNAME` file | ⬜ |
| 24 | GitHub Pages enabled (Settings → Pages → `gh-pages` branch) | ⬜ |
| 25 | Custom domain set to `joycurry.sayemsiddique.com` | ⬜ |
| 26 | "Enforce HTTPS" enabled | ⬜ |

---

## Phase E — DNS Configuration

| # | Task | Status |
|---|------|--------|
| 27 | CNAME record added at DNS provider: `joycurry → sayemsiddique.github.io` | ⬜ |
| 28 | DNS propagation confirmed (TTL elapsed) | ⬜ |
| 29 | `https://joycurry.sayemsiddique.com` resolves | ⬜ |

---

## Phase F — Smoke Tests (Manual Verification)

| # | Test | Expected | Status |
|---|------|----------|--------|
| T1 | `curl https://[render-url]/api/menu` | 200, JSON items array | ⬜ |
| T2 | `curl https://[render-url]/api/menu?category=tandoori` | Filtered results | ⬜ |
| T3 | Open `https://joycurry.sayemsiddique.com` | Menu loads, all cards render | ⬜ |
| T4 | Search "chicken" in search bar | Live-filtered results | ⬜ |
| T5 | Click item → Options modal → Add to Cart | Cart badge count updates | ⬜ |
| T6 | Open cart drawer → adjust qty → subtotal/tax/total update | Math correct (cents) | ⬜ |
| T7 | Checkout form → submit | Order confirmation shown | ⬜ |
| T8 | Refresh page | Cart still populated (localStorage) | ⬜ |
| T9 | Register new user via form | 201, JWT stored, navbar updates | ⬜ |
| T10 | Login → "My Orders" → order history visible | Order list renders | ⬜ |

---

## Critical Notes for Client Demo

- **Cold start warning**: Render free tier spins down after 15 min of inactivity. First request takes ~30s. Open the site yourself a minute before showing the client.
- **Database resets on redeploy**: Menu data is always fresh (seeded on startup). No user accounts persist across Render deploys — expected for a demo.
- **CORS**: Backend is locked to `https://joycurry.sayemsiddique.com`. Testing from `localhost` requires the local `.env` CORS_ORIGIN to still be set to your dev origin.
- **JWT_SECRET**: Never commit this. Set it only in the Render dashboard.

---

## Render Setup Instructions (Step-by-Step)

1. Go to https://render.com → Sign in with GitHub
2. New → Web Service → Connect repository `SayemSiddique/joy-curry-tandoor`
3. Render will detect `render.yaml` automatically → click **Apply**
4. Under **Environment** tab → Add variable: `JWT_SECRET` = (generate a 32+ char random string)
5. Click **Deploy** — watch logs for `Server running on http://localhost:PORT`
6. Copy the service URL (e.g. `https://joy-curry-tandoor-api.onrender.com`)
7. If URL differs from what's in `constants.js`, update that file, commit, push

## GitHub Pages Setup Instructions

1. After pushing to `main`, the GitHub Action runs automatically
2. Go to repo **Settings → Pages**
3. Source: `Deploy from a branch` → Branch: `gh-pages` → Folder: `/ (root)` → Save
4. Custom domain: `joycurry.sayemsiddique.com` → Save
5. Check **Enforce HTTPS** (after DNS propagates)

## DNS Setup Instructions

At your domain registrar (wherever `sayemsiddique.com` is managed):

```
Type:  CNAME
Host:  joycurry
Value: sayemsiddique.github.io
TTL:   3600
```

GitHub will verify the domain and enable HTTPS via Let's Encrypt automatically.
