# Joy Curry & Tandoor — Learning Roadmap & Project Specification
### Learn JavaScript by building the ordering website for a real Halal Indian restaurant
*Companion file for the "JavaScript Mentor" project. Claude: consult this before planning any lesson or task. All menu content here is real — use it, do not invent dishes. This file is the single authority for "where we are" in the build — phase and milestone numbers here always win over any other document.*

---

## 1. The Restaurant (real)

- **Name:** Joy Curry & Tandoor (Est. 1994)
- **Website:** joycurry.net
- **Phone:** 212-490-1277
- **Address:** 148 East 46th St, between Lexington & 3rd Ave, NYC
- **Identity:** Halal Indian food, vegan-friendly options, casual fast-food *and* sit-in dining across a two-floor space.
- **All food is Halal** — treat this as a restaurant-level flag, not a per-item one.

---

## 2. Project Vision

Build the **Joy Curry & Tandoor ordering website**, modeled on how real food-delivery sites work, using the restaurant's actual menu. There is no deadline — quality and learning depth take priority over speed at every decision point.

| Feature | Description |
|---|---|
| Menu browsing | All real categories (see Section 6). Cards with name, price, description, dietary/allergen tags |
| Search & filter | Search by name; filter by category, Veg/Vegan/Non-veg, spice level, price range |
| Dietary & allergens | Surface Vegan/Vegetarian tags and allergen warnings (cashew in chicken sauce, dairy, cross-contact note) |
| Item options | Fixed spice level shown per dish; portion variants (Half/Full); modifiers (white meat +$1); protein choice (Lamb/Beef/Goat); piece counts |
| Cart | Add/remove, edit quantity and options, live total, taxes, delivery fee |
| Configurable bundles | Dinner Specials + 15 Joy Combos with real choose-from-list constraint rules (**deferred to Phase 7 by design**) |
| User accounts | Sign up, log in, log out |
| Profile management | Edit name, phone, saved delivery addresses, dietary preferences |
| Checkout & delivery | Delivery vs. pickup, estimated wait time, order confirmation |
| Order history | Past orders with reorder |
| Email confirmations | Transactional email sent on order confirmation |
| Admin panel | Add/edit/delete items, change prices, toggle in-stock / active status |
| Backend | Node.js + Express REST API + SQLite database (menu, users, orders) |

**Tech stack (introduced gradually):**
- Phases 1–2: JavaScript fundamentals + CSS architecture (no framework)
- Phases 3–4: Vanilla JS + DOM + browser state
- Phase 5: Node.js, Express, SQLite
- Phase 6: fetch / async-await, user authentication
- Phase 7: full-stack integration, bundles, email
- Phase 8: polish, accessibility, security audit, deployment

**Note on assets:** the menu has no images. Use placeholder paths in early phases (`/images/dishes/dish-name.jpg`); real photos are swapped in at Phase 8.

---

## 3. Why This Menu Is Complex (read before designing the data model)

This is a real, messy menu. Five things make it harder than a typical beginner project. Handle them in stages, not all at once.

1. **Configurable bundles.** Dinner Specials = "rice + 1 naan + 1 appetizer (choose 1 of 6) + 1 dessert (choose 1 of 3)." Joy Combos = 15 platters, each with its own pick rules, and combos may only use a *restricted* sub-list of entrées. This is choice-logic with constraints → **deferred to Phase 7**.

2. **Same dish, multiple contexts and prices.** e.g. *Lamb Curry* appears as:
   - `lamb-curry-entree` — $16.50 (full entrée, served with basmati rice)
   - `lamb-curry-side` — $7.50 (side dish, no rice or bread)
   - `lamb-curry-lunch` — $14.95 (Express Lunch, served over rice)
   One dish name maps to several priced contexts. **Each context is modelled as a distinct item object with its own unique `id`.** This is the correct solution — do not try to make one object serve all three purposes.

3. **Spice level is a fixed property of the dish**, not a free customer choice. Vindaloo = Hot, Korma = Mild, Karahi = Medium. Model it as menu data. A customer preference note can be an optional text field added later.

4. **Spice level on all main dishes.** Even dishes without an official label carry a practical spice level that helps customers unfamiliar with the cuisine. Sam is the subject matter expert on these assignments. All à la carte and main dishes get a `spiceLevel` value.

5. **Variants & modifiers.** Half/Full sizes, "white meat +$1," "choice of Lamb/Beef/Goat," piece counts (2/3/7 pcs). Introduced after flat items are working.

**Staging principle:** flat à-la-carte items → variants/modifiers → multi-context pricing → configurable combos.

---

## 4. Data Model (the heart of the project)

> Claude: introduce fields gradually. Phases 1–2 use only the flat fields. Add `sizeOptions`, `modifiers`, `proteinChoice` when Phase 4 reaches variants. Add the combo model in Phase 7 only.

### 4a. Menu item (à-la-carte) — full agreed schema

This is the schema as agreed and built during Phase 1. All category files use this shape.

