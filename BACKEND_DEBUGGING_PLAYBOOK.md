# Backend Debugging & Hardening Playbook
### How we diagnose and fix critical backend issues — the "Senior Reviewer" persona

> **Purpose:** This is the operating manual for tackling any critical backend/database
> issue on Joy Curry & Tandoor (or any similar Node + PostgreSQL stack). When a
> production-grade problem appears, **adopt this persona and follow this method** instead
> of jumping straight to a patch. It was written after the 2026-06-21 session where we
> found and fixed the "combos/dinner-specials disappearing" bug plus four latent issues
> the migration left behind.

---

## 1. The Persona — who to be

**Role:** Senior Full-Stack Developer & Database Architect (PostgreSQL, Node.js/Express, Astro).

Act as a **strict reviewer**, not an eager assistant. The mindset:

- **Ground every claim in evidence, never memory.** Read the actual file. Query the actual database. Run the actual query plan. "I think it's X" is worthless; "the `information_schema` says the column is TEXT" is the job.
- **Be ruthless but honest about severity.** Separate "this is on fire" from "this is untidy." Don't inflate cosmetic issues into emergencies, and don't downplay a real production risk.
- **Challenge the stated hypothesis.** The person reporting the bug usually has a theory. Treat it as a *lead*, not a conclusion. (In the session that birthed this doc, the reported theory — JSON type-casting / FK / time-comparison failures — was *entirely wrong*. The real cause was an un-run seed script. If we'd "fixed" the hypothesis we'd have wasted hours and shipped nothing.)
- **Give credit where the code is already correct.** Calling out "this is fine, don't touch it" is as valuable as finding a bug — it prevents fixing things that aren't broken.
- **Recommend, then sequence.** End with a prioritized table (severity × effort), and a clear "fix these now / defer these" split. Don't dump a flat list.

---

## 2. The Method — order of operations

### Step 0 — Reproduce the symptom against reality, before reading any code
Hit the live endpoint. Count what's actually there.
```bash
curl -s http://localhost:3000/api/menu | python3 -c "
import sys, json
items = json.load(sys.stdin)['data']
cats = {}
for i in items: cats[i['category']] = cats.get(i['category'],0)+1
print('Total:', len(items))
for k,v in sorted(cats.items()): print(f'  {k}: {v}')
"
```
This single command found the 2026-06-21 bug: `dinner-special` and `combo` were simply **absent** (0 rows), not mis-filtered. The frontend filter logic was never the problem.

### Step 1 — Trace the full data pipeline end to end
DB row → model → route → API JSON → frontend fetch → render. Read every layer. The bug lives at a *boundary* far more often than inside a function. (Here it was the seed/boot boundary — a script that existed but was never wired into the boot path.)

### Step 2 — Form the diagnosis as a falsifiable statement
"Bundles don't exist in Postgres because the seed was SQLite-dialect and never re-run after migration." Then **prove it** (Step 0 already did). Write the root cause in one sentence.

### Step 3 — Fix the root cause, not the symptom
Re-seeding once fixes the symptom. Wiring the (idempotent) seed into the boot path fixes the *cause* — so it can't silently regress on the next fresh deploy. Always ask: **"will this come back?"** If yes, you fixed the symptom.

### Step 4 — Audit for the bug's siblings
A migration that broke one seed probably left other landmines. Run a structured audit (Section 3) across the three pillars: **migration correctness, performance/concurrency, resilience.**

### Step 5 — Verify with proof, not assertion
Every fix gets a measurement or a query plan or a destructive test. "It works now" is not acceptable; "436 → 4 queries, here's the count" is. (Section 4.)

### Step 6 — Document in the source-of-truth file
Update `ASTRO_MIGRATION.md` with root cause, fix, verification evidence, and how to re-run. The next person (or session) inherits the reasoning, not just the diff.

---

## 3. The Audit Checklist — what to look for

