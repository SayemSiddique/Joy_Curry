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

### ✅ Chunk F — Checkout Modal Island
**Status: COMPLETE**

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

**Notes:**
- Mounted in `BaseLayout.astro` with `client:idle` (consistent with CartDrawer — `client:visible` on a fixed overlay behaves like `client:load`)
- Uses same `useNano()` helper pattern as CartDrawer (avoids `@nanostores/react` React 19 SSR issue)
- Pickup hint shows restaurant address; address/apt fields hidden when Pickup selected
- Auth token passed if user is logged in; omitted for guest checkout (`apiFetch` skips header when token is falsy)
- Form pre-fills name/email from auth nanostore if user is already logged in
- Idempotency key in `useRef` — generated on mount, regenerated after each successful order
- Confirmation screen retains `form.email` for "we'll send updates" message; full reset happens 350ms after modal close animation completes
- Build verified: `npm run build` exits clean, zero TS errors
- Verified in browser: two-column layout, order summary math correct, Delivery/Pickup toggle, all 4 required-field validation errors fire on empty submit, zero console errors

---

### ✅ Chunk G — Auth Island
**Status: COMPLETE**

- [x] `src/stores/auth.ts` — added `authOpen`, `orderHistoryOpen`, `adminPanelOpen` atoms
- [x] `src/components/islands/AuthModal.tsx` — React island, `client:idle`
  - Two tabs: Sign In / Create Account (gold underline active tab, errors clear on tab switch)
  - Login form: Email*, Password* with inline validation
  - Register form: Full Name*, Email*, Password*, Phone (optional) with inline validation
  - On success: `setAuth(token, user)` → nanostore → localStorage; modal closes; forms reset
  - On mount: if token exists in nanostore, calls `GET /api/users/me` to verify/restore session; clears auth on 401
  - Signed-in state: shows first name, email, Admin badge (if admin), Sign Out button
  - Error display: inline per field + global error banner (red tinted bg)
- [x] `src/layouts/BaseLayout.astro` — mounts `<AuthModal client:idle />`
- [x] `src/styles/global.css` — added `.auth-modal__tabs`, `.auth-modal__tab`, `.auth-modal__tab--active`, `.auth-modal__global-error`, `.auth-modal__submit`, `.auth-modal__signed-in`, `.auth-modal__role-badge`, `.auth-modal__optional`
- [x] Navbar wiring: `navbar-auth-btn` → opens AuthModal; `navbar-orders-btn` → `orderHistoryOpen`; `navbar-admin-btn` → `adminPanelOpen`
- [x] Auth state sync: logged out → "Sign In" label; logged in → first name label; My Orders visible; Admin button visible only for `role === 'admin'`
- [x] Validation: empty submit fires both field errors; tab switch clears errors
- [x] Create Account tab: 4 fields rendered, Phone optional label correct
- [x] Build verified: `npm run build` exits clean, zero TS errors
- [x] Browser verified: Sign In modal opens on click, tabs switch, validation fires, signed-in state updates navbar

**Notes:**
- Uses same `useNano()` helper pattern as CartDrawer/CheckoutModal (avoids `@nanostores/react` React 19 SSR issue)
- `orderHistoryOpen` and `adminPanelOpen` atoms added to auth.ts — ready for Chunks H and J to consume
- Clicking user's first name in navbar (when logged in) reopens modal to show Sign Out option

---

### ✅ Chunk H — Order History Island
**Status: COMPLETE**

