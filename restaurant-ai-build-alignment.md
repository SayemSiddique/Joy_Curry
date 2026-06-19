# Joy Curry & Tandoor — Master Alignment Document

> **Purpose.** This is the governing document for how we work together on this project. It encodes our operating principles, where AI genuinely belongs in the product, the locked answers to every architectural question, and the binding rules for every coding session. Update it when decisions change — never let it drift from reality.
>
> **Status:** ACTIVE — LOCKED. All §2 decisions answered and committed. Code is in progress (Phase 1, M1.5).
>
> **Core principle:** Fundamentals-first, AI-augmented. Sam writes and can defend the core JavaScript. Claude is the tutor and, later, a product feature — never the silent author. "AI-augmented" means thoughtful integration, not AI writes everything.

---

## 0. Governing Principles

These principles govern every decision in the project. They are not suggestions.

| Principle | What it means in practice |
|---|---|
| **LLMs are tools, not oracles** | The levers are context, constraints, and verification. We always give the model structure. "Make it better" is not a prompt. |
| **Jagged intelligence** | Trust AI where output is checkable. Distrust it for arithmetic, state-tracking, current facts, and safety-critical judgment. AI does not manage inventory. |
| **Spec before code** | A one-paragraph spec (goal, inputs, outputs, done criteria) is written and approved before any feature is implemented. |
| **Agile, small chunks** | Build and verify one slice at a time. Never waterfall a whole feature. |
| **Verification loop** | Every feature ships with a way to prove it works — manual test steps, a small script, or for AI features, an eval set. "It rendered once" is not done. |
| **Persist context** | This file plus the roadmap decisions log replaces starting cold each session. |
| **Start simple** | Plain JS first. Reach for an LLM or library only when the simple version provably falls short — and state why. |
| **The eval is the product** | An AI feature is not done when it demos once. It is done when it works reliably across a test set and its failure modes are known. |
| **Understanding is non-negotiable** | Sam must be able to read, debug, and explain every line committed to the repo. Code that cannot be defended does not ship. |

---

## 1. AI Integration Analysis — Where AI Actually Belongs

Features ranked by real value ÷ (effort × risk) for a learning project building a real restaurant site. Not by how impressive they sound.

### Tier A — High value, good learning, bounded risk

**A1. Natural-language menu search / filter assistant**
"Show me gluten-free mains under $15 that aren't spicy" → filtered results.
- **Phase placement:** Phase 8 only. The plain JS filter (Phase 3) must be built and working before the LLM layer is added. The LLM converts free text → a structured filter object; the JS does the actual filtering.
- **Start non-AI:** `Array.filter`, `map`, predicates over the menu array. This is the M3.5 lesson.
- **Then augment:** LLM call that parses intent into a structured filter. The LLM only parses — your JS executes. Verifiable and bounded.
- **Teaches:** arrays/objects, higher-order functions, async/fetch, JSON, structured-output prompting.

**A2. Menu Q&A assistant grounded in the menu (mini-RAG)**
"Does the Chicken Tikka Masala contain cashews?" answered only from menu data.
- **Phase placement:** Phase 8, after A1 is eval-backed.
- **Grounding is mandatory:** the model answers strictly from menu JSON passed in context. It must refuse or defer when data is missing — never guess.
- **⚠ Safety flag:** allergen and dietary answers are safety-critical. The LLM is **never** the source of truth. It surfaces the structured `allergens` field verbatim and always displays: "Confirm with staff before ordering if you have a severe allergy." This feature gets its own eval set testing for false negatives specifically.
- **Teaches:** context construction, grounding/retrieval basics, hallucination control, eval design.

### Tier B — Good value, admin-side, low stakes

**B1. Dish description generator (admin only)**
Generate menu descriptions from a few keywords. A human approves before publishing.
- **Phase placement:** Phase 8 alongside the admin UI (M7.9).
- Low risk (human-in-the-loop, never user-facing live).
- **Teaches:** forms, state, prompt templates, the approve-before-publish pattern.

**B2. Review summarization / sentiment (admin dashboard)**
Summarize customer reviews into themes.
- **Phase placement:** Post-Phase 8 if reviews exist; defer until there is real data to summarize.
- **Teaches:** batching, summarization prompts, displaying derived data.

### Tier C — Defer; simpler approaches win first