```js
{
  id:            "lamb-curry-entree",       // kebab-case, unique across ALL files
  name:          "Lamb Curry",
  category:      "meat-entree",             // see category list in Section 6
  subcategory:   null,                      // e.g. "veggie" | "meat" for appetizers; else null
  description:   "Lamb cooked in a traditional curry sauce.",
  basePrice:     16.50,                     // float in JS — seed.js converts to integer cents for DB
  isVegan:       false,
  isVegetarian:  false,
  isGlutenFree:  false,                     // Sam is SME per dish — many curries are naturally GF
  spiceLevel:    "Medium",                  // "Mild" | "Medium" | "Hot" | null (strings in JS)
                                            // seed.js maps to DB integers: null→0, Mild→1, Medium→2, Hot→3
  allergens:     [],                        // [] = confirmed none; list strings otherwise
  allergenNote:  null,                      // null = use global ALLERGEN_NOTE_DEFAULT from constants.js
                                            // set a string here only for a dish-specific override
  servedWith:    "rice",                    // "rice" | "raita" | "naan" | null
  proteinChoice: ["Lamb", "Beef", "Goat"], // or null
  sizeOptions:   null,                      // [{label, price}] for Half/Full; else null — Phase 4+
  modifiers:     null,                      // [{id, label, priceDelta}] — see 4b — Phase 4+
  pieceCount:    null,                      // e.g. 2, 3, 7; else null
  tags:          ["popular"],               // ["chef-special","spicy","contains-nuts"] — badges + AI
  searchKeywords: ["mutton"],               // alternate terms a customer might type; [] if none
  imageUrl:      "/images/dishes/lamb-curry.jpg",  // PLACEHOLDER — real photos Phase 8
  inStock:       true,                      // false = temporarily sold out; still shown, greyed
  isActive:      true                       // false = admin removed from menu entirely; not shown
}
```

**`inStock` vs `isActive`:** These are different operations. `inStock: false` means "temporarily sold out — show the dish greyed out." `isActive: false` means "admin pulled this item from the menu entirely — do not show it." Never collapse these into one field.

**`currency` is not in item objects.** It lives in `config/constants.js` as `CURRENCY = "USD"` and is applied once at the payment boundary. Repeating it across 125 items is pure redundancy.

**`isHalal` is not in item objects.** The entire restaurant is Halal — it is a restaurant-level flag, not a per-item one. The database schema defaults `is_halal` to `TRUE` at the column level. If a non-Halal item were ever added, the column handles it.

**`allergenNote` default:** For the generic cross-contact note ("Prepared in a kitchen that uses nuts and dairy"), set `allergenNote: null` and display `ALLERGEN_NOTE_DEFAULT` from `constants.js` as a site-wide banner. Only set a string value here if the dish has a note that differs from the global one.

**Phase 5 DB normalisation:** In the database, `allergens` and `modifiers` arrays decompose into junction tables (`item_allergens`, `item_modifiers`). This means changing the "White meat" modifier price from $1.00 to $1.50 is one UPDATE, not 10. The JS data files remain as arrays — `seed.js` handles the normalisation on insert.

### 4b. Variant / modifier patterns (introduced in Phase 4)

```js
// Size variants — e.g. Tandoori Chicken Half/Full
sizeOptions: [
  { label: "Half", price: 12.00 },
  { label: "Full", price: 21.00 }
]

// Price modifier — modifier objects MUST have an id for stable cart state tracking.
// Never use the label string as an identifier — labels can be renamed; ids are permanent.
modifiers: [
  { id: "mod-white-meat", label: "White meat", priceDelta: 1.00 }
]

// Protein choice — e.g. Meat Entrées (Lamb/Beef/Goat)
proteinChoice: ["Lamb", "Beef", "Goat"]
```

**Shared modifier pattern for files where all dishes share the same modifiers/allergens:**
Use a base object + `.map()` with spread instead of repeating identical fields on every dish. This is the correct pattern for `chicken-entrees.js` (all 10 dishes share allergens and the white-meat modifier):

```js
const BASE_CHICKEN = {
  allergens:    ["cashew", "dairy"],
  allergenNote: null,
  modifiers:    [{ id: "mod-white-meat", label: "White meat", priceDelta: 1.00 }]
};

export const chickenEntrees = [
  { id: "chk-tikka-masala", name: "Chicken Tikka Masala", /* ...other fields */ },
  { id: "chk-curry",        name: "Chicken Curry",        /* ...other fields */ },
  // ...
].map(dish => ({ ...BASE_CHICKEN, ...dish }));
```

Apply this pattern only where the shared fields are truly uniform across the entire file. Files where dishes differ significantly (e.g. `tandoori.js`, `appetizers.js`) use explicit full objects.

### 4c. Configurable bundle (Phase 7 only)

```js
{
  id:        "dinner-special-veg",
  name:      "Vegetable Dinner Special",
  type:      "dinner-special",          // or "combo"
  basePrice: 18.95,
  includes:  ["rice", "naan"],          // fixed inclusions, no choice
  slots: [
    { label: "Appetizer", choose: 1,
      optionIds: ["veg-samosa","meat-samosa","pakora","aloo-tikki","papadum","chaat"] },
    { label: "Dessert",   choose: 1,
      optionIds: ["kheer","gulab-jamun","rasmalai"] },
    { label: "Entrée",    choose: 1, constraint: "vegetable-only",
      optionIds: [ /* restricted combo veg list — see joy_curry_tandoor_menu.md */ ] }
  ]
}
```

---

## 5. Learning Roadmap — Phases & Milestones

> One milestone at a time. State phase and milestone at the start of every session. No deadline — depth over speed.

---

### Phase 0 — Setup ✓ COMPLETE

