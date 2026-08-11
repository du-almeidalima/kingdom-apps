# Agent Prompt — Ministry Maps E2E Implementation

> **How to use this file (for the human orchestrator):** copy everything below the horizontal rule and
> paste it as the prompt to any agent (Opencode, Gemini, Claude, Junie, …). Fill in the `ASSIGNMENT`
> line at the bottom with one or more work packages (e.g. `WP-10`, or `WP-13 and WP-14`). Give each
> agent **disjoint** WPs — the coordination protocol inside handles the rest. For phase-0/1 work
> (harness extensions, testid batches), assign those WPs first and wait for them to merge before
> dispatching dependent spec WPs.

---

# Ministry Maps E2E implementation — agent briefing

You are one of several agents implementing the Ministry Maps end-to-end test suite in parallel. The
design work is **done** — a complete behavioral catalog and an execution plan exist in this repo. Your
job is to execute **your assigned work package(s)** exactly, following the shared conventions so that
all agents' work composes without conflicts. Do not re-design, do not freelance.

## 1. Project in 60 seconds

- Nx monorepo; the app is **Ministry Maps** (`apps/ministry-maps`, Angular 21 standalone, pt-BR UI),
  backed by Firebase (Firestore, Auth).
- E2E = **Playwright + Firebase emulators** (Firestore `:8080`, Auth `:9099`). **No mocks.** Tests run
  against a real emulated backend; after UI actions you assert persistence in Firestore via the Admin
  SDK (`db.*` fixture).
- The emulator starts **empty**; an auto fixture (`resetAndSeed`) wipes and re-seeds a documented
  baseline before **every** test.
- Only two spec files exist today (`e2e/tests/smoke.spec.ts`, `e2e/tests/territories.spec.ts`) plus one
  page object (`e2e/page-objects/territories.page.ts`) — they are your style reference. Keep them green.

## 2. Mandatory reading — in this order

| # | Document | Why |
|---|---|---|
| 1 | `apps/ministry-maps/e2e/plan/README.md` | The plan: ground rules (§2), conventions (§3), verification commands (§4), tracking table (§5), session playbook (§6). |
| 2 | `apps/ministry-maps/e2e/README.md` | The harness: fixtures, `db` API, seed factories, default baseline, auth strategy, page-object pattern. |
| 3 | `apps/ministry-maps/e2e/plan/phase-*.md` → **your WP block** | Your assignment's goal, covered IDs, dependencies, files, implementation notes, acceptance criteria. |
| 4 | `apps/ministry-maps/docs/README.md` | How the behavioral catalog works (ID scheme, priorities, entry template, harness vocabulary). |
| 5 | `apps/ministry-maps/docs/domain/data-model.md` | **Read before writing any seed.** Collections, field tables, invariants (dual history, `positionIndex`, designation snapshots, numeric `visitOutcome`, `User.congregation` as `DocumentReference`). |
| 6 | `apps/ministry-maps/docs/features/<your-area>.md` | The use-case entries you must implement — each gives Actor, Route, Seed preconditions, Steps, Expected UI (verbatim pt-BR), Expected persistence, Edge cases, Priority, Gaps. |
| 7 | `apps/ministry-maps/docs/domain/glossary.md` | Verbatim pt-BR UI strings + selector guidance. |
| 8 | `apps/ministry-maps/docs/testability-gaps.md` | Missing-testid inventory, browser-level techniques (native `confirm()`, `window.open`, CSV download, OAuth popup), and the **defects you must lock in** (§3). |
| 9 | `apps/ministry-maps/docs/journeys/<journey>.md` | Only if assigned a journey WP — the executable script with hand-off assertions. |
| 10 | `.ai/rules/frontend/e2e-testing.md` | The project's binding E2E rules. |
| 11 | `AGENTS.md` (repo root) | Repo-wide conventions (kebab-case files, conventional commits, Nx usage). |

Also skim the two existing specs (`e2e/tests/smoke.spec.ts`, `e2e/tests/territories.spec.ts`) — rows
marked ✅/◐ in the catalog belong to them; extend, never duplicate.

## 3. Harness API — the only vocabulary you may use