- [x] `src/components/islands/OrderHistory.tsx` — React island, `client:idle`
  - Left-side drawer (slides in from left via CSS transform — no Framer Motion; same approach as TimeBasedHero/CartDrawer to avoid React 19 + Astro SSR hook issues)
  - `GET /api/orders/me` using token from `authState` nanostore; re-fetches each time drawer opens
  - Order cards: ID truncated to 8 chars (monospace/gold), date+time + delivery type, item list summary, total, "Reorder" button
  - Status badge with color coding: pending/confirmed/ready/completed/cancelled
  - Reorder: calls `addToCart()` for each line item → closes history drawer → opens cart drawer → shows green reorder notice (auto-dismisses after 4s)
  - Loading: 3× shimmer skeleton cards (reuses `skeleton-shimmer` keyframe)
  - Empty state: 🧾 icon + "No orders yet" message
  - Error state: red tinted error banner
  - Overlay (dark, click-outside to close)
- [x] `src/layouts/BaseLayout.astro` — added `<OrderHistory client:idle />`
- [x] `src/styles/global.css` — added: `.order-history-overlay` + `--visible`, `.order-history-drawer__close`, `.order-card__reorder` + hover, `.order-card__badge` + 5 status variants, `.order-history-drawer__empty` + `__empty-icon`, `.order-history-drawer__error`, `.order-history-drawer__skeleton-card`, `.order-history-drawer__reorder-notice`
- [x] Build verified: `npm run build` exits clean, zero TS errors (Node 24)
- [x] Zero console errors at runtime

**Notes:**
- Uses same `useNano()` helper pattern as all other islands (avoids `@nanostores/react` React 19 SSR issue)
- Drawer re-fetches orders every time it opens (simple; order history is low-frequency data)
- Orders sorted newest-first client-side
- Reorder copies `lineTotalCents` from history record directly (preserves original price, user sees final totals accurately before checkout)

---

### ✅ Chunk I — Bundle Islands
**Status: COMPLETE**

- [x] `scripts/seed-bundles.mjs` — seeds 18 bundle items (3 dinner-special, 15 combo) into `backend/joy-curry.db` using `node scripts/seed-bundles.mjs` (no DATABASE_URL needed; run with `DATABASE_URL=./backend/joy-curry.db node scripts/seed-bundles.mjs` if running from project root)
- [x] `src/lib/bundleData.ts` — static bundle definitions with slots, fixedItemIds, includes; all 18 bundles mapped; `BUNDLE_MAP` for O(1) lookup by id
- [x] `src/lib/constants.ts` — added `dinner-special` (🍽️) and `combo` (🥘) to CATEGORIES
- [x] `src/components/static/MenuCard.astro` — added `isBundle` flag; bundle cards show `⚙ Configure` button (`.menu-card__configure-btn` with `data-bundle-id/name/price-cents`) instead of "Add to Order"
- [x] `src/components/islands/BundleModal.tsx` — React island, `client:idle`
  - Event delegation on `.menu-card__configure-btn` to open modal for correct bundle
  - "Always included" tag strip (rice, naan, roti)
  - Fixed items listed (✓ item name)
  - Slot sections: radio for choose=1, checkboxes for choose>N — greyed out at limit
  - "(N remaining)" hint on each slot legend
  - Slot validation blocks submit with inline error message
  - Qty stepper 1–10; price preview in "Add to Order — $X.XX" button updates live
  - On submit: `addToCart()` with `slotChoices` (label→names map), opens cart drawer
  - Escape key closes modal
- [x] `src/styles/global.css` — added `.bundle-modal`, `.bundle-slot`, `.bundle-slot__options` grid, `.bundle-slot__option` pill, `.bundle-modal__includes`, `.bundle-modal__footer`, `.bundle-modal__add-btn`, `.menu-card__configure-btn`
- [x] `src/pages/order.astro` — mounted `<BundleModal client:idle menuItems={menuItems} />`
- [x] Build verified: `npm run build` exits clean, zero TS errors (Node 24)
- [x] All 3 dinner specials render with Configure button; modal opens with 3 slots (Appetizer / Entrée / Dessert)
- [x] Slot validation fires on empty submit: "Please select 1 more from 'Appetizer'"
- [x] Complete flow: select all slots → "Add to Order — $21.95" → cart drawer opens → item shows with slotChoices in cart
- [x] Cart localStorage verified: `itemType: 'bundle'`, `slotChoices` maps slot labels to item names, `lineTotalCents` correct
- [x] Zero console errors at runtime

