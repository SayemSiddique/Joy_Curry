# Base UI Integration — Migration Tracker

**Purpose:** Adopt [Base UI](https://base-ui.com) (`@base-ui/react@1.6.0`) as the single
headless component library for `apps/web`, supplying **behavior + accessibility only**.
All styling stays in the existing token system (`--color-*` / `--space-*` / `--radius-*`
in `global.css`, mirrored to `@joy-curry/tokens`). **No visual change** to the live brand —
success = "looks identical, but now traps focus / handles keyboard / passes a screen reader."

**Decisions locked (2026-07-23):**
- Library: **Base UI only** (no Radix, no React Aria unless a real wall is hit on checkout/auth).
- Palette: **no change** — keep the live warm maroon/cream brand exactly as-is. New palette shelved.
- Pattern: **strangler** — migrate one island at a time, in place, verified in browser before moving on.
- Seam: islands import from `@joy-curry/ui` (never `@base-ui/react` directly), so a future
  library swap touches only `packages/ui`.

**Workflow rules (updated 2026-07-23 — owner directive):**
1. **Debt deletion is a required step in every phase.** Once an island is migrated to Base UI and
   verified, **delete the old design/behavior code it replaced** — dead effects, superseded
   components, orphaned pages, now-unused CSS classes. Don't leave stale code behind. Each phase =
   *migrate → verify → delete the debt it made dead.*
2. **Cleanup goes FIRST in each new session.** Before any new phase's migration work, do a
   dead-code sweep for whatever the previous phase left dead (see the running
   "Pending debt-deletion" list below). No new-feature code is touched during this sweep.
3. **Commit discipline — Claude stages, owner pushes.** Claude **stages commits stage-by-stage**
   (one logical stage per commit) and writes a proper commit message for each stage. Claude
   **never commits and never pushes** — it only stages and hands the owner the message. The
   **owner reviews and pushes to GitHub**, stage by stage, not all at once.
4. **Push before the next phase.** A phase's work must be pushed (by the owner) before the next
   phase begins. New-session order is therefore: (a) dead-code cleanup → (b) Claude stages
   commits + messages → (c) **owner pushes** → (d) then start the phase's migration.
5. **End every session with a handoff prompt.** The last thing Claude does each session is emit a
   copy-paste "next session" prompt that lets a fresh Claude Code session resume from the next
   phase with full context (what's done, what's staged, what to delete, what to build). See
   [[feedback-session-handoffs]].

**How to resume in a new session:** read this file top-to-bottom. Each phase below has a
status. Start at the first `⬜ TODO`. The `@joy-curry/ui` package is the foundation; its
README documents the "add a component" convention.

---

## Status legend
✅ DONE · 🔄 IN PROGRESS · ⬜ TODO

---

## Phase 0 — Foundation: `packages/ui` seam ✅ DONE
- [x] Create `packages/ui` workspace package (`@joy-curry/ui`), exports `./src/index.ts` (raw TS, like `@joy-curry/tokens`/`core`).
- [x] `cx` classname util (`src/utils/cx.ts`) + `styled()` part factory (`src/utils/styled.tsx`) — the ONE place the "Base UI behavior + token CSS" contract lives.
- [x] `Dialog` wrapper (`src/Dialog/Dialog.tsx` + `Dialog.css`, promoted from proven `BaseUISpike.css`). Reduced-motion guard included.
- [x] Ambient `src/css.d.ts` for side-effect CSS imports; `@types/react(-dom)` devDeps for standalone typecheck.
- [x] Wire into `apps/web`: dep `@joy-curry/ui: workspace:*` + `ssr.noExternal` in `astro.config.mjs`. (No `@ui` alias needed — consumed as a real package like `@joy-curry/core`, imported via bare specifier.)
- [x] `packages/ui/README.md` — the "how to add a component" convention.
- [x] **Verified in browser:** `pnpm install` links workspace; `tsc` clean; `/spike` (now importing from `@joy-curry/ui`) renders identical; dialog opens with `role="dialog"` + heading/description ARIA, transitions via package CSS, **ESC closes** (Base UI behavior through the wrapper).

**Deferred out of Phase 0 (with reason):** `Drawer` wrapper — Base UI `Drawer.Popup` requires a `swipeDirection` prop and manages its own swipe transforms; styling it blind risks fighting that transform. Built in **Phase 2** against the real `CartDrawer`, verified in-browser.

## Phase 1 — Proof island: `DishDetailModal` ✅ DONE
- [x] Migrate `DishDetailModal.tsx` to `@joy-curry/ui` `Dialog` (was importing `@base-ui/react/dialog` directly → now the seam).
- [x] Added `unstyled` escape hatch to `styled()` factory: bespoke-layout islands keep their own full CSS + behavior + the single import seam, without the brand card chrome. Applied `unstyled` to Backdrop/Popup/Title/Description here.
- [x] **Verified in browser** (mock `dish:open` event, since the API backend wasn't running): renders pixel-identical two-column layout; `role="dialog"` + `aria-labelledby`→title wired by Base UI; modifier click updated total $18.95→$22.45 (React state intact); **ESC closes** via `onOpenChange`; zero console/SSR errors.

**Note for future sessions:** to see the live menu you must run the API — `cd apps/api && node server.js` (needs `.env` DATABASE_URL). Without it, `/order` shows "Menu unavailable — fetch failed". Island modals can still be exercised by dispatching their window events (`dish:open`, etc.) via the browser console.

**Key design decision established here:** wrapper parts carry brand default classes, but pass `unstyled` to opt a bespoke island out of them. Standard/new dialogs omit `unstyled` and get the brand card for free (see spike).

## Phase 2 — Revenue path ✅ DONE
- [x] **`BundleModal` → `Dialog`** ✅ Migrated hand-rolled modal (manual ESC + Tab focus-trap + focus-on-open, ~45 lines) to Base UI `Dialog`. **Verified in browser** with a real code-defined bundle (`bundle:edit` event, `combo-platter-2`): renders pixel-identical centered modal, `role="dialog"` + `aria-labelledby`, backdrop + centered positioner, smart-default slot selections intact, **ESC closes**, no compile errors (babel parse + no Vite overlay).
- [x] **`CheckoutModal` → `Dialog`** ✅ Shell migrated via the always-mounted `.modal` pattern: outer `.modal-overlay`/inner `role="dialog"` divs + `useFocusTrap` hook replaced by `Dialog.Root/Portal/Backdrop(.modal-overlay--bui)/positioner/Popup(.modal--wide checkout-modal--bui)`; the three per-screen `<h2 class="modal__title">` → `Dialog.Title` (so `aria-labelledby` follows the active screen); form + payment `.modal__close` → `Dialog.Close`; confirmed-screen close stays a plain button (`handleBackToMenu` reset). Added `.checkout-modal--bui` fade/slide CSS (the old modal faded via its overlay wrapper; Base UI splits backdrop/popup so the popup fades itself). **All Stripe payment logic untouched.** **Verified in browser** (temp-mounted on `/spike`, then reverted): `role="dialog"`, `aria-labelledby`→`Dialog.Title` ("Checkout"), no `unstyled` attr leak on popup/close, backdrop present, settled transform, step indicator intact, no SSR/compile errors.
  - **⚠️ PLAN DRIFT — CheckoutModal is dead code.** It is commented out in `order.astro` (since the monorepo restructure `060f932`) and superseded by **`CartPage.tsx`** — a full-**page** checkout at `/cart` (built in the "checkout modal redesign" commit `96fb811`) that owns the live Stripe flow now. `CartDrawer` still imports `checkoutOpen` but the cart's checkout button routes to `/cart`, not this modal. So this migration future-proofs the file if revived, but **does not touch the live checkout**. The live checkout (`CartPage`) is a page, so `Dialog` doesn't apply to it — its `Field`/`Form` a11y belongs in **Phase 4** scope, not here. Recommend the owner decide: (a) leave `CheckoutModal` as migrated-but-dormant, or (b) delete it as dead code, and (c) re-map the plan for `CartPage`.
- [x] **`CartDrawer` → `Dialog` as a right-side sheet** ✅ Migrated the always-mounted class-toggle drawer (manual body-scroll-lock + ESC effect removed) to Base UI `Dialog`. Added scoped `.cart-overlay--bui` + `.cart-drawer[data-starting-style]/[data-ending-style]` slide CSS (translateX desktop, translateY mobile bottom-sheet). **Verified in browser**: slides in from right, `role="dialog"` + `aria-labelledby` (via `Dialog.Title`), backdrop present, transform identity when open, **ESC closes with slide-out**, identical look. (`aria-modal` is now absent because Base UI uses `inert` on the background instead — the modern approach, not a regression.)

**🐛 Fixed during Phase 2 — `unstyled` prop leak:** `Dialog.Close`/`Dialog.Trigger` were plain pass-throughs (`Base.Close`), so passing `unstyled` to them leaked the attribute to the DOM (React warning "Received `true` for non-boolean attribute `unstyled`"). Fixed in `Dialog.tsx` by routing Trigger/Close through `styled(Base.X, '')` — empty default class, but they now strip the control props uniformly. Verified: DOM close button has no `unstyled` attr, clean class.

**⚠️ Tooling note:** the browser MCP `read_console_messages` returns a *persistent session-wide buffer* that ignores `console.clear()` and soft reloads — stale `[vite] Failed to reload …` (mid-edit saves) and pre-fix warnings keep replaying. Trust DOM inspection + babel-parse + absence of the Vite red overlay over that buffer.

**Established pattern for the always-mounted `.modal` family (reuse for CheckoutModal):**
1. Add scoped CSS (already in `global.css`, search `Base UI-managed modal shell`): `.modal-overlay--bui` (opacity 1 + `[data-starting-style]/[data-ending-style]` fade), `.modal-bui-positioner` (fixed, flex-center, `pointer-events:none`, `> .modal { pointer-events:auto }`), and per-modal `[data-starting-style]/[data-ending-style]` transform endpoints.
2. JSX: `<Dialog.Root open={open} onOpenChange={(o)=>{ if(!o) handleClose(); }}>` → `<Dialog.Portal>` → `<Dialog.Backdrop unstyled className="modal-overlay modal-overlay--bui" />` → `<div className="modal-bui-positioner">` → `<Dialog.Popup unstyled className="modal … <name>--open">`. Title→`Dialog.Title unstyled`, close→`Dialog.Close unstyled`.
3. Delete the manual ESC / Tab focus-trap / focus-on-open effects; keep any ref used for non-focus purposes (e.g. scroll-to-error). Keep app-specific close side-effects in `handleClose`.
4. Babel-parse the file, reload, confirm no Vite overlay, then open it in-browser and check role/label/ESC.

**✅ CheckoutModal resolved (see Phase 2 entry above):** shell migrated mechanically, payment logic untouched, browser-verified on `/spike`. During verification it turned out the modal is **no longer wired into the app** — the live checkout is now the full-page `CartPage.tsx` at `/cart`. So the end-to-end Stripe QA the original risk note called for is moot for this file; it applies to `CartPage` instead. Left the migration in place (harmless, revival-ready) and flagged the drift for the owner.

## Phase 3 — Menu browsing & filtering ✅ DONE
- [x] **Wrappers added (Phase-0 style):** `Select` (`select`), `ToggleGroup`/`Toggle`
  (`toggle-group`/`toggle`), `NavigationMenu` (`navigation-menu`) — each a `styled()` part
  factory + brand-token CSS + reduced-motion guard + side-effect CSS import, exported from
  `src/index.ts`. No `Tabs`/`Collapsible` wrappers were needed (see the two dropped targets).
- [x] **`SearchFilterBar` → `Select` + `ToggleGroup`** ✅ Category + spice dropdowns → `Select`
  (Base UI listbox roles, typeahead, keyboard nav, focus return; brand `.toolbar__select`
  trigger + `.jc-select__*` popup). Dietary filters → `ToggleGroup`/`Toggle` passed `unstyled`
  so the toolbar keeps `.toolbar__filter-btn`; the group is `display:contents` so toggles stay
  direct flex children of `.toolbar__inner` while gaining roving-tabindex + arrow-key nav +
  `aria-pressed`. **Verified in browser**: 2 Selects open as `role=listbox` (19 options,
  `role=option`, `aria-expanded` toggles), dietary group `role=group` with 3 toggles,
  DOM-filtering still applies, zero console errors.
- [x] ~~`CategoryRail` → `Tabs`/`ToggleGroup`~~ **DROPPED — island deleted.** The modal→page
  redesign already retired the sticky category rail (its mount + island + the entire
  `.category-nav*` CSS block are gone from `order.astro`/`global.css`). Nothing to migrate;
  not resurrected. Grep-confirmed zero `CategoryRail` references remain in `apps/web`.
- [x] **`NavBar` → `NavigationMenu` (desktop dropdown) + `Dialog` (mobile drawer)** ✅
  - Desktop **MENU dropdown** → `NavigationMenu` (owner chose to accept hover+focus+click open
    over the old click-only). Base UI supplies the trigger ARIA, open intent, ESC +
    outside-pointer dismiss, focus management, and the anchored portaled panel; parts pass
    `unstyled` so the panel keeps `.navbar__menu-*`. The panel moved from an absolute-positioned
    in-navbar card to the portaled Positioner→Popup→Viewport: position→`.navbar__menu-positioner`,
    card chrome + fade→`.navbar__menu-panel` (popup), width+padding→`.navbar__menu-panel-content`
    (Base UI measures it to size the popup). Chevron rotation now rides `.jc-navmenu__icon[data-popup-open]`.
    Removed the manual `menuOpen` state + outside-click/ESC effect, the `.navbar__menu-trigger--open`
    class + its svg rule, and `@keyframes navMenuIn`. **Verified**: opens on click, panel flush under
    trigger (top −1px, left-aligned), 560px content, 18 category anchors, icon rotates 180° via
    `data-popup-open`, **ESC closes** (panel unmounts).
  - Mobile **nav-drawer** → `Dialog` as a left side-sheet (plan said "Collapsible", but the drawer
    is a *modal* — overlay + focus trap — so `Dialog` is the correct primitive; owner confirmed).
    Mirrors the `CartDrawer` migration: `Dialog.Backdrop`(`.nav-drawer-overlay--bui`) +
    `Dialog.Popup`(`.nav-drawer`) with a `sr-only` `Dialog.Title` "Menu" for the accessible name and
    `Dialog.Close` for the X. Added the `--bui` fade + `[data-starting-style]/[data-ending-style]`
    translateX(-100%) slide; deleted the now-dead `.nav-drawer-overlay--visible` class. **Removed
    `useFocusTrap(drawerRef,…)` + the manual drawer ESC effect + `drawerRef`/`useRef` import** — Base
    UI now owns focus trap/return, ESC, backdrop-press close, scroll-lock, inert background.
    **Verified**: `role=dialog`, `aria-labelledby`→sr-only title, width 319 (=85vw), settled slide-in,
    **focus trapped inside**, real order-button opens it, **ESC + backdrop both close and sync the
    `mobileNavDrawerOpen` store**, no `unstyled` DOM leaks, zero console errors.
  - **`useFocusTrap` KEPT** — `OrderGate.tsx` is still a live caller (grep-confirmed). NavBar no
    longer references it. Delete the hook only once OrderGate migrates (Phase 4/later).

## Phase 4 — Auth & account ⬜ TODO
- [ ] `AuthFlow` (sign in/up, OTP) → `Field` + `Form` (+ `otp-field`).
- [ ] `AccountPage`, `OrdersPage` → `Tabs` / `Menu`.

## Phase 5 — Feedback & status ⬜ TODO
- [ ] `StockNotifier` / order confirmations → `Toast`.
- [ ] Dietary badges / upsell hints → `Tooltip`.
- [ ] `OrderTracker` → `Progress`.
- [ ] `MealConcierge` → `Combobox` / `Accordion`.

## Phase 6 — Close out ⬜ TODO
- [ ] Delete spike trio: `spike.astro`, `BaseUISpike.tsx`, `BaseUISpike.css`.
- [ ] Accessibility sweep (keyboard-only + screen reader) across migrated flows.
- [ ] Finalize `packages/ui/README.md`.

---

## Pending debt-deletion — ✅ SWEPT 2026-07-23 (Phase-3 session, step 1)
Per workflow rule 1+2: swept the code the Phase 0–2 migrations left dead. Each item grep-verified
across `apps/web` before deleting.
- [x] **`CheckoutModal.tsx`** — DELETED (dead, superseded by full-page `CartPage.tsx` at `/cart`).
      Also removed its commented mount + "Chunk F" comment in `order.astro`, the unused `checkoutOpen`
      import in `CartDrawer.tsx` (grep-confirmed imported-but-never-used), and the orphaned
      `checkout-modal--bui` CSS. Deleted CheckoutModal-only CSS **verified unused by CartPage**:
      `.checkout-steps*`, `.vault-section*`, `.promo-section*`. **KEPT** (CartPage reuses them):
      `.payment-recap*`, `.confirmation__*`, `.referral-card*`, `.order-summary__*`,
      `.checkout-pickup-card*`. **KEPT** `.vault-milestone*` — used by `RewardsPanel.tsx` (distinct
      from the deleted `.vault-milestone__pill*` variants, which were CheckoutModal-only). Updated the
      now-stale `CheckoutModal` comments in `OrderTracker.tsx` (event now fired by CartPage) and
      `stripe.ts` (singleton now used by CartPage).
- [x] **`useFocusTrap`** hook in `@lib/hooks` — **KEPT**. Grep shows **2 live callers** remain:
      `NavBar.tsx` (mobile drawer) and `OrderGate.tsx`. Not a Base-UI-migrated island yet, so the
      hook is still needed. Revisit when NavBar/OrderGate migrate (Phase 3 / later).
- [x] **Orphaned always-mounted modal CSS** — audited. `.modal-overlay--visible` **KEPT** (still used
      by `OrderGate.tsx`). `.bundle-modal--open` **KEPT** (the migrated BundleModal's settled-state
      class). Only `.checkout-modal--bui` was orphaned → deleted.
- [x] Spike trio (`spike.astro`, `BaseUISpike.tsx`, `BaseUISpike.css`) — **KEPT** as the scratch
      verification page (used every phase to exercise islands without the API). Fold into Phase 6.

**Out-of-scope debt flagged (NOT deleted):** `checkoutOpen` atom in
`packages/core/src/stores/cart.ts:152` now has **zero consumers in `apps/web`**. Left in place — it
lives in the shared `@joy-curry/core` package (mobile may reference it), and this migration is
`apps/web`-scoped. Owner to decide whether to prune it from core.

---

## Component → Base UI primitive map
| Island | Base UI primitive(s) |
|---|---|
| DishDetailModal, CheckoutModal (dormant), BundleModal | `dialog` |
| CartPage (live checkout, `/cart`) | full page — `field`/`form` (Phase 4), NOT `dialog` |
| CartDrawer | `drawer` (side dialog) |
| AuthFlow | `field`, `form`, `otp-field` |
| SearchFilterBar ✅ | `select`, `toggle-group` |
| ~~CategoryRail~~ | **DROPPED — island deleted in the modal→page redesign** |
| NavBar ✅ | `navigation-menu` (desktop dropdown) + `dialog` (mobile drawer, not `collapsible` — it's modal) |
| StockNotifier, confirmations | `toast` |
| dietary badges, upsells | `tooltip` |
| OrderTracker | `progress` |
| MealConcierge | `combobox`, `accordion` |

## Mobile (RN) note
Base UI is **web-only** — it does NOT go into `apps/mobile`. Cross-platform parity comes
from `@joy-curry/tokens` (already architected). Web `<Dialog>` ↔ RN modal share token values.

---

## Session log
- 2026-07-23: Plan authored, decisions locked, Base UI 1.6.0 confirmed installed. Starting Phase 0.
- 2026-07-23 (same session, autonomous run): **Completed Phase 0** (`packages/ui` seam: `cx`, `styled()` factory with `unstyled` hatch, `Dialog` wrapper + CSS, wired into web, README), **Phase 1** (`DishDetailModal`), and **Phase 2 partial** (`BundleModal` + `CartDrawer`). All browser-verified. Fixed the `unstyled`-leak bug.
- 2026-07-23 (continuation run): **Completed Phase 2** — migrated `CheckoutModal` shell to `Dialog` (payment logic untouched), added `.checkout-modal--bui` CSS, browser-verified on a temp `/spike` mount (reverted after). **Discovered `CheckoutModal` is dead code** — superseded by the full-page `CartPage.tsx` (`/cart`), which is the live Stripe checkout now. Updated the primitive map + Phase 2 notes accordingly. Nothing committed — all staged for owner review. App compiles and dev SSR renders all pages.
- 2026-07-23 (Phase-3 session, step 1 — cleanup): Ran the **debt-deletion sweep** (see the ✅ SWEPT section above). Deleted `CheckoutModal.tsx` + its mount + orphaned CSS (`checkout-modal--bui`, `checkout-steps`, `vault-section`, `promo-section`); kept everything CartPage/RewardsPanel/OrderGate still reference (grep-verified). Kept `useFocusTrap` (2 live callers). Flagged the orphaned `checkoutOpen` core atom for the owner. **Browser-verified** `/order` + `/cart` render with zero console/SSR errors after the sweep. Staged in 3 stages (A: `packages/ui` seam + wiring; B: modal migrations + shell CSS; C: dead-code removal) — nothing committed/pushed; handed the owner a message per stage. Phase 3 migration NOT started yet (awaiting owner push).
- 2026-07-23 (Phase-3 migration): **Completed Phase 3.** Re-verified targets first: `SearchFilterBar` live on `/order` (already migrated to `Select`+`ToggleGroup`); `CategoryRail` **gone** — dropped from scope (island + mount + `.category-nav*` CSS all deleted in the earlier redesign); `NavBar` live. Added the `Select`/`ToggleGroup`/`NavigationMenu` wrappers. Migrated **`NavBar`**: desktop MENU dropdown → `NavigationMenu` (owner accepted hover+focus+click open; panel restructured into the portaled Positioner→Popup→Viewport, brand CSS preserved), mobile drawer → `Dialog` left side-sheet (owner picked `Dialog` over the plan's "Collapsible" since the drawer is modal). Removed NavBar's `useFocusTrap` call + manual outside-click/ESC/keydown effects + `.navbar__menu-trigger--open`/`navMenuIn`/`.nav-drawer-overlay--visible` dead CSS. `useFocusTrap` **kept** (OrderGate still calls it). **Browser-verified** both islands across desktop + mobile: correct roles/ARIA, pixel-identical look (screenshots), ESC + backdrop dismiss, focus trap, store sync, no `unstyled` leaks, zero console/dev-server errors. Static typecheck note: no standalone `tsc` in the workspace and `astro check` needs an interactive install — relied on the dev-server transform (islands executed live) per the established Phase-2 convention. Staged in 3 stages (A: wrappers; B: NavBar migration + `global.css`; C: SearchFilterBar migration + CategoryRail deletion + `order.astro` + `.category-nav` CSS removal) — nothing committed/pushed.

## Next session — start here (STRICT ORDER) → Phase 4: Auth & account
**Phase 3 is done. Phases 0–3 are uncommitted (staged, awaiting owner push).** Follow the workflow rules above:

0. Read this whole file top-to-bottom.
1. **Cleanup FIRST — no new-feature code.** Phase 3 deleted its own debt inline (dead nav CSS + `CategoryRail`), so there is no Phase-3 leftover to sweep. Just re-grep the "Out-of-scope debt flagged" items below and confirm nothing new dangles before Phase 4 migration.
2. **Owner pushes the Phase-3 stages to GitHub** (A → B → C) if not already done. Wait for confirmation before starting Phase 4.
3. **Then Phase 4 — Auth & account:**
   - `AuthFlow` (sign in/up + OTP) → `Field` + `Form` (+ `otp-field`). Add those `packages/ui`
     wrappers Phase-0 style first. ⚠️ **Also re-scope `CartPage.tsx`** (`/cart`, the live Stripe
     checkout) here — it's a full page whose form-field a11y belongs to `Field`/`Form`, not `Dialog`
     (flagged since Phase 2). Confirm it's still the live checkout before touching payment logic.
   - `AccountPage`, `OrdersPage` → `Tabs` / `Menu`. **`OrderGate.tsx` is the last `useFocusTrap`
     caller** — if it migrates to a Base UI primitive this phase, delete `useFocusTrap` from
     `@lib/hooks` (grep first).
   - Migrate → verify in browser → delete the debt each migration makes dead. Stage stage-by-stage;
     owner pushes.
4. **End the session with a Phase 5 handoff prompt** (Feedback & status: `StockNotifier`/confirmations
   → `Toast`; dietary badges/upsells → `Tooltip`; `OrderTracker` → `Progress`; `MealConcierge` →
   `Combobox`/`Accordion`).

**Reference — CartPage:** the live checkout is `CartPage.tsx` (`/cart`), a full page; its `Field`/`Form`
a11y is Phase-4-shaped, not a `Dialog`. Re-map when Phase 4 is scoped.

**Verifying islands without the API:** dispatch window events in the console — `dish:open` (mock
MenuItem), `bundle:edit` (`combo-platter-2`), or open the cart via the navbar. For store-driven
islands, `await import('/src/lib/core.ts')` to drive nanostores directly. NOTE: proceeding to
checkout now routes to `/cart` (→ `/signin` if unauthed), because checkout is a page.

**Before any deploy:** run `pnpm build` (full SSR/type build — verified via dev server only so far)
and QA the live `CartPage` checkout end-to-end.