```ts
import { test, expect } from '../fixtures';   // NEVER '@playwright/test' directly

// Seeding (before each test the baseline is auto-applied):
seed.factories.buildCongregation / buildUser / buildTerritory / buildVisitHistory / buildDesignation / buildDesignationTerritory
await seed.write({ territories: [t], designations: [d], users: [u], congregations: [c] });
seed.ids  // DEFAULT_SEED_IDS: congregation, adminUser, publisherUsers[], territories[], designation

// Firestore assertions (Admin SDK):
db.collections            // { congregations, users, territories, designations } — lowercase keys
db.historySubcollection   // 'history'
db.getDoc(collection, id) · db.getDocSnapshot(collection, id) · db.getCollectionDocs(collection)
db.getSubcollectionDocs(collection, id, sub) · db.queryWhere(collection, field, op, value)
db.firestore / db.auth    // raw escape hatches (invitation_links until WP-02 merges; mid-test mutations)

// Auth:
await signInAs('admin' | 'publisher');  // + 'elder' | 'organizer' | 'superintendent' | 'app_admin' IF WP-01 merged
await signInAsUser(uid);                // IF WP-03 merged — check e2e/fixtures/auth.fixture.ts
// signInAs leaves the page on /login BY DESIGN — always page.goto(target) afterwards.
// Identity switch mid-test: await page.evaluate(() => (window as any).__E2E__.auth.signOut());

// Invitation links: seed via raw db.firestore.collection('invitation_links') (underscore!)
// until WP-02 merges; afterwards via seed.factories.buildInvitationLink.
```

Current capabilities may have grown since this prompt was written — check what exists in
`e2e/config/auth.config.ts` (`ROLE_UIDS`), `e2e/seed/factories/`, `e2e/utils/` before working around an
assumed gap. If something your WP depends on is genuinely missing and building it is **not** your
assignment, **stop and report** (see §7).

## 4. Coordination protocol (multi-agent safety — follow exactly)

1. **Verify availability.** In `e2e/plan/README.md`'s tracking table your WP must be ⬜. If it is 🔄 or
   ✅, **stop** and tell the orchestrator.
2. **Check for in-flight work.** `git status`, `git log --oneline -15`, and open branches. High-
   contention files: shared spec files (`work-designation.spec.ts`, `territories.spec.ts`,
   `territories-assign.spec.ts`, `territories-statistics.spec.ts`), shared page objects,
   `e2e/seed/default.seed.ts`, `e2e/config/auth.config.ts`, `e2e/plan/README.md`,
   `docs/test-catalog.md`. If another agent's unmerged work touches the same file as your WP, stop and
   tell the orchestrator before starting.
3. **Claim.** Your first commit marks your WP(s) 🔄 in the tracking table (nothing else in that file).
   Never touch rows that aren't yours.
4. **Work in append mode on shared files.** In existing spec files, add new `test.describe` blocks;
   never reorder, rename, reformat, or refactor existing tests. In `e2e/README.md` and
   `docs/test-catalog.md`, touch only your own rows/sections.
5. **Finish.** Update your WP row(s) 🔄 → ✅; flip the `Covered` cell in `docs/test-catalog.md` for
   **only** the UC/J IDs you implemented.

## 5. Hard rules (violations = rejected work)

1. **No application behavior changes.** The only app-code edits permitted anywhere in this program are
   additive `data-testid` attributes — and only inside WP-05/WP-06. If your WP is not one of those, app
   code is read-only for you.
2. **Assert DOM _and_ Firestore in every spec.** The catalog entry's *Expected persistence* is
   mandatory, not optional.
3. **Never `page.waitForTimeout`** (lint-enforced). Synchronize with web-first assertions; wrap
   persistence assertions in `expect.poll`/`expect(…).toPass()` — many app writes are fire-and-forget
   (`docs/domain/data-model.md` §4.2.1).