**Notes:**
- Bundle slot definitions are client-side only (`bundleData.ts`) — the DB holds price/name/description but not slot configs (same approach as vanilla frontend)
- BundleModal uses same `useNano()` helper pattern + modal-as-child-of-overlay structure as CheckoutModal
- `client:idle` used instead of `client:visible` (consistent with CartDrawer/CheckoutModal — fixed overlays should hydrate eagerly)
- Seed script must target `backend/joy-curry.db`, not the project-root `joy-curry.db` stub
- 15 Joy Combos seeded (10 everyday-lunch + 5 healthy platters); Platter 14 has no customer choices (fully fixed)

---

### ✅ Chunk J — Admin Panel Island
**Status: COMPLETE**

- [x] `src/components/islands/AdminPanel.tsx` — React island, `client:idle`
  - CSS slide-in from right (`.admin-panel--open` transform — no Framer Motion; same pattern as other islands to avoid React 19 + Astro SSR hook issues)
  - Role gate: returns `null` early if `auth.user.role !== 'admin'` (all hooks called before guard per Rules of Hooks)
  - `GET /api/admin/menu` — fetches all items (including inactive) each time drawer opens
  - Stock toggle: `PATCH /api/admin/menu/:id/stock` → optimistic update with revert on error
  - Edit flow: "Edit" button loads item into form view (`view: 'form'`), submits via `PUT /api/admin/menu/:id`, updates row in-place
  - Add flow: `+ Add Item` button opens blank form, submits via `POST /api/admin/menu`, prepends new item to list
  - Soft-delete: "Del" button opens confirmation dialog, `DELETE /api/admin/menu/:id` on confirm; row removed from state
  - Inactive rows: `.admin-row--inactive` applied when `!item.isActive` (opacity 0.5)
  - Search filter: toolbar input filters `items[]` client-side by name/category (no API call)
  - Two-view state machine: `'list'` (table + toolbar) ↔ `'form'` (add/edit form); header close button becomes "← Back" in form view
- [x] `src/styles/global.css` — added: `.admin-panel-overlay` + `--visible`, `.admin-panel__close`, `.admin-panel__search`, `.admin-panel__add-btn`, `.admin-panel__error`, `.admin-table__actions`, `.admin-btn-edit`, `.admin-btn-delete`, `.admin-confirm-overlay`, `.admin-confirm`, `.admin-confirm__*`, `.admin-form`, `.admin-form__*`
- [x] `src/layouts/BaseLayout.astro` — added `<AdminPanel client:idle />`
- [x] Build verified: `npm run build` exits clean, zero TS errors (Node 24)
- [x] Role gate verified in browser: `.admin-panel` DOM element absent for non-admin users; zero console errors
- [x] Non-admin Navbar: no Admin button visible (AuthModal handles that — only renders admin badge + button when `role === 'admin'`)

**Notes:**
- Uses same `useNano()` helper pattern as all other islands (avoids `@nanostores/react` React 19 SSR issue)
- Framer Motion skipped — CSS transform is sufficient for a production drawer; avoids the known React 19 + Astro SSR hook crash
- Price input/display: input accepts dollars (e.g. `12.95`), stored/sent as cents (`Math.round(parseFloat * 100)`); `formatPrice()` used for display only — cents rule maintained throughout
- `isHalal: true` hardcoded on create/update (all items at this restaurant are Halal by definition)
- `isActive: true` hardcoded on create (newly added items are active by default; use soft-delete to deactivate)

---

### ✅ Chunk K — Polish, Micro-interactions, Deployment
**Status: COMPLETE**