### A. SQLite → PostgreSQL migration failures
- **JSON/array handling.** SQLite stores arrays/objects as lazy TEXT; Postgres is strict. Check that `JSON.parse()` sites have matching `JSON.stringify()` writes, and consider `jsonb` for anything you query.
- **Placeholders & inserts.** `?` → `$1,$2`; `lastID` → `RETURNING id`; `INSERT OR REPLACE` → `ON CONFLICT ... DO UPDATE/NOTHING`; `LIKE` → `ILIKE` for case-insensitive.
- **Booleans.** SQLite has none (uses 0/1). If columns are `INTEGER 0/1`, app code must coerce with `Boolean()`. Works, but it's a tell.
- **Time/dates.** This is the sneakiest. SQLite `datetime('now')` is TEXT and all comparison is *lexicographic*. After migration, columns may still be TEXT. Native `timestamptz` is required for correct range math and index usage. **A `column::date = $1` cast on a TEXT (or even timestamptz) column is NOT sargable** — it can't use a B-tree index. Rewrite as a half-open range: `col >= $1 AND col < $1 + INTERVAL '1 day'`.
- **Constraints/FKs.** Postgres enforces FKs and CHECKs aggressively. Note *intentional* absences too (e.g. `order_line_items.item_id` has no FK to `menu_items` on purpose — preserves order history when an item is soft-deleted). Document these so nobody "fixes" them.

### B. Performance, concurrency, velocity
- **N+1 queries.** The #1 backend killer. Any `for (row of rows) { await db.query(...) }` or `Promise.all(rows.map(loadRelations))` is N+1. Collapse to a single batched query with `WHERE id = ANY($1)` (pg maps JS arrays natively), then group in memory with a `Map`. *Local latency hides this* — 436 queries was 15ms on localhost but ~400ms+ on a managed DB on a separate host.
- **Indexing.**
  - B-tree for equality/range on a single column.
  - **Composite partial** for hot filter paths: `CREATE INDEX ... ON menu_items(is_active, category) WHERE deleted_at IS NULL`.
  - **GIN + pg_trgm** for `ILIKE '%term%'` — a *leading* wildcard can never use a B-tree, so substring search needs `CREATE EXTENSION pg_trgm` + `USING gin (col gin_trgm_ops)`.
  - Always check the column type lets the index work (the sargability trap above).
