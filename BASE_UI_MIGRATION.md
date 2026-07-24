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
5. **End every session with a handoff prompt — inline, in the SAME closing turn.** Do NOT stop
   after staging + handing over the commit messages. In that same final turn, Claude ALSO emits a
   copy-paste "next session" prompt (as **text in the chat**, never a separate file) that lets a
   fresh session resume from the next phase with full context (what's done, what's staged, what to
   delete, what to build). Staging, the per-stage commit messages, and the handoff prompt all land
   together in one closing turn. See [[feedback-session-handoffs]].

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

## Phase 4 — Auth & account ✅ DONE
- [x] **Wrappers added (Phase-0 style):** `Field` (`field`), `Form` (`form`), `OtpField`
  (`otp-field`), `Tabs` (`tabs`) — each a `styled()` part factory + brand-token CSS +
  reduced-motion guard + side-effect CSS import, exported from `src/index.ts`. `Field`/`Form`
  default to `unstyled` in the validation-bearing islands (they keep the brand `.form-*` look);
  `OtpField`/`Tabs` ship a real brand default (used visibly).
- [x] **`AuthFlow` → `Field` + `Form` + `OtpField`** ✅ All 3 forms (email/code/details) wrapped
  in `Form` + `Field` (a11y only — label↔control↔error wiring, `aria-invalid`). **Every validation
  rule + message + submit path preserved byte-for-byte** (`EMAIL_RE`, `/^\d{6}$/`, name ≥2). OTP
  step → **segmented 6-box `OtpField`** (owner approved the visual change over the old single masked
  input; brand-styled, numeric, paste/auto-advance). Removed the two focus refs (`codeRef`/`nameRef`)
  + the `useEffect` focus block (autofocus now on the mounted first slot / name control).
- [x] **`CartPage` → `Field` + `Form`** ✅ Contact/address fields (name/phone/email/address/apt/
  drop-off/notes-textarea) wrapped for a11y. **Stripe/payment logic untouched** — the `PaymentElement`
  step is separate. `validate()` + `errors` map + `handleSubmit`/`handlePaymentRequest` unchanged
  (`fieldChange` switched from an event handler to a value handler for `onValueChange`). **QA'd
  end-to-end**: field binding, per-field validation, happy-path submit → `ordersApi.place` (mock token
  rejected as expected), pixel-identical brand look, zero console errors.
- [x] **`AccountPage` → `Tabs` (richer redesign)** ✅ Owner opted into a modern redesign (not a11y-only):
  new account hero (initials avatar + name + email) + **Base UI `Tabs`** (Profile / Preferences /
  Rewards) with a sliding indicator. Profile form → `Field`/`Form`. All save paths + dietary toggles +
  vault rendering preserved.
- [x] **`OrdersPage` → `Tabs` (richer redesign)** ✅ Owner opted into a modern redesign: **`Tabs`**
  (Active / Completed / All) with a count badge on Active; status-filtered `OrderCard` lists. Card
  expand/reorder/track behavior preserved.
- **`useFocusTrap` KEPT** — `OrderGate.tsx` is still its sole live caller (NavBar's two hits are
  explanatory comments, not calls). OrderGate did **not** migrate this phase, so the hook stays.

### ⚠️ Base UI `Form`/`Field` gotcha (learned this phase — read before Phase 5+ forms)
Base UI `Form` runs its **own** field validation on submit and **swallows the island's `onSubmit`**
if any field is natively invalid (`required` empty → `valueMissing`; `type="email"` malformed →
`typeMismatch`). To keep the islands' custom `validate()`/messages authoritative:
1. **Drop native `required`** → use `aria-required="true"` (keeps a11y, avoids `valueMissing` blocking).
2. **Email fields:** `type="text"` + `inputMode="email"` (not `type="email"`), so a malformed value
   never triggers `typeMismatch` blocking — the island's `EMAIL_RE` check + message stay in control.
3. **Controlled inputs MUST use Base UI's controlled API** — `value` + **`onValueChange`** on
   `Field.Control` (NOT `value` + `onChange`; the plain `onChange` is swallowed by Field's internal
   handler and the input silently stops updating React state — a checkout-breaking bug). For a
   `<textarea>`, add `render={<textarea/>}` for the element type but keep `value`/`onValueChange` on
   `Field.Control`. Verified: no controlled/uncontrolled React warnings with this pattern.

## Phase 5 — Feedback & status ✅ DONE
- [x] **Wrappers added (Phase-0 style):** `Toast` (`toast`), `Tooltip` (`tooltip`),
  `Progress` (`progress`), `Accordion` (`accordion`) — each a `styled()` part factory +
  brand-token CSS + reduced-motion guard + side-effect CSS import, exported from
  `src/index.ts`. **`Combobox` was NOT added** — see the dropped target below; per the
  package convention (a wrapper exists only once a real island needs it) no speculative
  wrapper was created.