- **M0.1** ✓ Install VS Code, Node.js, Git. Create the project folder. Install all VS Code extensions.
- **M0.2** ✓ Git + GitHub: init, add, commit, push, README, `.gitignore`. Create `joy-curry-tandoor` repo with the Section 7 folder structure. First commit live on GitHub.
- **Deliverable:** ✓ Properly structured repo on GitHub with README and `.gitignore`.

---

### Phase 1 — JavaScript Foundations *(in progress)*

- **M1.1** ✓ Variables & data types — analogy: labeled containers in the kitchen.
- **M1.2** ✓ Arrays & objects — analogy: the menu is an array; each dish is an object.
- **M1.3** ✓ Functions — analogy: a recipe the kitchen runs on demand.
- **M1.4** ✓ Conditionals & loops — "if spiceLevel is Hot, show a chili icon"; looping the menu.
- **M1.5** Array methods: `map`, `filter`, `find`, `reduce` — powers search, dietary filters, and cart totals.
- **M1.6** Template literals & string methods — cleaner string building; used in every rendered card.
- **M1.7** Destructuring — pulling specific fields out of objects and arrays cleanly; used constantly in real code.
- **M1.8** Spread & rest operators — creating safe copies of objects/arrays without mutating the original; required for correct cart state in Phase 4.
- **M1.9** ES Modules (`export` / `import`) — formally teaching what the category files already use; one file = one responsibility; `index.js` as the aggregator pattern.
- **M1.10** Error handling basics — `try` / `catch` / `finally`; reading error objects; writing code that fails gracefully rather than silently.
- **Deliverable:** All 17 category files complete under `frontend/js/data/menu/`, each exporting its real menu items using the Section 4a schema. `index.js` aggregates and re-exports the full menu. `utils/formatters.js` contains `formatPrice`, `formatSpiceLevel`, and other shared helpers. Practice queries: "find all vegan items under $12," "list every dish with cashew allergen," "sum the price of all items in a mock cart."

---

### Phase 2 — CSS Architecture & Design System

> CSS and semantic HTML must be built before the DOM phase, not after. You cannot responsively style what you haven't structured, and WCAG compliance starts with HTML semantics, not with JavaScript.

- **M2.1** HTML semantics — `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`. Why semantic HTML is the foundation of both accessibility and CSS architecture.
- **M2.2** The CSS box model, specificity, and cascade — understanding why styles override each other; avoiding the "why won't this work" trap.
- **M2.3** Design tokens as CSS custom properties — define color palette, spacing scale, typography, border-radius, and shadows once in `:root`; reference everywhere. Change one variable, update the whole site.
- **M2.4** Mobile-first responsive layout — flexbox and CSS grid; breakpoints for mobile (≤480px), tablet (≤768px), laptop (≤1200px), desktop (1201px+). Design at 375px first, expand outward.
- **M2.5** Component patterns — menu card, badge (Vegan / Spicy / Contains Nuts), button variants, form inputs — each as a reusable, self-contained CSS block.
- **M2.6** Accessibility foundations — color contrast ratios (WCAG AA minimum 4.5:1), focus indicators, keyboard tab order, ARIA labels on interactive elements. Applied now, not at Phase 8.
- **Deliverable:** `styles.css` with a complete design system: tokens, typography, responsive grid, and all component patterns. `index.html` with correct semantic structure, ready to receive dynamic content. Every layout tested at mobile, tablet, and desktop widths in Chrome DevTools device toolbar.

---

### Phase 3 — DOM & Interactivity

- **M3.1** What the DOM is — the live, editable version of the HTML page; the bridge between data and display.
- **M3.2** Selecting & changing elements — `querySelector`, `querySelectorAll`, `textContent`, `classList`, inline styles.
- **M3.3** Render menu cards from `data/menu/index.js` — map over the real menu array; build a card HTML string per item; inject into the DOM. Include dietary tags and allergen badges.
- **M3.4** Events — click, input, submit; `addEventListener`; the event object. Build the live search bar.
- **M3.5** Filters — category tabs, Veg/Vegan/Non-veg toggles, spice level selector, price range. Combine multiple active filters correctly.
- **M3.6** Event delegation — why attaching a listener to a parent is better than one per card; handle clicks on dynamically rendered elements without re-binding on every render.
- **M3.7** Loading, empty, and error states — what the user sees while data loads, when a filter returns zero results, and when something goes wrong. These are product features, not afterthoughts.
- **Deliverable:** A fully working, responsive menu page — searchable, filterable across all categories and dietary flags, rendered entirely from real data, correct on mobile and desktop.

---

### Phase 4 — State, Options & Cart

- **M4.1** What "state" means — the waiter's notepad: a program's live memory of what is currently true (cart has 3 items, filter is set to Vegan, user is logged out).
- **M4.2** Item detail view — show fixed spice level, allergens, allergen note, and any size/modifier/protein options. User selects options before adding to cart.
- **M4.3** Add to cart with chosen options + quantity; render the cart sidebar/panel.
- **M4.4** Edit and remove cart items; live subtotal using `reduce`; tax and delivery fee applied on top. Prices recalculate instantly on any change.
- **M4.5** Form handling — collecting name, phone, and delivery address at checkout; controlled inputs; what `event.preventDefault()` does and why.
- **M4.6** Client-side validation — required fields, email format, phone format using simple regex; show inline error messages. Understand that this is UX only — the server must re-validate everything independently.
- **M4.7** Persist cart across page refreshes with `localStorage`. Understand its limits (strings only, 5MB cap, not for sensitive data) and risks (tampered on the client — prices are always recalculated server-side).
- **Deliverable:** Full frontend ordering flow: menu → item detail → cart → checkout form → mock confirmation screen. All à la carte items work end to end.