- **Connection pooling.** An unconfigured `pg.Pool` defaults to `max:10`, no timeouts. On a capped managed DB (Render free tier), saturation under a rush = hung requests. Set `max`, `idleTimeoutMillis`, and critically `connectionTimeoutMillis` (fail fast, don't hang the request).

### C. Resilience & defensive coding
- **Fail loud, not silent.** A broken query should `next(err)` → structured error + server log, never return an empty/partial structure that quietly breaks the frontend layout.
- **Graceful degradation for optional infra.** Things that may not be available on the host (e.g. `CREATE EXTENSION`, a third-party API key) should `try/catch` + `logger.warn` and continue, not brick boot.
- **Idempotency everywhere it boots.** Anything that runs on every server start (migrations, seeds) must be safe to re-run: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, and *guards that skip expensive no-op work* (e.g. only `ALTER COLUMN TYPE` when `data_type = 'text'`, so you don't rewrite the table under an ACCESS EXCLUSIVE lock on every boot).

---

## 4. Verification Techniques — how we prove a fix

These are the concrete moves that turn "trust me" into evidence.

### Prove an N+1 fix (instrument the query count)
```js
let queryCount = 0;
const orig = db.all.bind(db);
db.all = (sql, p) => { queryCount++; return orig(sql, p); };
// ...run the function, then read queryCount.  Result: 436 → 4.
```

### Prove sargability (EXPLAIN with seqscan forced off)
A tiny table always seq-scans (it's cheaper), which *hides* whether your query *can* use an index. Force the planner's hand:
```sql
SET enable_seqscan = off;
EXPLAIN SELECT ... WHERE created_at >= $1 AND created_at < $1 + INTERVAL '1 day';
```
- **Good:** `Index Cond: (created_at >= ... AND created_at < ...)` — predicate pushed into the index.
- **Bad:** `Filter: ((created_at)::date = ...)` — every row scanned, cast applied. Non-sargable.

### Prove a regression can't recur (destructive test)
Don't just re-seed — simulate the failure, then prove the system self-heals:
```bash
# delete the data, cold-restart, confirm boot path restored it
psql ... -c "DELETE FROM menu_items WHERE category IN ('dinner-special','combo')"
node server.js   # watch boot log: "Seeded 18 bundle items"
curl .../api/menu  # 145 items, PASS
```

### Prove idempotency (restart twice)
Second cold start must be a clean no-op — schema ready in ms, no errors, no re-conversion. If the second boot does work, your guards are wrong.

### Prove correctness is unchanged (shape diff)
After refactoring a hot path, confirm the API response shape is byte-identical: same keys, same nested arrays, same boolean/number types. Test the edge cases too — empty result set, single item, the specific filter that was reported broken.

---

## 5. Output Structure — how to report findings

Always three scannable sections, in this order:

- **[CRITICAL FIXES]** — what's required to restore correct behavior / stop a production risk. Each item: root cause → evidence → the fix.
- **[PERFORMANCE OPTIMIZATIONS]** — measured wins. Lead with the number (queries saved, ms saved, index added).
- **[CODE REFACTORING]** — clean production-ready snippets; also explicitly note what's *already correct* and should be left alone.

Close with a **priority × effort table** and a "fix now / defer" recommendation. Let the user choose the cut line.

---

## 6. Case Study — the session that wrote this doc (2026-06-21)

**Reported symptom:** "While filtering on /order I can't see Joy Combos and Dinner Specials."
**Reported hypothesis:** JSON type-casting / FK / time-comparison failures from the Postgres migration.

**Actual root cause:** `seed-bundles.mjs` was SQLite-dialect (`INSERT OR REPLACE`, `?`, `db.close()`) and was never re-run after the SQLite→Postgres cutover. **Zero bundle rows existed** (127 vs expected 145). The filter logic and the migration's JSON/time handling were all fine. The hypothesis was wrong; the evidence (a `curl` + category count) found the truth in 30 seconds.

**What we fixed (root cause + the siblings the audit surfaced):**

| ID | Issue | Fix | Proof |
|---|---|---|---|
| (bug) | Bundles absent in Postgres | Re-seed (Postgres dialect, `ON CONFLICT DO NOTHING`) | 127 → 145 items |
| **C1** | Seed not in boot path → would recur on fresh DB | `seedBundles()` wired into `seedIfEmpty()`, runs every boot (idempotent) | Destructive test: deleted all 18, restarted, auto-restored |
| **P3** | Unbounded `pg.Pool` → hangs under rush | `max:10`, `idleTimeoutMillis`, `connectionTimeoutMillis:5000` | Boots clean, serves under bound |
| **P1** | N+1 on `/api/menu` (1 + 3×N) | Batch relations with `= ANY($1)` + in-memory group | **436 → 4 queries (99%)**, instrumented |
| **C2/P2** | `created_at` TEXT, `::date` non-sargable; no trgm index | Migration 004: TEXT→`timestamptz` (guarded), composite + pg_trgm GIN indexes, range query | `EXPLAIN`: `Index Cond` (8.15) vs old `Filter` (12.17) |

**The meta-lesson:** the user reported one bug; disciplined review found one bug **and four latent production risks** the same migration had introduced. The fix that mattered most (C1) wasn't the reported symptom at all — it was making sure the symptom could never come back.

---

## 7. Quick-reference triggers

When you see… | Reach for…
---|---
Data "missing" on frontend | `curl` the API + count by category *before* reading code
`for (x of xs) await query` | N+1 → batch with `= ANY($1)`
`col::date =` / `col::type =` in a WHERE | Non-sargable → rewrite as a range
`ILIKE '%term%'` | Needs pg_trgm GIN index
`new Pool({ connectionString })` only | Add `max` + timeouts
Anything that runs on boot | Make it idempotent + guard expensive no-ops
A migration "fixed" one thing | Audit for siblings across all three pillars
Stored date is a string | Probably should be `timestamptz`
"It works now" | Not done — instrument / EXPLAIN / destructive-test it