- [x] **`showToast()` façade → `Toast`** ✅ Owner-approved strategy: **Toast backs the
  existing `showToast()`** rather than replacing 14 call sites. The old hand-rolled
  `#toast-container` DOM-injection was replaced by a single `ToastRegion` island (Base UI
  `Toast.Provider`+`Viewport`, `client:load` in `BaseLayout`); `showToast()` now dispatches
  a `jc:toast` window event that `ToastRegion` bridges into `Toast.useToastManager().add()`.
  **All 14 callers unchanged** (same signature). Gained: a real `region "Notifications"`
  landmark + `aria-live=polite`/`role=status`, hover/focus pause, keyboard + swipe dismiss,
  focus management. Brand pill look preserved (`data-type` success/error → brand colors);
  dismiss X reveals on hover/focus only, so the resting pill is unchanged. **Browser-verified.**
  - ⚠️ **`StockNotifier` was NOT migrated** — re-verify found it does **not** produce toasts.
    It injects persistent `.stock-urgency` "Sold out today" *badges* onto menu cards (honest
    inline status, not a transient toast). Left as-is; the plan's "StockNotifier → Toast"
    mapping was a mis-scope. Order *confirmations* are the `order:confirmed` → OrderTracker
    overlay, also not a toast.
- [x] **Dietary badges → `Tooltip`** ✅ `DishDetailModal`'s dietary/quality badges (Vegan,
  Vegetarian, Non-Veg, GF, Halal, Most Loved, Chef's Pick) each wrapped in a `Tooltip` that
  reveals its meaning on hover (`BadgeTip` local helper; `Tooltip.Trigger render={badge}`).
  Base UI renders the badge span as the trigger with **no added tabindex** → zero tab-stop
  bloat, and **no AT regression** (badges keep their visible text). **Browser-verified**:
  hover shows the "Gluten-free" popup, side=top, no `unstyled` leak.
  - ⚠️ **Honest scope note:** Base UI `Tooltip` v1.6 **does not** wire `aria-describedby`/
    `role="tooltip"` (verified in source — it's a pointer/focus *reveal*, not an ARIA
    description). So this is a **sighted-pointer enhancement, not a screen-reader a11y win**;
    it does not regress AT. Documented in `packages/ui/README.md`.
  - **`upsell hints` → NOT tooltipped.** The `CartPage` `.cp-suggestions` rail is already
    self-describing (per-group headline + subline inline), so a tooltip would be redundant.
    Evaluated and left as-is.
- [x] **`OrderTracker` → `Progress`** ✅ Added a determinate `Progress` bar above the stage
  stepper: `role="progressbar"` + `aria-valuenow`/`aria-valuemax` + a human
  `aria-valuetext` ("In the Kitchen — step 2 of 4") via `getAriaValueText`. The decorative
  dot-stepper is now `aria-hidden` (dropped its `role="list"`/`"listitem"`) so status is
  announced once. A slim maroon bar (on-brand, phase-appropriate visual addition).
  **Browser-verified** (mock `order:confirmed`): progressbar semantics correct, bar advances
  with the stages, stepper `aria-hidden`.
- [x] **`MealConcierge` → `Dialog` + `Accordion` (owner-approved redesign)** ✅ Combobox fit
  poorly (3–4 fixed chip options/question), so owner opted into an **Accordion redesign**
  (visual change, like Account/Orders in Phase 4). The hand-rolled overlay → `Dialog`
  (unstyled, reusing `.dish-modal__backdrop`/`__positioner` + `.concierge-modal`) so it now
  has focus trap / ESC / backdrop-dismiss it never had; the 3-step wizard → a controlled
  `Accordion` (Occasion / Spice / Dietary), each panel a chip group, **auto-advancing** to
  the next section on pick (preserves the guided flow). `Dialog.Title`/`Description` for
  a11y. All filter/scroll/toast logic preserved. **Browser-verified**: dialog a11y, accordion
  `aria-expanded`/`aria-controls`, auto-advance, filters applied + toast fired on submit.
  - **`useFocusTrap` KEPT** — MealConcierge migrated to `Dialog` (Base UI owns its focus
    trap), but `OrderGate.tsx` is **still** the sole live `useFocusTrap` caller. Grep-confirmed.
    Do not delete the hook until OrderGate migrates.