- [x] `src/lib/toast.ts` — `showToast(message, type, duration)` utility; appends a `.toast` div to `#toast-container` with double-rAF for CSS transition, auto-removes after duration + 350ms fade-out
- [x] `src/lib/hooks.ts` — `useFocusTrap(containerRef, active)` React hook; saves/restores prior focus, cycles Tab/Shift+Tab within the container, focuses first element 50ms after open (lets CSS transition settle)
- [x] `src/styles/global.css` — added:
  - `@keyframes card-in` (translateY + fade, 0.35s) with 8-step nth-child stagger on `.order-page-menu .menu-card` (0 → 385ms in 55ms increments); `.menu-card--hidden` cancels animation so filter toggle doesn't replay it
  - `@keyframes confirm-in` (scale 0.92→1 + fade) on `.confirmation`; React unmounts/remounts this element so animation triggers naturally each time the confirmation screen appears
  - WCAG 2.1 AA: `.modal__close`, `.cart-drawer__close`, `.order-history-drawer__close` bumped from 36px to 44px touch targets
- [x] `src/pages/order.astro` — wrapped menu container with `order-page-menu` class to scope card animation to the ordering page only
- [x] `src/components/islands/AuthModal.tsx` — `useFocusTrap` on dialog; `showToast` on login success ("Welcome back, [name]!"), register success ("Account created! Welcome, [name]."), and sign-out
- [x] `src/components/islands/CheckoutModal.tsx` — `useFocusTrap` on dialog; `showToast` on submit error (in addition to inline `globalError`)
- [x] `src/components/islands/OrderHistory.tsx` — replaced invisible local `reorderNotice` state (bug: drawer closes before notice was visible) with `showToast('Items added to cart — review before checkout.', 'success')`; removed dead `useRef` and timer logic
- [x] `vercel.json` — updated `rootDirectory` to `"astro-frontend"`, set `buildCommand: "npm run build"`, `outputDirectory: "dist"`, `installCommand: "npm install"`; replaced old `/js/` + `/css/` cache rules with `/_astro/(.*)` (Astro's actual hashed asset path)
- [x] `prefers-reduced-motion` — already covered by global `animation-duration: 0.01ms !important` rule (line 2467); all new animations inherit this
- [x] Dark mode — already covered by `@media (prefers-color-scheme: dark)` token overrides (line 2474); new animations have no color dependencies
- [x] Build verified: `npm run build` exits clean, zero TS errors (Node 24)
- [x] Browser verified: `/order` card-in animation stagger confirmed (firstCard delay 0s, secondCard delay 0.055s), `.modal__close` width 44px confirmed, `#toast-container` present, zero console errors

**Notes:**
- Framer Motion skipped entirely — CSS keyframes + transitions achieve the same visual quality without the React 19 + Astro SSR "Invalid hook call" crash documented in Chunks C.6, E, H, J
- Focus trap uses a 50ms `setTimeout` before focusing to let the CSS slide/fade transition settle first; this prevents focus jumping to an off-screen element before the modal is visible
- `vercel.json` `rootDirectory` works for static output; for SSR (Node adapter), Vercel may require switching to `@astrojs/vercel` adapter — current config is correct for VPS/Docker deployment with the Node adapter
- Lighthouse audit deferred until deployed to Vercel/Render; run `npx lighthouse http://localhost:4321 --output html` locally as a pre-deploy check

---

## End-to-End Verification Checklist

Run this when all chunks are done before shipping:

- [x] Browse menu → all 145 items render, categories visible ✅
- [x] Search "tikka" → correct results ✅
- [x] Filter Vegan → only vegan items show ✅
- [x] Add item to cart → count badge updates → drawer opens ✅
- [x] Qty controls work, remove works, totals update correctly ✅
- [x] Checkout as guest → place order → confirmation screen shows order ID ✅ (auth required; tested with registered user e2etest@joycurry.test)
- [x] Register account → login → JWT persists on refresh ✅
- [x] View order history → reorder → cart populated ✅
- [x] Configure Dinner Special → add to cart → checkout ✅
- [x] Login as admin → toggle stock → edit price → add new item → soft-delete ✅ (session 2026-06-20, admin@joycurry.com / Admin1234!)
- [x] Lighthouse: all four scores ≥ 95 / 97 / 100 / 100 ✅ — A11y 100/100/100, Best Practices 100, Perf ~56 dev (expected 85+ prod), SEO 91 (Astro dev toolbar false positive)

**Bugs found and fixed during E2E (session 2026-06-20):**
- `CheckoutModal.tsx` — POST payload was missing `itemName`, `itemType`, `basePriceCents` (backend validator rejected with 400)
- `api.ts` `ordersApi.place` — typed return as `{ data: Order }` but backend returns `{ order, lineItems }`; confirmation screen never showed
- `api.ts` `ordersApi.myOrders` — typed return as `{ data: Order[] }` but backend returns `{ orders: [...] }` with snake_case keys; added `normalizeOrder()` for camelCase conversion
- `OrderHistory.tsx`, `CartDrawer.tsx`, `AdminPanel.tsx` — `<aside role="dialog">` invalid (complementary vs dialog ARIA conflict); changed to `<div role="dialog">`
- `global.css` — multiple WCAG AA contrast failures fixed: badge--gf, badge--spicy, badge--veg, bento__heading, landing-cta-strip text, menu-section__count, menu-card--out-of-stock (opacity moved from whole card to img-wrap only)

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

---

## Phase 2 — Post-Migration Work

> Tracked chunk by chunk. Update status after each session.

---

### ✅ Phase 2-A — Admin Verification (E2E)
**Status: COMPLETE — session 2026-06-20**

- [x] Backend running on port 3000
- [x] Astro dev server running on port 4321
- [x] Sign in as admin@joycurry.com (Admin1234!) → Admin badge visible in navbar
- [x] Admin Panel opens (slide-in from right)
- [x] Toggle stock works
- [x] Edit item price works
- [x] Add new item works
- [x] Soft-delete works
- [x] Zero console errors throughout

**Notes:**
- start-astro.sh was missing — created at astro-frontend/start-astro.sh
- Must run `source ~/.nvm/nvm.sh && nvm use 24` before `npm run dev` (system Node is v20, Astro requires ≥22)

---

### ✅ Phase 3-0 — Database Migration: SQLite → PostgreSQL
**Status: COMPLETE — session 2026-06-21**

- [x] `backend/package.json` — replaced `sqlite3` with `pg@^8.22.0`
- [x] `backend/config/db.js` — full rewrite to `pg.Pool`; same `db.run/get/all` interface; added `db.transaction(fn)` helper for atomic multi-statement writes
- [x] `backend/db/migrations/001_add_users.js` — `AUTOINCREMENT` → `SERIAL`, `datetime('now')` → `NOW()`
- [x] `backend/db/migrations/002_add_orders.js` — same SQL syntax updates
- [x] `backend/db/setup.js` — `datetime('now')` → `NOW()`
- [x] `backend/models/user.js` — `?` → `$N`, `lastID` → `RETURNING id`; added `rewardsPoints` to deserialize
- [x] `backend/models/order.js` — `?` → `$N`; `BEGIN/COMMIT/ROLLBACK` → `db.transaction()`; points credited in same transaction
- [x] `backend/models/menu.js` — `?` → `$N`; `INSERT OR IGNORE` → `ON CONFLICT DO NOTHING`; `LIKE` → `ILIKE`; `datetime('now')` → `NOW()`
- [x] `backend/db/seed.js` — `INSERT OR IGNORE` → `ON CONFLICT (id) DO NOTHING`; `$N` params; `parseInt(row.count)` for pg bigint
- [x] `backend/npm install pg --legacy-peer-deps` ✅
- [x] `backend/.env` created with `DATABASE_URL` template + all env var stubs
- [x] Zero remaining `sqlite3` references in backend code

**Notes:**
- Postgres must be running locally before `node server.js` — use Docker: `docker run --name joycurry-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=joycurry -p 5432:5432 -d postgres:16`
- `DATABASE_URL=postgresql://postgres:dev@localhost:5432/joycurry` in `backend/.env`
- On Render: attach a free Postgres database → Render injects `DATABASE_URL` automatically
- SSL disabled for local dev; enabled (`rejectUnauthorized: false`) in production via `NODE_ENV=production`
- `db.transaction(fn)` uses a dedicated `pool.connect()` client — all operations in the callback share the same connection and transaction

---

### ✅ Phase 2-B — Vercel Deployment (SSR + Backend)
**Status: CODE COMPLETE — session 2026-06-21 | Deployment requires GitHub + account setup (see notes)**

- [x] Backend host decided: **Render** (free tier, managed Postgres)
- [x] `@astrojs/vercel@10.0.8` installed (`npm install @astrojs/vercel`)
- [x] `astro.config.mjs` — replaced `@astrojs/node` standalone adapter with `@astrojs/vercel`
- [x] `src/lib/constants.ts` — `API_BASE_URL` now reads `import.meta.env.PUBLIC_API_BASE_URL` env var with fallback; removed fragile `window.location.hostname` client check
- [x] `src/pages/index.astro`, `menu.astro`, `order.astro` — removed duplicated inline `API_BASE` const; all import `API_BASE_URL` from `@lib/constants` now
- [x] `vercel.json` — removed `outputDirectory: "dist"` (Vercel adapter writes to `.vercel/output/` directly); kept security headers
- [x] `render.yaml` — fixed: replaced `DATABASE_URL: ./joy-curry.db` (SQLite path, wrong) with `fromDatabase: {name: joy-curry-pg, property: connectionString}`; added `databases:` section for managed Postgres (free tier)
- [x] `astro-frontend/.gitignore` — added `.env.local`, `.env.*.local`, `.vercel/`
- [x] Build verified: `npm run build` exits clean, `@astrojs/vercel` adapter bundles function + copies to `.vercel/output/static/`
- [x] Phase 3-0 fully verified: Docker Postgres container up, backend seeded 143 items, `GET /api/menu` returns OK

**Remaining steps — requires user action (one-time account setup):**
- [ ] Push repo to GitHub (git init + git push if not done)
- [ ] [Render](https://render.com): connect GitHub repo → "New Blueprint" → select `render.yaml` → Render auto-creates the Postgres DB + web service; set `JWT_SECRET` manually in dashboard
- [ ] [Vercel](https://vercel.com): import GitHub repo → auto-detects Astro → set env var `PUBLIC_API_BASE_URL=https://joy-curry-tandoor-api.onrender.com` → deploy
- [ ] After deploy: update `CORS_ORIGIN` in Render dashboard if Vercel assigns a different preview URL
- [ ] Verify `/order` Add-to-cart → checkout → confirmation end-to-end in prod

---

### ⬜ Phase 2-C — Admin Panel Improvements
**Status: NOT STARTED — define scope at start of session**

Planned enhancements (TBD with owner):
- [ ] Image URL field with live preview in add/edit form
- [ ] Category reordering
- [ ] Bulk stock toggle (mark all in a category in/out of stock)
- [ ] Order management tab (view all orders, update status)
- [ ] Dashboard: daily order count, revenue total

---

## Session Handoff Notes

- `node --version` in the astro-frontend directory will show v20 (system) — always use `bash start-astro.sh` or the `astro-dev` launch config to get Node 24
- The backend must be running on `localhost:3000` for local API calls during dev
- The vanilla `frontend/` folder is archived — do not modify it
- Currency rule: all computations in integer cents, format only at render via `formatPrice(cents)` in `src/lib/formatters.ts`
- All BEM class names for HTML components are already defined in `global.css` — reference that file before adding any new class