4. **Test titles start with the ID:** `test('UC-WORK-07 — completes a visit as "Morador contatado"', …)`.
5. **Every `/work/:id` seed** overrides `history: []` (or real entries) on each
   `buildDesignationTerritory` — the factory default crashes the page (UC-WORK-04). Never reuse
   `seed.ids.designation` for work tests (it's expired, blocking, and unopenable).
6. **pt-BR strings verbatim**, accents and source typos included (`Parar criar…`, `concluidos`,
   `Para ordernar…`). `/configuration` is an **English** screen — assert its English strings verbatim
   too. Never "fix" either.
7. **Defects are locked in, not fixed.** Every `⚠ suspected defect` entry asserts **today's reality**
   exactly as documented in `docs/testability-gaps.md` §3 (e.g. badges hidden when `note` is empty,
   user-edit form disabled for non-APP_ADMIN, `recentHistory` overwritten to `length === 1`, publisher
   can edit cities). Do not write the "intended" assertion.
8. **Never click `Entrar com uma conta do Google`** and never attempt the OAuth popup. Popup legs
   (UC-AUTH-04/05/06/07/17/18/19/20) are manual-only and out of scope for automation.
9. **Duplicate-owned rows:** the anonymous/publisher redirect legs across feature docs are implemented
   **once**, inside WP-08's parametrized matrices in `tests/auth.spec.ts`. If a catalog row says
   "(dup. of UC-AUTH-1x leg — own one copy)", do not re-implement it in your area spec.
10. **Statistics seeds compute dates from `new Date()`** at runtime — never hardcode absolute dates for
    dynamic-period assertions.
11. **Stay inside your assignment.** No drive-by fixes, no extra WPs, no renumbering of IDs, no new
    dependencies, no edits to `docs/` other than your catalog `Covered` cells (and rule 12).
12. **If reality contradicts a docs entry:** fix the docs entry (with a short note) in the same commit
    as the spec — the catalog must stay truthful. If it contradicts the *plan*, stop and report instead.

## 6. Execution loop

1. Read (§2, in order). 2. Claim (§4.3). 3. Create/extend page objects first — follow
   `e2e/page-objects/territories.page.ts`: `readonly` locators assigned in the constructor via
   `page.getByTestId(...)`/`getByRole(...)`, no baked-in waits beyond the object's own effect. 4. Write
   specs translating each catalog entry 1:1 (seed → steps → UI assertion → persistence assertion).
   5. `npx nx typecheck-e2e ministry-maps` → fix. 6. Run your spec file
   (`npx nx e2e ministry-maps --no-tui -- tests/<file>.spec.ts`, fallback
   `npx playwright test tests/<file>.spec.ts --config apps/ministry-maps/playwright.config.ts`) → fix.
   7. Full suite `npx nx e2e ministry-maps  --no-tui` → green. 8. (Only if you touched app code — WP-05/06:
   `npx nx test ministry-maps` and `npx nx lint ministry-maps` green.) 9. Bookkeeping (§4.5).
   10. Commit.

One-time environment need: `npx playwright install chromium`. The `e2e` target boots emulators + the
app via Playwright's `webServer`; you never start servers manually.

## 7. Stop and report instead of guessing when…

- Your WP is 🔄/✅, or depends on a WP that isn't merged (check the *Depends on* column first).
- A role/factory/utility you need doesn't exist and creating it is not your assignment.
- A spec fails because the app behaves differently than the catalog entry in an **undocumented** way.
- You're about to edit a file touched by another agent's unmerged branch.
- A defect-fixing urge strikes (§5.7 — that's a product decision, not your call).

Report: what you found, the exact catalog/WP reference, and what you need. Then stop.

## 8. Definition of done

- [ ] Every catalog row in your WP's *Covers* list has exactly one green `test()` with an ID-first title
      (or a documented `test.fixme` with reasoning, where the WP allows it).
- [ ] New/changed specs pass; `typecheck-e2e` passes; **full suite green** (run twice if you suspect
      timing sensitivity).
- [ ] App unit tests + lint green if (and only if) you touched app code.
- [ ] No `waitForTimeout`, no direct `@playwright/test` imports, no mocks, no app behavior changes.
- [ ] Tracking-table row(s) ✅; your rows' `Covered` cells updated in `docs/test-catalog.md`.
- [ ] New fixtures/factories/utils/page objects documented in `e2e/README.md`.
- [ ] Commit(s) landed with conventional messages (below). No push/PR unless the orchestrator asks.

## 9. Commit format

One WP = one commit (phase-1 testid WPs: one commit for the attributes). Conventional, scoped:

```
test(e2e): add work-designation completion specs (UC-WORK-07..14)
test(e2e): add data-testid selectors to work and assign screens (WP-05)
test(e2e): extend signInAs with elder/organizer/superintendent/app_admin roles (WP-01)
```

---

## ASSIGNMENT

**Your work package(s):** `phase 4`

Start at §2 (mandatory reading) and follow the execution loop in §6. Implement only the assigned
package(s).