---

### Phase 5 — Backend (Node.js + Express + SQLite)

- **M5.1** What a server is — the kitchen behind the counter: a computer running software that listens for requests and sends back responses.
- **M5.2** First Express server — what `require`, `app.listen`, and a route handler are. The request-response cycle in code.
- **M5.3** Environment variables — what `.env` is, why secrets never go in source files, how `.gitignore` protects them, how `process.env.VARIABLE_NAME` reads them. Create `.env` and `.env.example` now.
- **M5.4** Menu API — `GET /api/menu` (all items), `GET /api/menu/:id` (one item). Understand HTTP methods, status codes, and JSON responses.
- **M5.5** Storage — seed menu data from the JS category files into a JSON file first (learning step), then migrate to SQLite. What a database is, why it beats a flat file, what a table and row are.
- **M5.6** Input sanitization and parameterized queries — what SQL injection is, how parameterized queries prevent it, why you never concatenate user input into a query string. Applied from the first database write.
- **M5.7** CORS (Cross-Origin Resource Sharing) — why the browser blocks your frontend from calling your backend by default; how to configure it correctly and why you don't just allow everything.
- **M5.8** Error handling middleware — centralized error catching; appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 500); structured error responses the frontend can read.
- **M5.9** Admin endpoints — `POST /api/menu`, `PUT /api/menu/:id`, `DELETE /api/menu/:id` (soft-delete via `isActive`), `PATCH /api/menu/:id/stock` (toggle `inStock`). Never hard-delete items that have appeared in orders.
- **Deliverable:** A running Express API serving the full Joy Curry menu from SQLite with proper error handling, input sanitization, and CORS. Testable via Thunder Client in VS Code.

---

### Phase 6 — Auth & API Integration

- **M6.1** `fetch`, promises, and `async/await` — how the browser asks a server for data; what a Promise is (a meal ticket: "I'll have your order ready, come back"); `async/await` as readable syntax for waiting.
- **M6.2** Wire the frontend to the API — replace `import menu from './data/menu/index.js'` with a `fetch` call to `GET /api/menu`. Handle loading state, empty state, and network errors.
- **M6.3** User registration — `POST /api/users/register`; hash passwords with bcrypt before storing (never plain text, never reversible); what a salt round is.
- **M6.4** User login and sessions/JWT — `POST /api/users/login`; issue a signed token or set a session cookie; what authentication vs authorisation means; token storage and risks.
- **M6.5** Protected routes — middleware that checks for a valid token before allowing `PUT`, `DELETE`, or any user-specific action. Server re-verifies identity on every request — never trusts the client.
- **M6.6** User profile — `GET /api/users/me`, `PUT /api/users/me`; edit name, phone, saved delivery addresses, dietary preferences. Saved addresses stored as an array in the database.
- **M6.7** Rate limiting and brute-force protection — limit login attempts per IP; limit API calls per minute. Prevent automated scripts from hammering the server.
- **Deliverable:** Users can register, log in, stay logged in across refreshes, edit their profile, and log out. Frontend is fully wired to the live API. All data comes from the backend, not local files.

---

### Phase 7 — Bundles, Checkout & Email

- **M7.1** Configurable bundles data model — implement Section 4c (`slots`, `optionIds`, `constraint`). Understand why this structure is more maintainable than hard-coded if/else logic.
- **M7.2** Dinner Specials UI — slot-choice interface: one appetizer from the allowed list, one entrée, one dessert; price shown; validation that all slots are filled before adding to cart.
- **M7.3** Joy Combos UI — 15 platters with their individual pick rules and restricted entrée lists. The constraint engine: if a combo allows only Chicken Curry / Korma / Vindaloo, reject any other selection at the UI and the API.
- **M7.4** Cart handles bundle items alongside à la carte — a bundle is one cart line item with nested slot choices; quantity, price, and removal work the same way.
- **M7.5** Checkout posts to backend — `POST /api/orders`; order stored in the database with line items, chosen options, user ID, delivery address, and timestamp (UTC). Idempotency: a duplicate submission does not create a duplicate order.
- **M7.6** Order confirmation and order history — confirmation page with order ID and estimated wait time; `GET /api/orders/me` returns the user's full order history.
- **M7.7** Reorder — one button recreates a past order as a new cart, respecting current prices and stock status.
- **M7.8** Email confirmations — transactional email (SendGrid or Resend) sent on order confirmation; contains order summary, total, and estimated wait time. API key lives in `.env`. Templates are plain HTML.
- **M7.9** Admin UI wired to admin endpoints — add a new menu item, edit price or description, toggle in-stock, deactivate an item. Admin routes are protected: only users with `role: "admin"` may access them.
- **Deliverable:** The complete Joy Curry ordering site, end to end — all à la carte items, all bundles and combos, user accounts, full checkout flow with order persistence, order history, and email confirmations.

---

### Phase 8 — Polish & Ship