**C1. "Pairs well with" recommendations**
On a menu of ~125 items, hand-written rules or simple co-occurrence tables beat an LLM at zero cost. Build the heuristic version first. Only revisit an LLM approach if the menu grows large and rules become unmaintainable.

**C2. Conversational ordering assistant**
High complexity: takes actions (writes to a DB), needs confirmation steps, guardrails, and careful error handling. Revisit after Tier A is eval-backed and deployed.

### Tier D — Not an AI problem

**D1. Inventory management — NOT an AI feature.**
CRUD plus optionally forecasting. LLMs are weak at arithmetic and state-tracking. If inventory is built, it is a database / data-modelling exercise. An LLM will not touch it.

**D2. Dynamic pricing — out of scope.**
An optimisation problem, not an LLM problem. Carries UX, ethical, and fairness risk. Not on the roadmap.

> **Build order:** A1 first (Phase 8). A2 second (Phase 8, after A1 passes its eval). Do not build more than two AI features until both are eval-backed and deployed. API keys for all AI features live in `.env` on the backend — never in the browser.

---

## 2. Locked Decisions — Architecture & Goals

All questions answered and committed. Do not re-open these without a documented reason.

### Scope & intent

**1. Real restaurant or portfolio piece?**
Real restaurant with real customers. Joy Curry & Tandoor, 148 East 46th St, NYC, est. 1994. The full security bar applies — authentication, input validation, parameterized queries, HTTPS, rate limiting. This is not a side project.

**2. Primary goal: learn deeply or ship fast?**
Learn JavaScript deeply. If learning and shipping conflict, learning wins. There is no deadline. Quality and depth take priority at every decision point.

### Architecture & stack

**3. Frontend framework?**
Vanilla JS through Phase 8. No React, Vue, or other framework until Phase 8 is complete and we can evaluate with full information. The vanilla JS structure is deliberately component-minded (`components/`, `state/`, `api/` directories) so migration is a syntax change, not a structural rebuild.

**4. Backend?**
Real Node.js + Express backend. Required for auth, orders, and AI features (API keys must live server-side). Built in Phase 5.

**5. Where does menu data live?**
- Phase 1: JS category files under `frontend/js/data/menu/` (17 files + `index.js`)
- Phase 5: seeded into SQLite via `backend/db/seed.js`
- Phase 6 onwards: frontend fetches from `GET /api/menu` — local files no longer used by production code

**6. Deploy target?**
- Frontend: Vercel
- Backend + database: Render
- Environment variables set in each provider's dashboard — never hardcoded

### AI features

**7. First AI feature?**
A1 — natural-language menu search / filter assistant. Implemented in Phase 8 after the plain JS filter (M3.5) is working and verified.

**8. LLM provider?**
Anthropic (Claude API). *(API key and hard spending cap — still to be set up before Phase 8.)*

**9. "Working" definition for A1?**
*(Still to define before Phase 8 begins — becomes the eval target, e.g., "correctly parses 9/10 test queries into the right filter object.")*

**10. Monthly API budget cap?**
*(Still to confirm before Phase 8. Even $5/month is a valid cap — we design within it.)*

---

## 3. Collaboration Directives — Binding Rules for Every Session

These apply to every coding session without exception. If a directive and a request conflict, the conflict is named before proceeding.

### Teaching & understanding (highest priority)

- **D1 — Teach at the point of use.** Before or as any JS concept is introduced: what it is, why we're using it here, and what the simpler alternative looks like. No unexplained constructs.
- **D2 — No silent magic.** If something Sam hasn't learned yet is needed, it gets flagged explicitly: "New concept: `async/await` — here's the two-line version of why."
- **D3 — Explain-it-back checks.** At the end of each feature, Sam explains the core logic or gets a brief quiz. If it can't be defended yet, we slow down. We do not proceed on code Sam cannot explain.
- **D4 — Sam writes the core.** For fundamentals-bearing code (filters, DOM, state, cart logic), Claude guides and Sam types. Claude writes boilerplate, config, and scaffolding — the parts where the learning isn't. Sam's effort goes where the learning is.

### How we build

- **D5 — Spec before code.** For each feature: one-paragraph spec (goal, inputs, outputs, done criteria), wait for approval, then implement.
- **D6 — Small, reviewable chunks.** Build and verify one slice at a time. Never a whole feature in one dump.
- **D7 — Start simple.** Plain JS solution first. Add an LLM or library only after the simple version provably falls short — and state why.
- **D8 — Verification loop on everything.** Every feature ships with a way to check it: manual test steps, a small test script, or for AI features, an eval set.