### ⚠️ Toast architecture note (read before touching notifications)
`showToast(message, type, duration)` in `@lib/toast` is the **only** public toast API and its
signature is frozen — it now just `dispatchEvent(new CustomEvent('jc:toast', {detail}))`. The
single `ToastRegion` island (mounted in `BaseLayout`, `client:load`) owns the Base UI
`Toast.Provider`/`Viewport` and bridges that event into the manager. To add a toast from
anywhere (island or plain function), call `showToast()` — do **not** try to mount a second
provider or call `useToastManager()` outside `ToastRegion` (Astro islands are independent React
roots; a second provider would be a separate, empty region).

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
| CartPage ✅ (live checkout, `/cart`) | full page — `field`/`form` (contact/address a11y; Stripe untouched), NOT `dialog` |
| CartDrawer | `drawer` (side dialog) |
| AuthFlow ✅ | `field`, `form`, `otp-field` (segmented 6-box) |
| SearchFilterBar ✅ | `select`, `toggle-group` |
| ~~CategoryRail~~ | **DROPPED — island deleted in the modal→page redesign** |
| NavBar ✅ | `navigation-menu` (desktop dropdown) + `dialog` (mobile drawer, not `collapsible` — it's modal) |
| AccountPage ✅ | `tabs` (Profile/Preferences/Rewards) + `field`/`form` (profile) |
| OrdersPage ✅ | `tabs` (Active/Completed/All) |
| `showToast()` façade (14 callers) ✅ | `toast` (one `ToastRegion` host backs the façade; ~~StockNotifier~~ injects badges, not toasts) |
| dietary badges (DishDetailModal) ✅ | `tooltip` (pointer reveal; ~~CartPage upsells~~ already self-describing) |
| OrderTracker ✅ | `progress` (semantic status bar; stepper now decorative/`aria-hidden`) |
| MealConcierge ✅ | `dialog` + `accordion` (redesign; ~~`combobox`~~ dropped — poor fit) |

## Mobile (RN) note
Base UI is **web-only** — it does NOT go into `apps/mobile`. Cross-platform parity comes
from `@joy-curry/tokens` (already architected). Web `<Dialog>` ↔ RN modal share token values.

---

## Session log
- 2026-07-23: Plan authored, decisions locked, Base UI 1.6.0 confirmed installed. Starting Phase 0.
- 2026-07-23 (same session, autonomous run): **Completed Phase 0** (`packages/ui` seam: `cx`, `styled()` factory with `unstyled` hatch, `Dialog` wrapper + CSS, wired into web, README), **Phase 1** (`DishDetailModal`), and **Phase 2 partial** (`BundleModal` + `CartDrawer`). All browser-verified. Fixed the `unstyled`-leak bug.
- 2026-07-23 (continuation run): **Completed Phase 2** — migrated `CheckoutModal` shell to `Dialog` (payment logic untouched), added `.checkout-modal--bui` CSS, browser-verified on a temp `/spike` mount (reverted after). **Discovered `CheckoutModal` is dead code** — superseded by the full-page `CartPage.tsx` (`/cart`), which is the live Stripe checkout now. Updated the primitive map + Phase 2 notes accordingly. Nothing committed — all staged for owner review. App compiles and dev SSR renders all pages.
- 2026-07-23 (Phase-3 session, step 1 — cleanup): Ran the **debt-deletion sweep** (see the ✅ SWEPT section above). Deleted `CheckoutModal.tsx` + its mount + orphaned CSS (`checkout-modal--bui`, `checkout-steps`, `vault-section`, `promo-section`); kept everything CartPage/RewardsPanel/OrderGate still reference (grep-verified). Kept `useFocusTrap` (2 live callers). Flagged the orphaned `checkoutOpen` core atom for the owner. **Browser-verified** `/order` + `/cart` render with zero console/SSR errors after the sweep. Staged in 3 stages (A: `packages/ui` seam + wiring; B: modal migrations + shell CSS; C: dead-code removal) — nothing committed/pushed; handed the owner a message per stage. Phase 3 migration NOT started yet (awaiting owner push).
- 2026-07-24 (Phase-4 session): **Completed Phase 4 — Auth & account.** Re-verified targets first
  (AuthFlow `/signin`, CartPage `/cart` = live Stripe checkout, AccountPage `/account`, OrdersPage
  `/orders` — all live; Account/Orders were flattened by the redesign, no Tabs/Menu existed). Two owner
  decisions: (1) OTP → **segmented 6-box `otp-field`** (accept the visual change), (2) **Account +
  Orders → a richer modern `Tabs` redesign** (opt out of "no visual change" for these two pages).
  Added `Field`/`Form`/`OtpField`/`Tabs` wrappers (Stage A). Migrated **AuthFlow** (Field/Form/OtpField,
  every validation rule/message/submit path preserved) and **CartPage** (Field/Form on contact/address,
  Stripe untouched); redesigned **AccountPage** (hero + Profile/Preferences/Rewards tabs) and
  **OrdersPage** (Active/Completed/All tabs + count badge). Hit + solved the Base UI `Form`/`Field`
  gotcha (see the ⚠️ box in Phase 4): `Form` swallows `onSubmit` on native-invalid fields, and
  `Field.Control` needs `value`+`onValueChange` (plain `onChange` is dropped → silently breaks binding).
  **Browser-verified all four** with a real API (started `apps/api`) + a `window.fetch` shim for the
  auth-gated Account/Orders data: custom validation messages fire (empty + malformed), field binding
  works, tabs switch with sliding indicator, card expand/reorder/track intact, pixel-identical brand
  look on Auth/Cart, zero console errors (on fresh tabs — the shared console buffer replays stale
  warnings, per the tooling note). Debt deleted inline (folded into Stage B): orphaned
  `.auth-flow__code-input` (single-input class, OTP is now segmented) and the unused `.account-section`
  base card rule (`.account-panel` replaced it; the `__heading`/`__hint`/`__save-btn`/`__error`
  sub-classes are still used and kept). `useFocusTrap` **kept** (OrderGate still calls it). Staged in
  3 stages (A: wrappers; B: island migrations + global.css incl. inline debt deletion; C: this tracker)
  — nothing committed/pushed.
- 2026-07-24 (Phase-5 session): **Completed Phase 5 — Feedback & status.** Re-verified targets
  first (all live in `/order` + `BaseLayout`): discovered **StockNotifier injects badges, not
  toasts** and **dietary badges live in a static `MenuCard.astro`** (only `DishDetailModal`'s are a
  React island). Two owner decisions: (1) **Toast backs the existing `showToast()`** (one bridged
  `ToastRegion` host, 14 callers unchanged) over per-island replacement; (2) **MealConcierge →
  Accordion redesign** (Combobox fit poorly). Added `Toast`/`Tooltip`/`Progress`/`Accordion`
  wrappers (Stage A); **Combobox intentionally skipped** (no consumer). Migrated: `showToast`
  façade → `Toast` (new `ToastRegion` island + `jc:toast` event bridge, old `#toast-container`
  removed), `DishDetailModal` badges → `Tooltip` (pointer reveal — see the honest a11y note; no AT
  regression, no tab-stop bloat), `OrderTracker` → `Progress` (semantic status bar, stepper now
  `aria-hidden`), `MealConcierge` → `Dialog`+`Accordion` (auto-advancing wizard; gained focus trap).
  Left as-is with reasons: StockNotifier badges, CartPage upsell rail (self-describing).
  **Browser-verified all four** against the running API + fresh-tab console (zero errors/warnings):
  toast region landmark + brand pill + variants, badge tooltip "Gluten-free" on hover, progressbar
  `aria-valuetext`, concierge dialog+accordion+auto-advance+filters+toast. **Debt deleted inline
  (folded into Stage B, all in shared `global.css`):** old `#toast-container` + `.toast*` styles
  (print rule repointed to `.jc-toast__viewport`), orphaned `.dish-modal-overlay` selector +
  its mobile override (kept the `dish-modal-overlay-in/out` keyframes — still used by
  `.dish-modal__backdrop`), and MealConcierge's duplicate local `showToast` (now imports the shared
  one). Grep-verified each dead before deleting. `useFocusTrap` **kept** (OrderGate still calls it).
  **Findings surfaced:** Base UI `Tooltip` v1.6 doesn't wire `aria-describedby`/`role=tooltip`
  (pointer reveal only) — documented in README + the Phase-5 Tooltip note. Staged in **2 effective
  stages** (A: wrappers; B: island migrations + `global.css` incl. inline debt deletion — Stage C
  folded into B since all debt was inline in shared files) — nothing committed/pushed.