- **M8.1** Error handling and edge cases — what happens if the API is down, a dish goes out of stock mid-cart, the user's session expires, or a network request times out? Handle every state the user can realistically encounter.
- **M8.2** Loading skeletons and transitions — skeleton cards while menu loads; smooth CSS transitions on cart open/close, filter change, and page navigation. Purposeful motion — no animation for its own sake.
- **M8.3** Accessibility audit — keyboard navigation across the full site; correct ARIA roles and labels; focus management on modals and dialogs; color contrast re-check against WCAG 2.2 AA; screen reader test.
- **M8.4** Performance audit — Chrome Lighthouse score; Core Web Vitals (LCP, CLS, FID); image optimization; CSS and JS file size; eliminate any render-blocking resources.
- **M8.5** Security audit — `npm audit` on all packages; HTTP security headers (CSP, X-Frame-Options, HSTS); confirm all user input is validated and sanitized server-side; HTTPS enforced.
- **M8.6** CI/CD basics — a simple GitHub Actions workflow that runs ESLint and a basic health check on every push. Automated safety net before anything reaches production.
- **M8.7** Domain and SSL — point a domain to the deployed frontend; HTTPS certificate (free via the hosting provider). Non-negotiable before accepting real traffic.
- **M8.8** Deployment — Vercel for the frontend; Render for the backend and database. Environment variables set in each provider's dashboard. Verify the live site end to end.
- **M8.9** Final documentation — update README with live URL, screenshots, setup guide, and tech decisions. Render all cheat sheets as a hosted documentation site using Docsify on GitHub Pages.
- **Deliverable:** Deployed, documented, accessible, and production-hardened Joy Curry ordering site. Portfolio-ready.

---

## 6. Real Menu (source of truth for data/menu/ category files)

Prices in USD. Each line maps to one or more JS files in `frontend/js/data/menu/`. Spice levels and allergen notes taken directly from the physical menu. **Multi-context items** (marked with †) appear in more than one category file with different IDs and prices — this is intentional and correct.

**Appetizers — Veggie** (`appetizers.js`, subcategory: "veggie"):
Papadum (Vegan) 3 · Veg. Samosa (Vegan, 2 pcs) 4 · Aloo Tikki (Vegan) 4 · Tandoori Vegetables 9.50 · Paneer Tikka 12 · Aloo Papri Chaat (cold) 6.50 · Samosa Chaat (2 pcs) 8.50

**Appetizers — Meat** (`appetizers.js`, subcategory: "meat"):
Meat Samosa 5 · Shami Kabab (2 pcs) 5 · Assorted Tandoori 11.50 · Reshmi Kabab 12

**Salads** (`salads-soups.js`, all Vegan):
Green Salad 5 · Katchumber 5

**Soup** (`salads-soups.js`):
Daal (Vegan) 5.95

**Dinner Specials** (`dinner-specials.js` — bundle model, Phase 7):
Vegetable 18.95 · Chicken 21.95 · Lamb/Goat/Beef/Fish 22.95
Includes: rice + 1 naan + 1 appetizer (choose from: Veg Samosa, Meat Samosa, Pakora, Aloo Tikki, Papadum, Chaat) + 1 dessert (choose from: Kheer, Gulab Jamun, Rasmalai)

**Vegetable Entrées** (`vegetable-entrees.js`, served with rice):
Malai Kofta 11.95 · Navrattan Korma 11.95 · Paneer Makhni 13.95 · Mattar Paneer 12.50 · Palak Paneer 12.50 · Daal Makhni 11.95

**Vegan Entrées** (`vegan-entrees.js`):
Aloo Gobi Mattar 12.50 · Chana Masala 11.95 · Bhindi Masala 12.50 · Chana Saag 12.50 · Baingan Bharta 12.50 · Tarka Daal 10.95 · Mixed Vegetables 12.50 · Mushroom Masala 12.50

**Chicken Entrées** (`chicken-entrees.js`, all 15.50; *white meat +$1; CASHEW NUTS IN SAUCE*):
Tikka Masala (Mild) · Makhni / Butter Chicken (Mild) · Curry · Vindaloo (Hot) · Korma (Mild) · Karahi (Medium) · Saag · Jhalfrezi · Chili · Keema Aloo

**Meat Entrées** (`meat-entrees.js`, served with basmati rice):
Lamb Curry 16.50 † · Lamb Vindaloo (Hot) 16.50 · Lamb Korma (Mild) 16.50 · Lamb Karahi (Medium) 16.50 · Lamb Saag (Medium) 16.50 · Lamb Bhuna 17.50 · Goat Curry 15.50 · Goat Bhuna 15.50 · Goat Karahi 15.50 · Beef Curry 15.50

**Fish & Shrimp** (`fish-shrimp.js`, served with basmati rice):
Fish Curry (flounder) 15.50 · Fish Masala (salmon) 19.95 · Whole Fish Masala (tilapia) 14.95 · Shrimp Masala 18.95

**Tandoori** (`tandoori.js`, served with raita and rice):
Seekh Kabab Chicken (3 pcs) 14 · Seekh Kabab Lamb (3 pcs) 16 · Tandoori Chicken Half 12 / Full 21 · Chicken Tikka (7 pcs) 15.50 · Chicken Boti Kabab 15.95 · Chicken Shashlik 16.50 · Malai Kabab 16.50 · Tandoori Lamb Chop 21.95 · Tandoori Fish 15.50 · Fish Tikka 20.95 · Tandoori Shrimp 20.95 · Mixed Grill 22.95

**Rice & Biryani** (`rice-biryani.js`, served with raita):
Basmati Pulao (Vegan) 4 · Mattar Pulao (Vegan) 7 · Lamb Biryani 16.50 · Beef Biryani 15.50 · Goat Biryani 15.50 · Chicken Biryani 15.50 · Chicken Tikka Biryani 15.50 · Shrimp Biryani 18.95 · Vegetable Biryani 12.50

