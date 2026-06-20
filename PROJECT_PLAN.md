# Joy Curry & Tandoor — Project Plan

> Single source of truth for phase/chunk status. Updated each session.
> Legend: ✅ Done | 🔄 In Progress | ⬜ Not Started

---

## Phase 0 — Setup ✅
Environment, Git, folder structure, Node.js. Complete.

---

## Phase 1 — JS Foundations ✅
126 menu items across 17 category files. `validate-menu.mjs` passes all assertions. `formatters.js`, `constants.js`, `menu-queries.mjs` present. Complete.

---

## Phase 2 — CSS Architecture ✅
`styles.css` (1311 lines): design tokens, reset, typography, layout, all components (navbar, menu-card, badges, buttons, cart drawer, cart item, checkout modal, forms, allergen banner, footer), accessibility, responsive, print. `index.html` (650 lines) full semantic skeleton. Complete.

---

## Phase 3 — DOM & Interactivity ✅

| Chunk | Milestone | Status |
|-------|-----------|--------|
| A | M3.3 — Menu cards render from data; `app.js` wired; static HTML replaced by JS mount point | ✅ Done |
| B | M3.4 — Live search bar with debounce; `filterUtils.js` pure filter functions | ✅ Done |
| C | M3.5 + M3.6 — Category filters, dietary toggles, spice/price selectors; event delegation; `activeFilters` state | ✅ Done |
| D | M3.7 — Skeleton loading state, zero-results message, error boundary in `app.js` | ✅ Done |

---

## Phase 4 — State, Options & Cart ✅

| Chunk | Milestone | Status |
|-------|-----------|--------|
| A | M4.1 + M4.2 — Options modal (size/modifiers/protein/spice/qty); `cartState.js` (add/remove/update/subscribe/cents); `options.js` full implementation | ✅ Done |
| B | M4.3 — `CartItem.js` component; cart drawer wiring; live subtotal/tax/total; cart badge count | ✅ Done |
| C | M4.7 — `localStorage` persistence; restore cart on page load; schema validation on restore | ✅ Done |
| D | M4.5 + M4.6 — `CheckoutModal.js`; `validators.js` full implementation; form submit with `preventDefault`; inline validation errors; mock confirmation; `clearCart()` | ✅ Done |

**Phase 4 Deliverable:** Full frontend ordering flow — menu → item detail/options → cart → checkout form → mock confirmation. No backend yet.

---

## Phase 5 — Backend: Node.js + Express + SQLite ✅

| Chunk | Milestone | Status |
|-------|-----------|--------|
| A | M5.2 + M5.3 + M5.7 + M5.8 — `config/db.js` (SQLite singleton, promise wrapper); `db/setup.js` (full schema: menu_items + 3 junction tables + indexes); `server.js` (CORS, JSON, logger, routes, 404, errorHandler); `middleware/errorHandler.js`; `utils/logger.js` | ✅ Done |
| B | M5.4 + M5.5 + M5.6 — `db/seed.js` (126 items seeded, cents conversion, parameterized queries); `models/menu.js` (getAllMenuItems w/ filters, getMenuItemById, createMenuItem, updateMenuItem, softDeleteMenuItem, toggleItemStock); `routes/menu.js` (GET /api/menu, GET /api/menu/:id); `middleware/validate.js` | ✅ Done |
| C | M5.9 — `routes/admin.js` (POST/PUT/DELETE/PATCH with verifyToken stub); `middleware/auth.js` (Phase 6 stub); `middleware/rateLimiter.js` (Phase 6 stub) | ✅ Done |
| D | Phase 6/7 stubs — `routes/users.js`, `routes/orders.js`, `models/user.js`, `models/order.js`, `utils/helpers.js`, `utils/email.js`, `services/aiService.js` | ✅ Done |

**Phase 5 Deliverable:** Running Express API on port 3000. 126 menu items in SQLite. `GET /api/menu` (filters: category, vegan, vegetarian, glutenFree, inStock, search), `GET /api/menu/:id` (with allergens + modifiers + sizeOptions), admin write endpoints (POST/PUT/DELETE/PATCH). All verified via curl. Size options confirmed (Tandoori Chicken Half 1200¢ / Full 2100¢). Prices stored as integer cents throughout.

---

## Phase 6 — Auth & API Integration ✅

| Chunk | Milestone | Status |
|-------|-----------|--------|
| A | DB migration (users table + index); `models/user.js` — createUser, getUserByEmail, getUserById, updateUser; bcrypt hashing; JSON columns for addresses/dietary_prefs | ✅ Done |
| B | `routes/users.js` — POST /register, POST /login, POST /logout; JWT issuance (HS256, 7d expiry); `validateRegister` + `validateLogin` in `middleware/validate.js`; `.env` JWT vars | ✅ Done |
| C | `middleware/auth.js` — real `verifyToken` + `requireRole`; admin routes now enforce role:'admin' via `router.use(verifyToken, requireRole('admin'))` | ✅ Done |
| D | GET /api/users/me + PUT /api/users/me (profile CRUD, behind verifyToken); partial update of name/phone/dietaryPrefs/addresses | ✅ Done |
| E | `middleware/rateLimiter.js` — `globalLimiter` (100 req/15min) + `loginLimiter` (10 failed/15min, skipSuccessfulRequests); wired in server.js | ✅ Done |
| F | `frontend/js/api/menuService.js` — fetch replaces local import; `authService.js` — login/register/logout/getProfile/updateProfile; `authState.js` — reactive state with subscribe/setAuth/clearAuth/token restore; `app.js` — async initMenu, await getMenu() | ✅ Done |