- 2026-07-23 (Phase-3 migration): **Completed Phase 3.** Re-verified targets first: `SearchFilterBar` live on `/order` (already migrated to `Select`+`ToggleGroup`); `CategoryRail` **gone** — dropped from scope (island + mount + `.category-nav*` CSS all deleted in the earlier redesign); `NavBar` live. Added the `Select`/`ToggleGroup`/`NavigationMenu` wrappers. Migrated **`NavBar`**: desktop MENU dropdown → `NavigationMenu` (owner accepted hover+focus+click open; panel restructured into the portaled Positioner→Popup→Viewport, brand CSS preserved), mobile drawer → `Dialog` left side-sheet (owner picked `Dialog` over the plan's "Collapsible" since the drawer is modal). Removed NavBar's `useFocusTrap` call + manual outside-click/ESC/keydown effects + `.navbar__menu-trigger--open`/`navMenuIn`/`.nav-drawer-overlay--visible` dead CSS. `useFocusTrap` **kept** (OrderGate still calls it). **Browser-verified** both islands across desktop + mobile: correct roles/ARIA, pixel-identical look (screenshots), ESC + backdrop dismiss, focus trap, store sync, no `unstyled` leaks, zero console/dev-server errors. Static typecheck note: no standalone `tsc` in the workspace and `astro check` needs an interactive install — relied on the dev-server transform (islands executed live) per the established Phase-2 convention. Staged in 3 stages (A: wrappers; B: NavBar migration + `global.css`; C: SearchFilterBar migration + CategoryRail deletion + `order.astro` + `.category-nav` CSS removal) — nothing committed/pushed.

## Next session — start here (STRICT ORDER) → Phase 6: Close out
**Phase 5 is done. Phases 0–4 are pushed; Phase 5 is staged (2 stages), awaiting owner push.**
Follow the workflow rules above:

0. Read this whole file top-to-bottom (esp. the ⚠️ Toast architecture note + Base UI `Tooltip`
   a11y note in Phase 5, and the `Form`/`Field` gotcha in Phase 4).
1. **Cleanup FIRST — no new-feature code.** Phase 5 deleted its own debt inline (old
   `#toast-container`/`.toast*`, orphaned `.dish-modal-overlay`, MealConcierge's dup `showToast`
   — all folded into Stage B). No Phase-5 leftover to sweep. Just re-grep the "Out-of-scope debt
   flagged" item below (`checkoutOpen`) and confirm nothing new dangles.
2. **Owner pushes the Phase-5 stages to GitHub** (A → B) if not already done. Wait for confirmation
   before starting Phase 6.
3. **Then Phase 6 — Close out:**
   - **Delete the spike trio** — `apps/web/src/pages/spike.astro`, `BaseUISpike.tsx`,
     `BaseUISpike.css`. These were the scratch verification page kept through Phases 0–5; grep-confirm
     no other referrers, then remove. (Phase 5 verified islands via events/JS on real pages, not the
     spike — it's now unused.)
   - **Accessibility sweep (keyboard-only + screen reader)** across every migrated flow: Dialogs
     (Dish/Bundle/Cart/Nav-drawer/**MealConcierge**), `Select`/`ToggleGroup`/`NavigationMenu`,
     `Field`/`Form`/`OtpField`/`Tabs`, and the Phase-5 `Toast`/`Tooltip`/`Progress`/`Accordion`.
     Confirm focus trap/return, ESC, roving tabindex, `aria-*` wiring, and the Toast region landmark.
   - **Finalize `packages/ui/README.md`** — it's current through Phase 5; do a final polish pass
     (usage snippets, the full component table, the `unstyled` + Tooltip a11y notes).
   - **`OrderGate.tsx` is the LAST `useFocusTrap` caller.** It has never migrated. If the a11y sweep
     (or a decision to migrate it to `Dialog`) touches it, that makes `useFocusTrap` dead — **delete
     `useFocusTrap` from `@lib/hooks` only after grep-confirming zero callers.** Otherwise leave it.
   - **Decide the `checkoutOpen` orphan** (see below) — prune from `@joy-curry/core` or keep for mobile.
4. Phase 6 is the last phase — end with a wrap-up (no further phase handoff needed), or a short
   "post-migration maintenance" note if debt remains.

**Verifying islands without the API:** dispatch window events in the console — `dish:open` (mock
MenuItem), `bundle:edit` (`combo-platter-2`), or open the cart via the navbar. For store-driven islands,
`await import('/src/lib/core.ts')` to drive nanostores directly (`setAuth(token, user)` for auth-gated
pages). For pages that fetch auth-gated data (Account `/api/users/me`, Orders `/api/orders/me`), install a
`window.fetch` shim returning mock JSON, then change the auth token via `setAuth` to re-trigger the load
effect **without navigating** (navigation resets the shim). The `apps/api` server can also be started for
real data, but its OTP email send throws in dev (a failing `RESEND_API_KEY` is set — do NOT edit `.env`).
NOTE: the browser MCP console buffer is session-wide and replays STALE warnings across edits/reloads —
always confirm "zero console errors" on a **fresh tab**, not the working tab.

**Before any deploy:** run `pnpm build` (full SSR/type build — verified via dev server only so far)
and QA the live `CartPage` checkout end-to-end with a real signed-in user.
