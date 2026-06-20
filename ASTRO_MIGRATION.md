# Joy Curry & Tandoor — Astro Frontend Migration
## Master Project Plan

> **Purpose:** This file is the single source of truth for the Astro frontend rewrite.
> Update chunk status to `✅ Done` immediately after completing each chunk.
> Read this at the start of every session before writing any code.

---

## Stack at a Glance

| Layer | Technology |
|---|---|
| Framework | Astro 6 (`output: 'server'`, Node adapter) |
| Islands | React 19 (`@astrojs/react`) |
| State | nanostores + `@nanostores/react` |
| Animation | Framer Motion (islands only) |
| Fonts | Playfair Display + DM Sans (Google Fonts) |
| Backend | Node.js + Express — **zero changes** |
| Dev server | Node 24 via nvm — run `bash start-astro.sh` or use `astro-dev` launch config |
| Deployment | Vercel (update `vercel.json` when ready) |

---

## Project File Locations

```
joy-curry-tandoor/
├── backend/                         ← UNCHANGED — all API routes, DB, auth
├── frontend/                        ← ARCHIVED — vanilla JS (kept for reference)
├── astro-frontend/                  ← NEW — Astro project root
│   ├── astro.config.mjs             ← SSR output, React, Node adapter, path aliases
│   ├── tsconfig.json                ← strict + @/* path aliases
│   ├── start-astro.sh               ← dev server launch (Node 24 path set)
│   └── src/
│       ├── pages/
│       │   └── index.astro          ← main SSR page (fetches /api/menu server-side)
│       ├── layouts/
│       │   └── BaseLayout.astro     ← <head>, fonts, global CSS, <slot/>
│       ├── components/
│       │   ├── static/              ← Astro components (zero JS shipped)
│       │   │   ├── Navbar.astro
│       │   │   ├── Hero.astro
│       │   │   ├── MenuCard.astro
│       │   │   ├── MenuSection.astro
│       │   │   ├── BentoGrid.astro
│       │   │   └── Footer.astro
│       │   └── islands/             ← React components (client-side hydrated)
│       │       ├── SearchFilterBar.tsx
│       │       ├── CartDrawer.tsx
│       │       ├── CheckoutModal.tsx
│       │       ├── BundleModal.tsx
│       │       ├── AuthModal.tsx
│       │       ├── OrderHistory.tsx
│       │       └── AdminPanel.tsx
│       ├── stores/
│       │   ├── cart.ts              ← nanostore (add/remove/qty/totals/localStorage)
│       │   └── auth.ts              ← nanostore (JWT + user/localStorage)
│       ├── lib/
│       │   ├── api.ts               ← typed fetch wrappers for all 14 endpoints
│       │   ├── formatters.ts        ← formatPrice(cents), formatDate, formatDateTime
│       │   └── constants.ts         ← API_BASE_URL, CATEGORIES, SPICE_LEVELS
│       └── styles/
│           └── global.css           ← full 2026 design system (~700 lines)
├── start-astro.sh                   ← dev launch script (Node 24, port 4321)
├── ASTRO_MIGRATION.md               ← THIS FILE
└── joy-curry.db                     ← SQLite DB (image_url fields need Unsplash URLs)
```

---

## Design System — Key Tokens

```css
--color-primary:   #D4930A   /* Saffron gold — primary actions */
--color-cta:       #F5C842   /* Warm yellow — "Add" buttons, hero CTA */
--color-cta-text:  #0D0906   /* Near-black text on yellow */
--color-hero-bg:   #0D0906   /* Near-black warm — navbar, hero, drawers */
--color-bg:        #FAF6EF   /* Warm cream — page background */
--font-display:    'Playfair Display'
--font-body:       'DM Sans'
--font-mono:       'DM Mono'  /* prices */
```

---

## Island Architecture

| Component | Directive | Notes |
|---|---|---|
| `SearchFilterBar.tsx` | `client:idle` | Filters menu data passed as prop from Astro |
| `CartDrawer.tsx` | `client:idle` | Reads/writes nanostore cart |
| `CheckoutModal.tsx` | `client:visible` | POST /api/orders, confirmation screen |
| `BundleModal.tsx` | `client:visible` | Multi-step slot configurator |
| `AuthModal.tsx` | `client:idle` | Login/register, writes nanostore auth |
| `OrderHistory.tsx` | `client:idle` | GET /api/orders/me, reorder |
| `AdminPanel.tsx` | `client:idle` | Role-gated full CRUD |
| All `*.astro` | **No JS** | Pure server-rendered HTML |