**Express Lunch** (`express-lunch.js`):
Lamb Curry/Rice 14.95 † · Goat/Rice 13.95 · Chicken Curry/Rice 12.95 · Fish/Rice 13.95 · Low-Fat Chicken Tikka/Rice 12.95 · 1 pc Tandoori Chicken/Rice 8 · Vegetable/Rice 10.50 · Daal/Rice 8 · Chicken with Naan 11

**Joy Combos** (`joy-combos.js` — bundle model, Phase 7):
Platters 1–15, $11.95–$16.50. Each has its own pick rules and a restricted entrée sub-list.
See `joy_curry_tandoor_menu.md` for exact platter definitions.
Permitted vegetable entrées in combos: Mixed Vegetables, Palak Paneer, Aloo Gobi Mattar, Chana Masala, Bhindi Masala, Chana Saag, Baingan Bharta, Tarka Daal.
Permitted meat entrées in combos: Chicken Tikka Masala, Chicken Curry, Chicken Vindaloo, Chicken Korma, Chicken Karahi, Chicken Saag, Lamb Curry, Lamb Vindaloo, Lamb Saag, Goat Curry, Beef Curry.

**Side Dishes** (`sides.js`, no rice or bread):
Lamb Curry 7.50 † · Lamb Vindaloo 7.50 · Lamb Saag 7.50 · Chicken Curry 6.50 · Chicken Vindaloo 6.50 · Chicken Saag 6.50 · Chicken Karahi 6.50 · Chicken Tikka Masala 6.50 · Mixed Veg 5.50 · Palak Paneer 5.50 · Aloo Gobi 5.50 · Bhindi Masala 5.50 · Baigan Bharta 5.50 · Chana Saag 5.50 · Daal Makhni 5.50 · Tarka Daal 4.50

**Condiments** (`condiments.js`):
Raita 3 · Green Chutney 3 · Imly/Tamarind Chutney 3 · Mango Chutney 2.50 · Mixed Pickle 2.50 · Onion Relish 3

**Breads** (`breads.js`):
Tandoori Naan 3 · Roti 3 · Garlic Naan 4.50 · Tandoori Paratha 4.50 · Aloo Paratha 5 · Onion Kulcha 4 · Paneer Kulcha 4 · Rosemary Naan 4 · Chicken Tikka Naan 5.50 · Keema Naan 5.50 · Keema Paratha 6.50

**Desserts** (`desserts.js`):
Gulab Jamun 4 · Rasmalai 4 · Kheer 4

**Beverages** (`beverages.js`):
Tea/Chai 2 · Juices (orange/apple/cranberry/mango/lychee/coconut) 3 · Vitamin Water 3 · Gatorade 3 · Lassi Sweet/Salt 3 · Lassi Mango 4 · Soda 1.75 · Water 1.75

**† Multi-context items** — these dish names appear in more than one category file. Each context gets a unique `id` (e.g., `lamb-curry-entree`, `lamb-curry-side`, `lamb-curry-lunch`) and its own price. This is the correct approach; do not share one object across contexts.

---

## 7. GitHub Repository Structure