**Phase 6 Deliverable:** Users register, log in, stay authenticated across refreshes (JWT in localStorage), log out. `GET/PUT /api/users/me` protected by verifyToken. Admin routes protected by verifyToken + requireRole('admin'). Rate limiting active. Frontend fetches menu from `GET /api/menu` — no local data import. `password_hash` never appears in any response. Verified via curl: register → 201, duplicate email → 409, wrong password → 401, /me without token → 401, customer token on admin route → 403, 10th failed login → 429.

---

## Phase 7 — Bundles, Checkout & Email 🔄

| Chunk | Milestone | Status |
|-------|-----------|--------|
| A | M7.1 — Bundle data models: `dinner-specials.js` (3 bundles), `joy-combos.js` (15 platters), `constants.js` constraint ID pools, `appetizers.js` +Pakora, `002_add_orders.js` migration, `setup.js` wired; validate-menu.mjs passes 145 items | ✅ Done |
| B | M7.2 + M7.3 + M7.4 — BundleModal UI; cartState bundle support; CartItem bundle render; app.js wiring | ✅ Done |
| C | M7.5 — Order backend: `models/order.js`, `routes/orders.js`, `validate.js` validateOrder | ✅ Done |
| D | M7.6 + M7.7 — Frontend checkout→confirmation→history→reorder; `orderService.js` | ✅ Done |
| E | M7.8 — Email confirmations via Resend; `email.js` real implementation | ✅ Done |
| F | M7.9 — Admin UI: `AdminPanel.js` wired to admin endpoints | ✅ Done |

**Phase 7 Deliverable:** Complete ordering + admin system. Bundles, checkout, order history, email confirmations, and admin panel all production-ready. Admin UI (role:'admin' only) provides: paginated item list with stock badges, inline stock toggle (PATCH /api/admin/menu/:id/stock), inline edit form (PUT — name, price in $, description), deactivate/soft-delete (DELETE), and add new item (POST). `GET /api/admin/menu` returns all non-hard-deleted items. Auth role decoded from JWT on restore — admin button persists across page loads.

---

## Phase 8 — Polish, Security & Deployment 🔄

| Chunk | Milestone | Status |
|-------|-----------|--------|
| A | M8.1 — Error handling & edge cases: AbortController timeout (8s menu / 10s history / 15s orders) in menuService + orderService; `showToast()` utility in app.js; `reconcileCartWithMenu()` removes out-of-stock items on cart restore; 401 in order-history drawer → `clearAuth()` + toast; toast CSS added to styles.css | ✅ Done |
| B | M8.2 — Loading skeletons & transitions: skeleton shimmer verified; cart overlay (`#cart-overlay`) added to index.html + wired in app.js (open/close toggles `cart-overlay--visible`, click backdrop closes drawer); all existing CSS transitions confirmed (cart slide, modal fade, filter toggles) | ✅ Done |
| C | M8.3 — Accessibility audit: `focusTrap.js` utility created; Tab trap wired to options modal, bundle modal, and checkout modal; return-focus-on-close wired to all three; existing ARIA roles/labels/landmarks confirmed correct; `aria-live` on cart badge and `#menu-root` confirmed; MenuCard add button `aria-label` confirmed; skip-nav `href="#main"` confirmed working | ✅ Done |
| D | M8.4 + M8.5 — Performance + Security audit: `compression`, `helmet`, `cors` installed; manual CORS block replaced with `cors` package; CSP/X-Frame-Options/HSTS/X-Content-Type/Referrer-Policy headers confirmed via curl; `GET /api/health` route added; sqlite3→6.0.1, bcrypt→6.0.0, nodemon→3 upgraded; `npm audit --omit=dev` = 0 vulnerabilities | ✅ Done |
| E | M8.6 — CI/CD + integration stubs: `.github/workflows/ci.yml` (ESLint + optional Render health check); `backend/eslint.config.js` (ESLint 9 flat config, 0 warnings); `cloverService.js`, `deliveryService.js` (Haversine 4-mile radius), `paymentService.js` (Stripe), `routes/payments.js` (503 stub) created; `.env.example` updated with all future env var slots | ✅ Done |
| F | M8.7 + M8.8 — Deployment to joycurry.sayemsiddique.com | ✅ Done |
| G | M8.9 — Final documentation + Docsify | ✅ Done |

**Phase 8 Deliverable:** All 8 phases complete. 9 cheatsheets written to `docs/cheatsheets/` (one per phase, concept → syntax → Joy Curry example → Common Mistakes format). Docsify site in `docs/` with `index.html`, `_sidebar.md`, `README.md`, `.nojekyll`. `deploy-docs.yml` GitHub Actions workflow deploys `/docs` to `gh-pages` branch under `/docs/` subdirectory → accessible at `https://joycurry.sayemsiddique.com/docs`. `README.md` updated with live URLs, full setup guide, architecture decisions, and project structure.

---

## Key Architectural Decisions (locked)

- **Currency:** integer cents everywhere; format only at render via `formatPrice()` in `utils/formatters.js`
- **Timestamps:** UTC
- **Soft deletes:** `is_active` / `deleted_at` — never hard-delete transactional data
- **`isActive` ≠ `inStock`:** menu visibility vs. kitchen availability are separate flags
- **`dinner-specials.js` + `joy-combos.js`:** filtered out until Phase 7
- **`app.js` is the only DOM entry point:** components are pure string builders
- **ES Modules throughout:** `type="module"` on script tag, never remove
- **No new CSS in Phases 3–4:** BEM class names must match `styles.css` exactly