---

## API Endpoints (Backend — UNCHANGED)

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /api/menu` | Public | All active items, query params for filters |
| `POST /api/users/register` | Public | Returns JWT |
| `POST /api/users/login` | Public (rate-limited) | Returns JWT |
| `GET /api/users/me` | JWT | Own profile |
| `POST /api/orders` | JWT | Place order, idempotency key |
| `GET /api/orders/me` | JWT | Order history |
| `GET /api/orders/:id` | JWT | Single order |
| `GET /api/admin/menu` | Admin JWT | All items including inactive |
| `POST /api/admin/menu` | Admin JWT | Create item |
| `PUT /api/admin/menu/:id` | Admin JWT | Update item |
| `DELETE /api/admin/menu/:id` | Admin JWT | Soft-delete |
| `PATCH /api/admin/menu/:id/stock` | Admin JWT | Toggle inStock |

---

## Migration Chunks

---

### ✅ Chunk A — Scaffold + Design System
**Status: COMPLETE**

- [x] Astro 6 scaffold in `astro-frontend/`
- [x] React integration (`@astrojs/react`)
- [x] Node SSR adapter (`@astrojs/node`, `output: 'server'`)
- [x] nanostores + `@nanostores/react` + framer-motion installed
- [x] `astro.config.mjs` — SSR, React, Node adapter, Vite path aliases
- [x] `tsconfig.json` — strict + `@/*` path aliases
- [x] `src/styles/global.css` — full design system (colors, typography, spacing, all components)
- [x] `src/lib/constants.ts` — API_BASE_URL, CATEGORIES, SPICE_LEVELS, DIETARY_FILTERS
- [x] `src/lib/formatters.ts` — formatPrice(cents), formatDate, formatDateTime
- [x] `src/lib/api.ts` — typed fetch wrappers (menuApi, authApi, ordersApi, adminApi)
- [x] `src/stores/cart.ts` — nanostore, add/remove/updateQty, derived totals, localStorage
- [x] `src/stores/auth.ts` — nanostore, setAuth/clearAuth, JWT + user, localStorage
- [x] `start-astro.sh` + `.claude/launch.json` — dev server on port 4321 (Node 24)
- [x] Build verified: `npm run build` exits clean, zero TS errors
- [x] Dev server verified: design tokens render correctly in browser

---

### ✅ Chunk B — Static Page Shell (Layout + Navbar + Hero + Footer)
**Status: COMPLETE**

- [x] `src/layouts/BaseLayout.astro` — `<head>`, Google Fonts preconnect, global CSS import, skip-nav, toast container, `<slot/>`
- [x] `src/components/static/Navbar.astro` — sticky dark navbar, 🔥 logo, Sign In + Cart buttons (id hooks for Chunk E/G islands)
- [x] `src/components/static/Hero.astro` — full-bleed dark hero, Unsplash tandoori bg, Playfair italic headline, CTA scrolls to #menu
- [x] `src/components/static/Footer.astro` — dark footer, 3-col grid, address/hours/links, halal + allergen disclaimers
- [x] `src/pages/index.astro` — wired BaseLayout + Navbar + Hero + Footer + `<main id="main-content">` placeholder
- [x] Added `@layouts` path alias to `tsconfig.json` and `astro.config.mjs`
- [x] `localhost:4321` verified: premium dark navbar + Unsplash hero image + dark footer render correctly
- [x] Playfair Display italic headline renders, yellow CTA button visible
- [x] Zero production JS shipped (only Vite dev HMR scripts, stripped at build)

---

### ✅ Chunk C — Menu Static Rendering (MenuCard + MenuSection + BentoGrid)
**Status: COMPLETE**

- [x] `src/pages/index.astro` — SSR `fetch('http://localhost:3000/api/menu')`, groups by CATEGORIES order, passes arrays to MenuSection; shows friendly error if backend down
- [x] `src/components/static/MenuCard.astro` — photo-forward card, price badge overlay (DM Mono), dietary badges (Vegan/Veg/Non-Veg/GF/Halal/Spice), sold-out overlay via `menu-card--out-of-stock`, Add button with `data-item-id/name/price-cents` attrs (no JS — islands wire click in Chunk E)
- [x] `src/components/static/MenuSection.astro` — section heading + item count + `menu-grid` of cards; `id={category}` anchor for bento deep-link
- [x] `src/components/static/BentoGrid.astro` — 16-tile category showcase using verified Unsplash photo IDs; `bento__tile--featured` on first 2 tiles; each tile links to `#category-id` anchor
- [x] `scripts/seed-images.mjs` — updates `image_url` in `backend/joy-curry.db` for all 125 items; all photo IDs verified HTTP 200; run with `DATABASE_URL=./backend/joy-curry.db node scripts/seed-images.mjs`
- [x] Build verified: `npm run build` exits clean, zero TS errors (Node 24 required)
- [x] `inStock: false` items show "Sold Out" overlay + disabled button
- [x] All 16 active categories render with real food photos in bento grid
- [x] Bento tile click scrolls to correct `#category` anchor in the menu

**Notes:**
- Photo IDs sourced from Unsplash CDN — owner should replace with professional photography when available (just update `image_url` in DB, zero code change)
- `1514996937319-344454492b37` is a tech/laptop photo — do NOT reuse it for any category

---

### ✅ Chunk C.5 — Three-Page Architecture Restructure
**Status: COMPLETE**

- [x] `src/pages/index.astro` — reworked to landing-only: Hero + Featured Best-Sellers strip (4 items, galleryMode) + Brand Story section + BentoGrid (linkPrefix="/order") + CTA strip. No full menu SSR on homepage.
- [x] `src/pages/menu.astro` — NEW: pure SSR gallery page, all 145 items, galleryMode=true (no prices, no Add buttons), JSON-LD structured data for Google, editorial header with "Our Menu" italic title
- [x] `src/pages/order.astro` — NEW: full ordering engine shell, all 145 items with prices + Add buttons, header "Order Online", placeholder comments for islands (Chunks D–K)
- [x] `src/components/static/MenuCard.astro` — added `galleryMode?: boolean` prop; hides price badge and Add button when true
- [x] `src/components/static/MenuSection.astro` — added `galleryMode?: boolean` prop, passes through to MenuCard
- [x] `src/components/static/BentoGrid.astro` — added `linkPrefix?: string` prop (default: ''); landing page passes `linkPrefix="/order"` so tiles deep-link to /order#category-id
- [x] `src/components/static/Navbar.astro` — added `.navbar__nav` with "Menu" → /menu and "Order Online" → /order (yellow CTA style); active state via `Astro.url.pathname`
- [x] `src/layouts/BaseLayout.astro` — added `<slot name="head" />` for page-specific head tags (JSON-LD, etc.)
- [x] `src/styles/global.css` — added: artisan matrix tokens (`--color-obsidian`, `--color-burnished-gold`, `--color-artisan-dark`, `--color-raw-copper`, `--font-size-display-xl`), `.navbar__nav` + nav link styles, `.landing-featured`, `.landing-story`, `.landing-cta-strip`, `.menu-gallery__*`, `.order-page__*` components
- [x] Build verified: `npm run build` exits clean, zero errors
- [x] `/` verified: hero + 4 featured cards + brand story + bento grid + CTA strip
- [x] `/menu` verified: dark editorial header, all categories, no price badges, no Add buttons; "Menu" nav link is gold (active)
- [x] `/order` verified: compact header, price badges visible, Add buttons active; "Order Online" nav link is yellow (active)
- [x] Zero console errors

**Notes:**
- Featured items on landing: first item from chicken-entree, meat-entree, beverage, appetizer categories. Owner can configure specific featured items later.
- BentoGrid tiles now link to `/order#category-id` (cross-page deep links)
- Chunks D–K islands all mount on `/order.astro` — placeholder comments in place
- AuthModal, OrderHistory, AdminPanel will mount in BaseLayout.astro (all pages)

---

### ✅ Chunk C.6 — Time-Based Hero Island
**Status: COMPLETE**

- [x] `src/components/islands/TimeBasedHero.tsx` — React island, `client:load`
- [x] `src/pages/index.astro` — replaced `<Hero />` with `<TimeBasedHero client:load />`
- [x] `src/styles/global.css` — added `transition: opacity 0.3s ease` to `.hero__content` + `.hero__content--fading` modifier
- [x] Verified at 1pm → "⚡ Express Lunch · Midtown Manhattan · 100% HALAL" / "The Mid-Day Matrix." renders correctly
- [x] Zero console errors

**Notes:**
- Framer Motion v12 + React 19 + Astro SSR causes "Invalid hook call" errors during hydration (known compatibility issue). Implemented CSS transition approach instead — `useEffect` fades content out (300ms), swaps window state, fades back in. Same visual result, no animation library required for this island.
- SSR renders "default" window; `useEffect` on mount detects client time and cross-fades to correct window
- `prefers-reduced-motion` respected — instant swap if set
- Unsplash photo IDs in `HERO_IMAGES` constant at top of file — easy to replace with owned photography (Chunk N)
- `Hero.astro` retained for reference — do not delete

---

### ✅ Chunk D — Search & Filter Island
**Status: COMPLETE**

- [x] `src/components/islands/SearchFilterBar.tsx` — React island, `client:idle`
  - Live search debounced 300ms, searches `data-name` + `data-keywords` on each `.menu-card`
  - Category select dropdown (all 16 categories from CATEGORIES constant)
  - Dietary toggle buttons: Vegan / Vegetarian / Gluten-Free (multi-select, `aria-pressed`)
  - Spice level dropdown (Mild / Medium / Hot)
  - Max price range slider (`step=50`, reads `data-price-cents`, displays via `formatPrice()`)
  - Reset button — appears only when filters are active; clears all state + search input ref
  - No-results message with "Clear filters" CTA when all cards are hidden
- [x] `src/components/static/MenuCard.astro` — added filter data attributes to `<article>`: `data-name`, `data-keywords`, `data-is-vegan`, `data-is-vegetarian`, `data-is-gluten-free`, `data-spice-level`, `data-price-cents`
- [x] `src/styles/global.css` — added `.menu-card--hidden { display: none }`, `.menu-section--hidden { display: none }`, `.toolbar__price` + price slider + `.filter-no-results` styles
- [x] `src/pages/order.astro` — imported `SearchFilterBar` and mounted `<SearchFilterBar client:idle menuItems={menuItems} />`
- [x] Build verified: `npm run build` exits clean, zero TS errors
- [x] Search "tikka" → correct results, 8 sections hidden, no fetch calls
- [x] Filter Vegan → 38 cards visible, all `data-is-vegan="true"` confirmed
- [x] Reset clears all filters, all 125 cards restored, Reset button disappears
- [x] Zero console errors

**Notes:**
- Filtering is pure DOM class-toggle on SSR-rendered `.menu-card` elements — no re-render of card HTML
- `menuItems` prop is used only to compute `maxItemPrice` for the price slider range; actual filtering reads `data-*` attributes from the DOM
- Section count badges (e.g. "11 items") are SSR-rendered and stay static — they reflect total items per category, not filtered count. Could be updated in Chunk K polish if desired.

---

### ✅ Chunk E — Cart Island
**Status: COMPLETE**

- [x] `src/components/islands/CartDrawer.tsx` — React island, `client:idle`
  - Manual nanostore subscriptions via `useNano()` helper (see Notes) — avoids `@nanostores/react`
  - Reads `cartItems`, `subtotalCents`, `taxCents`, `deliveryFeeCents`, `totalCents`, `cartOpen`
  - Cart item rows: name, slot/option sub-label, qty controls (−/+), remove, line price
  - Empty state with 🛒 icon and helper text
  - Footer: subtotal / tax (8.75%) / delivery fee / grand total rows
  - "Proceed to Checkout →" button (disabled when empty, sets `checkoutOpen` store on click)
  - Overlay (dark, click-outside to close)
- [x] `src/stores/cart.ts` — added `cartOpen` and `checkoutOpen` atoms
- [x] `src/layouts/BaseLayout.astro` — mounts `<CartDrawer client:idle />` (all pages, so badge works site-wide)
- [x] `astro.config.mjs` — added `vite.resolve.dedupe: ['react', 'react-dom', 'react-dom/server']` (required when 2+ React islands exist on the same page)
- [x] Add item → drawer slides open → qty controls work → totals recalculate correctly
- [x] Tax = round(1150 × 0.0875) = $1.01 ✅
- [x] Delivery fee shows $3.00; updates to Free when `setDeliveryType('pickup')` called
- [x] Cart count badge appears/disappears in Navbar reactively
- [x] Checkout button disabled when cart empty; enabled with items
- [x] Zero console errors

**Notes:**
- `@nanostores/react` `useStore` uses `useSyncExternalStore` which throws "Invalid hook call" with React 19 + Astro SSR when multiple React islands are on the same page. Fix: `useNano()` helper in CartDrawer uses `useState` + `useEffect` subscription instead — same pattern as TimeBasedHero avoiding Framer Motion (see Chunk C.6).
- Vite `dedupe` for React is required any time two React islands share a page. **Add this to any future project using Astro + React 19 + multiple islands.**
- CartDrawer placed in BaseLayout (not order.astro) so cart badge and drawer are accessible from `/`, `/menu`, and `/order`.
- `checkoutOpen` atom wired — CheckoutModal (Chunk F) reads it to open.

---

### ⬜ Chunk F — Checkout Modal Island
**Status: PENDING**

**Files to create:**
- `src/components/islands/CheckoutModal.tsx` — React island, `client:visible`
  - Order type radios: Delivery / Pickup (Pickup hides address, sets deliveryFee = 0)
  - Form fields: Name*, Phone*, Email*, Address (conditional), Apt (optional), Special Instructions
  - Inline validation (same rules as original `validators.js`: name ≥ 2 chars, phone regex, email regex)
  - Dynamic order summary panel (mirrors cart contents)
  - Submit: `POST /api/orders` with idempotency key (`crypto.randomUUID()` generated once per session)
  - On success: show confirmation screen (order ID, estimated wait, "Back to Menu" clears cart)
  - On error: inline global error message

**Backend payload shape:**
```json
{
  "deliveryType": "delivery"|"pickup",
  "deliveryAddress": "...",
  "specialInstructions": "...",
  "idempotencyKey": "uuid",
  "items": [{ "itemId": "...", "qty": 1, "selectedOptions": {}, "slotChoices": {} }]
}
```

**Done criteria:**
- Full flow: cart → checkout → confirmation
- Duplicate-submit protection confirmed (same idempotency key = 200 not 500)
- Delivery fee clears when Pickup selected
- Form validation blocks submit with empty/invalid fields

---

### ⬜ Chunk G — Auth Island
**Status: PENDING**

**Files to create:**
- `src/components/islands/AuthModal.tsx` — React island, `client:idle`
  - Two tabs: Login / Register
  - Register: Name*, Email*, Password*, Phone (optional)
  - Login: Email*, Password*
  - On success: `setAuth(token, user)` → nanostore → localStorage
  - On mount: if token in nanostore, call `GET /api/users/me` to verify/restore session
  - Error display inline per field or global

**Auth-driven UI (in Navbar.astro + islands):**
- Logged in → show "My Orders" button → opens OrderHistory drawer
- `role: 'admin'` → show "Admin" button → opens AdminPanel drawer
- Logged out → show "Sign In" button → opens AuthModal

**Done criteria:**
- Register → Login → JWT persists on hard refresh
- Logout clears nanostore + localStorage
- Admin user sees Admin button; customer does not

---

### ⬜ Chunk H — Order History Island
**Status: PENDING**

**Files to create:**
- `src/components/islands/OrderHistory.tsx` — React island, `client:idle`
  - Left-side drawer (slides in from left, Framer Motion)
  - `GET /api/orders/me` using token from authState nanostore
  - Order cards: ID (monospace), date, delivery type, item list, total, "Reorder" button
  - Reorder: calls `addToCart()` for each line item → shows reorder notice banner in cart
  - States: loading skeleton, empty ("No orders yet"), error

**Done criteria:**
- Authenticated user sees their past orders
- Reorder populates cart correctly (items + qty)
- Unauthenticated user cannot open drawer (button hidden)

---

### ⬜ Chunk I — Bundle Islands
**Status: PENDING**

**Files to create:**
- `src/components/islands/BundleModal.tsx` — React island, `client:visible`
  - Multi-step slot configurator
  - Fixed items listed (always included)
  - Slot sections: radio (choose 1) or checkbox (choose N) per slot
  - Slot validation: must choose exactly N before submit
  - Quantity stepper (1–10)
  - Live price preview updates as qty changes
  - "Add to Order" → `addToCart()` with slotChoices payload
- Dinner Specials + Joy Combos now **fully active** in index.astro (previously stubbed out in vanilla frontend)

**Menu data for bundles:**
- `dinner-special` category: 3 configurable combos
- `combo` category: 10 lunch platters (some slot-based, some fixed)

**Done criteria:**
- All 3 dinner specials configurable and addable to cart
- All 10 combo platters work
- Slot validation prevents submit with incomplete selection
- Price preview accurate in cents

---

### ⬜ Chunk J — Admin Panel Island
**Status: PENDING**

**Files to create:**
- `src/components/islands/AdminPanel.tsx` — React island, `client:idle`
  - Right-side drawer (slides in from right, Framer Motion)
  - Role gate: only mounts if `isAdmin` nanostore is true
  - `GET /api/admin/menu` — full item table (includes inactive)
  - Stock toggle: `PATCH /api/admin/menu/:id/stock` → optimistic update
  - Inline edit: `PUT /api/admin/menu/:id` (name, price, description)
  - Add new item: `POST /api/admin/menu` (form with all required fields + category select)
  - Soft-delete: `DELETE /api/admin/menu/:id` (shows confirmation before)
  - Inactive rows dimmed (`.admin-row--inactive` class)

**Done criteria:**
- Admin JWT → all CRUD operations verified against live DB
- Non-admin users see no Admin button (role gate)
- Stock toggle reflects immediately without full page reload

---

### ⬜ Chunk K — Polish, Micro-interactions, Deployment
**Status: PENDING**

**Scope:**
- Framer Motion: entrance animations on menu cards (stagger), toast notifications, checkout confirmation
- `prefers-reduced-motion`: all Framer Motion respects this
- Dark mode: CSS `@media (prefers-color-scheme: dark)` overrides (tokens already in global.css)
- WCAG audit: 4.5:1 contrast minimum, 44×44px touch targets
- Focus trap in all modals (`focus-trap-react` or manual)
- Update `vercel.json` at repo root to point at `astro-frontend` as root directory
- Update backend `CORS_ORIGIN` env var on Render.com to allow new Vercel URL
- Final Lighthouse run: Performance ≥ 95, Accessibility ≥ 97, Best Practices 100, SEO 100

---

## End-to-End Verification Checklist

Run this when all chunks are done before shipping:

- [ ] Browse menu → all 145 items render, categories visible
- [ ] Search "tikka" → correct results
- [ ] Filter Vegan → only vegan items show
- [ ] Add item to cart → count badge updates → drawer opens
- [ ] Qty controls work, remove works, totals update correctly
- [ ] Checkout as guest → place order → confirmation screen shows order ID
- [ ] Register account → login → JWT persists on refresh
- [ ] View order history → reorder → cart populated
- [ ] Configure Dinner Special → add to cart → checkout
- [ ] Login as admin → toggle stock → edit price → add new item → soft-delete
- [ ] Lighthouse: all four scores ≥ 95 / 97 / 100 / 100

---

## Image Strategy

`image_url` in `joy-curry.db` currently points to empty local paths.

**Plan:** `scripts/seed-images.js` (Chunk C) updates these to Unsplash CDN URLs, categorized by dish:
- Chicken entrées → tandoori/curry photos
- Vegetable entrées → vegetable curry / paneer photos
- Biryani → rice dish photos
- Tandoori → clay oven / skewer photos
- etc.

When owner commissions professional photography: update `image_url` column in DB. Zero code change required.

---

## Session Handoff Notes

- `node --version` in the astro-frontend directory will show v20 (system) — always use `bash start-astro.sh` or the `astro-dev` launch config to get Node 24
- The backend must be running on `localhost:3000` for local API calls during dev
- The vanilla `frontend/` folder is archived — do not modify it
- Currency rule: all computations in integer cents, format only at render via `formatPrice(cents)` in `src/lib/formatters.ts`
- All BEM class names for HTML components are already defined in `global.css` — reference that file before adding any new class