```
joy-curry-tandoor/
├── README.md
├── .gitignore
├── .env.example                        # template for env vars — committed; .env is NOT
│
├── frontend/
│   ├── index.html                      # <script type="module" src="./js/app.js"> — required for ES imports
│   ├── css/
│   │   └── styles.css                  # full design system — tokens, grid, components
│   └── js/
│       ├── app.js                      # entry point — imports and initialises everything
│       │
│       ├── config/
│       │   └── constants.js            # CURRENCY, ALLERGEN_NOTE_DEFAULT, TAX_RATE,
│       │                               # DELIVERY_FEE, MIN_ORDER, API_BASE_URL
│       │
│       ├── data/
│       │   └── menu/                   # Phase 1: source of truth before API exists
│       │       ├── index.js            # aggregates + re-exports all categories
│       │       ├── appetizers.js
│       │       ├── salads-soups.js
│       │       ├── dinner-specials.js  # stub in Phase 1; fully built in Phase 7
│       │       ├── vegetable-entrees.js
│       │       ├── vegan-entrees.js
│       │       ├── chicken-entrees.js
│       │       ├── meat-entrees.js
│       │       ├── fish-shrimp.js
│       │       ├── tandoori.js
│       │       ├── rice-biryani.js
│       │       ├── express-lunch.js
│       │       ├── joy-combos.js       # stub in Phase 1; fully built in Phase 7
│       │       ├── sides.js
│       │       ├── condiments.js
│       │       ├── breads.js
│       │       ├── desserts.js
│       │       └── beverages.js
│       │
│       ├── api/                        # abstracted network layer (Phase 6+)
│       │   ├── menuService.js          # getMenu(), getMenuItem(id) — points to local data
│       │   │                           # in Phase 1–5, switches to API_BASE_URL in Phase 6
│       │   ├── orderService.js         # placeOrder(), getOrderHistory(), reorder()
│       │   └── authService.js          # login(), register(), logout(), getProfile()
│       │
│       ├── state/                      # application state — the single source of truth
│       │   ├── cartState.js            # cart array, add/remove/update, quantity, totals
│       │   └── authState.js            # current user object, session token, login status
│       │
│       ├── components/                 # functional UI pieces — take data in, return HTML strings
│       │   ├── Navbar.js               # header with dynamic cart count and auth state
│       │   ├── MenuSection.js          # renders one full category of menu cards
│       │   ├── MenuCard.js             # single dish card — badges, spice indicator, add button
│       │   ├── CartItem.js             # one line item inside the cart drawer
│       │   └── CheckoutModal.js        # delivery address form + order summary
│       │
│       ├── options.js                  # size/modifier/protein/bundle selection logic
│       └── utils/
│           ├── formatters.js           # formatPrice(), formatSpiceLevel(), formatDate()
│           └── validators.js           # email, phone, required-field checks (Phase 4+)
│
├── backend/
│   ├── server.js                       # Express app setup and middleware registration
│   ├── package.json
│   ├── package-lock.json
│   │
│   ├── config/
│   │   └── db.js                       # database connection config and pool setup
│   │
│   ├── routes/
│   │   ├── menu.js                     # GET /api/menu, GET /api/menu/:id
│   │   ├── users.js                    # register, login, profile
│   │   ├── orders.js                   # place order, history, reorder
│   │   ├── admin.js                    # POST/PUT/DELETE menu, stock toggle — protected
│   │   └── ai.js                       # POST /api/ai/search, /api/ai/recommend — Phase 8
│   │
│   ├── middleware/
│   │   ├── auth.js                     # verify JWT / session on protected routes
│   │   ├── errorHandler.js             # centralized error catching and formatting
│   │   ├── rateLimiter.js              # limit login attempts and API call rates
│   │   └── validate.js                 # request body validation middleware
│   │
│   ├── models/
│   │   ├── menu.js                     # all database queries for menu items
│   │   ├── user.js                     # all database queries for users
│   │   └── order.js                    # all database queries for orders
│   │
│   ├── services/
│   │   └── aiService.js                # isolated LLM orchestration — prompt engineering,
│   │                                   # API key handling, context construction (Phase 8)
│   │
│   ├── db/
│   │   ├── setup.js                    # schema creation (tables, indexes, constraints)
│   │   ├── seed.js                     # imports category JS files and inserts into DB;
│   │   │                               # maps spiceLevel strings → integers, normalises
│   │   │                               # allergens and modifiers into junction tables
│   │   └── migrations/                 # schema change scripts — never modify setup.js directly
│   │
│   └── utils/
│       ├── logger.js                   # structured request + error logging
│       ├── email.js                    # SendGrid/Resend wrapper for transactional email
│       └── helpers.js                  # shared utilities (e.g., generateOrderId)
│
└── docs/
    ├── learning-notes/                 # Sam's personal notes per milestone
    ├── cheatsheets/                    # one .md file per phase
    ├── decisions/                      # architecture decisions log
    └── api/                            # API endpoint documentation
```

**`type="module"` is mandatory.** The `<script>` tag in `index.html` must be `<script type="module" src="./js/app.js"></script>`. Without it, native ES `import`/`export` statements do not work in the browser and every file import will throw an error.

**`api/` service layer switch:** During Phases 1–5, `menuService.js` imports directly from `data/menu/index.js`. In Phase 6, the single line `const BASE_URL = constants.API_BASE_URL` is updated and the rest of the application is untouched. This is why the abstraction layer exists.

**Commit rhythm:** one commit per completed milestone minimum. Claude provides the exact commands and message.
Format: `type(scope): description (Mx.x)` — e.g., `feat(menu): render cards with allergen badges (M3.3)` · `fix(cart): correct reduce accumulator start value (M4.4)` · `chore(docs): add Phase 1 cheat sheet (M1.10)`

---

## 8. Cheat Sheet System

One cheat sheet per phase. Delivered as a `.md` file saved to `/docs/cheatsheets/` and In Phase 8 all sheets are rendered as a hosted documentation site via Docsify on GitHub Pages.

**Format per entry:** concept name → one-line layman explanation → syntax → minimal code example → Joy Curry real-world example. Max 5 lines per concept. Each sheet ends with "Common Mistakes" (3–5 items, each with the fix shown).

| Phase | File | Title |
|---|---|---|
| 0 | `00-git-terminal.md` | Git & Terminal Basics |
| 1 | `01-js-foundations.md` | JS Foundations — variables, arrays, objects, functions, methods, modules, destructuring |
| 2 | `02-css-architecture.md` | CSS Architecture — design tokens, flexbox, grid, mobile-first, accessibility |
| 3 | `03-dom-events.md` | DOM & Events — selecting, rendering, listening, delegation, states |
| 4 | `04-state-cart.md` | State, Cart Logic & localStorage |
| 5 | `05-backend.md` | Node.js, Express & REST APIs |
| 6 | `06-auth-async.md` | Async JS, Fetch & Authentication |
| 7 | `07-bundles-checkout.md` | Bundles, Checkout, Orders & Email |
| 8 | `08-deploy-security.md` | Deployment, Performance & Security Checklist |

---

## 9. Conventions for Claude (the mentor)