### AI-specific discipline

- **D9 — AI is never the source of truth for safety-critical data.** Allergens, dietary flags, and pricing accuracy are served from the database, not from LLM output. The LLM surfaces structured data and adds a disclaimer. Allergen-adjacent features get explicit eval sets testing for false negatives.
- **D10 — Secrets server-side only.** API keys live in `.env`. `.env` is in `.gitignore` from commit one. Keys are never in browser-side code, never hardcoded in source files, never committed to GitHub. This is non-negotiable and applies from Phase 0.
- **D11 — Cost awareness.** When an LLM call is added, the rough token and cost implication is stated. The cheapest adequate model is used. Caching is applied where sensible. We build within the confirmed budget cap.
- **D12 — Prompt-injection awareness.** Any user-supplied text that reaches an LLM is treated as untrusted input. What the model can do with it is constrained at the prompt level.

### Honesty & epistemics

- **D13 — Push back.** If a request is scope creep, the wrong tool, or based on a shaky assumption, Claude says so plainly with reasoning. Agreement for the sake of agreement is a failure mode.
- **D14 — Flag uncertainty and verify.** For anything that could have changed (API syntax, library versions, current best practice), uncertainty is stated and sources are checked. No fabrication.
- **D15 — Own mistakes.** When something is wrong, it is corrected directly without excessive apology. The gotcha goes in the decisions log after the second occurrence.

### Production code

- **D16 — Two modes, never mixed.**
  - *Lesson / learning mode:* one concept, analogy first, minimal code, Joy Curry connection, one hands-on task. Used for all teaching and code review.
  - *Production code mode:* VP of Engineering output format from `Developer_Role.md`. Used when generating real repository code. Declared explicitly with: `🏗️ Production code mode active — VP of Engineering standard applies.`
  - Never generate production code in lesson mode or lesson content in production code mode. If the context is ambiguous, ask.

### Project hygiene

- **D17 — Decisions log is maintained.** Every significant choice and every caught bug (after its second occurrence) goes into the roadmap Section 10 decisions log. We do not relitigate locked decisions without a documented reason.
- **D18 — Legible-to-skeptic artifacts.** Each milestone produces: code Sam can explain, a brief README or doc note, a manual test or eval, and a one-line cost note where AI is involved.

---

## 4. Decisions Log

All decisions made and locked. Full canonical log lives in `JoyCurry_Roadmap.md` Section 10 — that is the single source of truth. Key project-level decisions that are governance or collaboration concerns (not schema/architecture) are recorded here.

| Decision | What was decided | Why |
|---|---|---|
| Project scope | Real restaurant, real customers — full security bar applies | Joy Curry & Tandoor is a live business; this is not a portfolio demo |
| Learning > shipping | If depth and speed conflict, depth wins | No deadline; skill-building is the primary output |
| Vanilla JS first | No framework until Phase 8 review | Frameworks hide the browser mechanics we need to understand first |
| AI features deferred to Phase 8 | A1 and A2 built only after plain JS equivalents work and the backend is live | AI augments a working system — it does not replace understanding the system |
| AI keys server-side always | All LLM API keys in `.env` on the backend; never in browser code | Exposing keys in frontend code leaks them to any visitor viewing source |
| Allergen answers are never LLM-only | LLM surfaces structured DB field + always shows confirm-with-staff disclaimer | Safety-critical data; a hallucination about a nut allergy can cause real harm |
| Deploy target | Vercel (frontend) + Render (backend + DB) | Standard pairing for this stack; both have free tiers for learning |
| First AI feature | A1 — natural-language menu search — Phase 8 | Highest value, most bounded, directly extends the filter work already done |
| LLM provider | Anthropic (Claude API) | *(API key and spending cap to be confirmed before Phase 8)* |
| A1 "working" definition | *(To be defined before Phase 8 — becomes the eval target)* | Eval target must be concrete before building |
| Monthly API budget | *(To be confirmed before Phase 8)* | We design the caching and model-selection strategy within this cap |

---

*End of alignment document. This file governs how we work. `JoyCurry_Roadmap.md` governs what we build and where we are. Both must stay current — update them when decisions change.*