- **Always state position** at the start of every session: phase, milestone number, today's goal. One line each.
- **One concept per lesson:** analogy → plain explanation → minimal commented code → Joy Curry connection → one hands-on task (15–45 min). Sam types all core code; Claude writes boilerplate and scaffolding.
- **Code review style:** what works → what to fix (corrected code shown) → why, in plain language.
- **Hints before solutions.** Full solution only when explicitly asked.
- **Define jargon in parentheses** on first use, every session.
- **Vanilla JS only** until the phase calls for something new. Introduce new tools with a one-line explanation of why we need them now.
- **Use the real menu** (Section 6). Flag all placeholders (images, email, payment) clearly with `// PLACEHOLDER`.
- **Respect complexity staging:** flat items → variants/modifiers → multi-context pricing → configurable bundles. If asked to jump ahead, acknowledge the question, explain the staging reason, and return to the current milestone.
- **When a milestone is done, say so explicitly** and name the next one.
- **Two modes — two formats:**
  - *Lesson / learning mode:* the format above. Used for all teaching, exercises, and code review.
  - *Production code mode:* the VP of Engineering output format from `Developer_Role.md`. Used when generating real repository code. Declared explicitly with: `🏗️ Production code mode active — VP of Engineering standard applies.`
- **Never generate production code in lesson mode** or lesson content in production code mode. If the context is ambiguous, ask.

---

## 10. Key Decisions Log

Decisions made and locked. Do not relitigate these without a documented reason.

| Decision | What was decided | Why |
|---|---|---|
| No deadline | Quality and learning depth over speed at every point | Explicit preference; building real product |
| Vanilla JS first | No React or framework until Phase 8+ review | Learning fundamentals; frameworks hide the mechanics we need to understand |
| SQLite over Postgres | Simpler setup; file-based; easy to inspect | Learning context; can migrate later |
| Float `basePrice` in JS layer | Floats in data files; `seed.js` converts to integer cents for DB | Learning clarity; avoids confusing beginners with cents before money is real |
| Single `menu-data.js` → per-category files | 17 files under `frontend/js/data/menu/` with `index.js` aggregator | Prevents single-file bottleneck; one file = one responsibility |
| ES Modules adopted (Phase 1) | `export` / `import` used in all data files; `type="module"` on script tag | Clean aggregation; natural module boundary; required for browser ES imports |
| Schema extended (Phase 1) | Added `isActive`, `allergenNote`, `tags`, `searchKeywords`, `imageUrl`, `subcategory`, `isGlutenFree` | Production requirements identified early; cheaper to add now than retrofit 125 objects |
| `currency` removed from item schema | Lives in `config/constants.js` as `CURRENCY = "USD"` | 125 identical strings is pure redundancy; one constant is the right home |
| `allergenNote` is `null` by default | Generic disclaimer lives in `constants.js` as `ALLERGEN_NOTE_DEFAULT`; displayed as site-wide banner | One source for the universal warning; field kept for dish-specific overrides |
| `isGlutenFree` added to schema | Boolean; Sam is SME per dish — many curries are naturally GF | Third most common dietary filter after vegan/vegetarian |
| Modifier objects have `id` field | `{ id: "mod-white-meat", label: "White meat", priceDelta: 1.00 }` | Cart state tracking needs stable identifiers; label strings are fragile if renamed |
| `spiceLevel` strings in JS → integers in DB | JS files use `"Mild"` / `"Medium"` / `"Hot"` / `null`; `seed.js` maps to `0`/`1`/`2`/`3` | Readable source data; efficient DB queries and dynamic UI rendering (pepper icons) |
| `isHalal` not in JS item objects | Restaurant-level flag; DB schema defaults `is_halal` to `TRUE` at column level | Entire restaurant is Halal; per-item flag would be identical on all 125 objects |
| Shared modifier pattern via `.map()` | Files where all dishes share allergens/modifiers use `BASE_*` object + spread | One place to change the white-meat modifier price instead of 10; teaches spread operator in context |
| `isActive` separate from `inStock` | Two distinct flags for two distinct admin operations | Hiding an item vs marking it sold out are different operations |
| Spice level on all main dishes | All à la carte and main dishes get a `spiceLevel` value; Sam is SME | Reduces friction for customers unfamiliar with Indian cuisine |
| Multi-context items get separate IDs | `lamb-curry-entree`, `lamb-curry-side`, `lamb-curry-lunch` are three objects | One object cannot cleanly represent three prices and three serving contexts |
| Roadmap expanded to 9 phases | Phases 0–8, replacing original 0–6 | Original was missing: CSS phase, ES Modules, destructuring, CORS, env vars, email, accessibility audit, security audit, CI/CD |
| `Developer_Role.md` = quality ceiling | Quality bar and output format; not a parallel phase clock | Prevents collision between its Phase 0–8 architecture playbook and this roadmap |
| `components/` directory added | `Navbar.js`, `MenuSection.js`, `MenuCard.js`, `CartItem.js`, `CheckoutModal.js` | Maps 1:1 to framework components; teaches component mindset in vanilla JS |
| `api/` service layer added | `menuService.js`, `orderService.js`, `authService.js` abstract all network calls | One file owns the URL; switching from local data to live API in Phase 6 is a one-line change |
| `state/` directory added | `cartState.js` and `authState.js` replace flat `cart.js` and `auth.js` at root | Communicates intent; teaches state separation before frameworks make it a requirement |
| `backend/config/db.js` added | Database connection config isolated from route and model files | Standard Express pattern; connection string changes in one place |
| `backend/services/aiService.js` added | Stub file for Phase 8 LLM orchestration | Isolated AI logic; route files stay clean; prompt engineering has a dedicated home |

---

*End of roadmap. This file is the single source of truth for project scope, real menu data, folder structure, and lesson sequence. Update it when decisions change — do not let it drift from the actual codebase.*
