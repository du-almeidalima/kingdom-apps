# E2E Implementation Plan — Ministry Maps

This folder is the **execution plan** for turning the behavioural catalog in
[`../../docs`](../../docs/README.md) into a running Playwright suite. It is written so that any agent (or
human) can open one work package in a fresh session and complete it without re-reading the whole project.

**Source of truth for WHAT to test:** `apps/ministry-maps/docs/` — use cases (`UC-<AREA>-NN`), journeys
(`J-NN`), priorities, seed preconditions, Firestore assertions, and testability gaps.
**Source of truth for HOW to execute:** this folder — sequencing, dependencies, page-object allocation,
and done criteria.

> **Dispatching work to agents?** Use [`agent-prompt.md`](./agent-prompt.md) — the standard,
> copy-paste-ready briefing (reading list, harness vocabulary, coordination protocol, hard rules).
> Fill in its `ASSIGNMENT` line with a WP number and give every agent **disjoint** work packages.

> **Status legend for the tracking table below:** ⬜ not started · 🔄 in progress · ✅ merged.
> When you finish a work package: check its box here, flip the `Covered` marks in
> [`../../docs/test-catalog.md`](../../docs/test-catalog.md), and commit with the message format in §4.

---

## 1. Scope & reconciliation

Every one of the **188 catalog rows** is accounted for exactly once:

| Bucket | Count | Where |
|---|---|---|
| UC entries assigned to a spec work package | 159 | phases 2–4 (WP-08 … WP-25) |
| Redirect-leg rows owned once by the WP-08 guard matrices | 9 | UC-NAV-06/07/10, UC-ASSIGN-23/24, UC-STAT-16/17, UC-USERS-16/17 |
| Already covered by existing specs (do not duplicate) | 1 + 1 | UC-TERR-37 (`territories.spec.ts`); UC-AUTH-01 (`smoke.spec.ts`, verified in WP-08) |
| Not automated | 11 | 8 OAuth manual legs + 2 fault-injection-blocked + 1 unit-only — tracked in WP-34 |
| Journeys | 8 | phase 5 (WP-26 … WP-33) |

The **11 not-automated** entries: UC-AUTH-04/05/06/07/17/18/19/20 (✋ OAuth popup — manual acceptance
checks, documented in `docs/features/auth-onboarding.md`), UC-AUTH-21 + UC-ASSIGN-21 (blocked on HX-4
fault injection), UC-USERS-12 (unit-test-only by nature).

## 2. Ground rules (read before touching any WP)

1. **No application behaviour changes.** The only app-code edits allowed anywhere in this plan are
   **additive `data-testid` attributes** (phase 1). If a spec "fails" because the app does something
   surprising, check the catalog first — most surprises are documented current behaviour that the spec
   must assert as-is (`⚠ suspected defect` entries in
   [`../../docs/testability-gaps.md`](../../docs/testability-gaps.md#3-documented-current-behaviour-vs-suspected-defects)).
   Fixing defects is a separate product decision, never part of a test WP.
2. **data-testids land separately from specs** (own WPs, own commits) — per
   `docs/README.md` guidance.
3. **Existing specs stay green.** `smoke.spec.ts` and `territories.spec.ts` are extended, never
   rewritten, and rows marked ✅/◐ in the catalog are not re-implemented.
4. **Import `test`/`expect` from `../fixtures` only.** No direct `@playwright/test` imports; no mocks;
   assert the DOM **and** Firestore in every spec (the catalog entry's "Expected persistence" is
   mandatory, not optional).
5. **Never `page.waitForTimeout`** (lint-enforced). Synchronise with web-first assertions; use
   `expect.poll`/`expect(…).toPass()` for the app's fire-and-forget writes
   (`docs/domain/data-model.md` §4.2.1).
6. **Test titles carry the ID:** `test('UC-WORK-07 — completes a visit as "Morador contatado"', …)` /
   `test('J-02 — visit feedback loop to elder', …)`.
7. **One work package = one commit (or a small commit pair: testids → specs).** Conventional messages,
   e.g. `test(e2e): add work-designation completion specs (UC-WORK-07..14)` or
   `test(e2e): add data-testid selectors to work and assign screens`.
8. **Keep artifacts in sync.** New fixture/factory/page-object → update `e2e/README.md`. Finished
   entries → flip `Covered` in `docs/test-catalog.md`. If reality diverges from a docs entry while
   implementing, fix the **docs entry**, not just the spec.

## 3. Conventions used throughout the plan

- **Selectors:** `data-testid` first (after phase 1); otherwise verbatim pt-BR text per
  `docs/domain/glossary.md`. Never "correct" pt-BR typos (`Parar criar…`, `concluidos`) or the English
  `/configuration` strings — they are asserted verbatim.
- **testid naming:** kebab-case, `<area>-<element>` (e.g. `work-item-checkbox`, `assign-city-filter`),
  matching the existing `territories-heading` style.
- **Seed vocabulary only:** `seed.factories.build*`, `seed.write`, `seed.ids`, `db.*`, `signInAs`. Raw
  `db.firestore` writes are allowed only where the docs explicitly say so (invitation links until WP-02
  lands, mid-test mutations in UC-WORK-05/J-03-leg-8).
- **Every `/work/:id` seed:** override `history: []` (or real entries) on each
  `buildDesignationTerritory` — the factory default crashes the page (UC-WORK-04). Never reuse
  `seed.ids.designation` for work tests (expired + history-less).
- **`db.collections` keys are lowercase** (`congregations|users|territories|designations`);
  `invitation_links` is read via `db.firestore.collection('invitation_links')` until WP-02 adds it to
  `Collections`.
- **`signInAs` leaves the page on `/login`** — always `page.goto(target)` afterwards (UC-AUTH-03).
- **Statistics seeds compute dates from `new Date()`** at runtime; never hardcode absolute dates for
  dynamic-period assertions.
- **Identity switches in journeys:** sign-out via
  `await page.evaluate(() => (window as any).__E2E__.auth.signOut())`, let the app land on `/login`,
  then continue (see `docs/journeys/README.md`).

## 4. Verification commands

```bash
npx playwright install chromium                  # one-time
npx nx typecheck-e2e ministry-maps               # FAST gate — run after every WP (type-checks fixtures/seeds/specs)
npx nx e2e ministry-maps                         # full suite (boots emulators + serve via webServer)
npx nx e2e ministry-maps -- tests/<file>.spec.ts # single spec, if your nx version forwards args;
# fallback: npx playwright test tests/<file>.spec.ts --config apps/ministry-maps/playwright.config.ts
```

**Definition of done for every WP:** new/changed specs pass · `typecheck-e2e` passes · full suite green
· app unit tests still green when app code was touched (`npx nx test ministry-maps` after phase-1
testid batches) · commit landed · tracking box checked · catalog `Covered` marks updated.

**Isolation check (before closing a phase):** run the suite twice back-to-back — passing twice proves
the per-test reset+seed isolates tests (no cross-test leakage, no hidden timing dependence).

## 5. Phase overview & tracking

| # | Work package | Covers | Depends on | Size | Status |
|---|---|---|---|---|---|
| **Phase 0 — Harness foundations** ([details](./phase-0-foundations.md)) | | | | | |
| WP-01 | HX-1: extra `signInAs` roles (elder, organizer, superintendent, app_admin) | unblocks 15+ rows | — | M | ⬜ |
| WP-02 | HX-2: `invitation_links` seed support | UC-AUTH-14/16, J-03 | — | M | ⬜ |
| WP-03 | HX-3: `signInAsUser(uid)` arbitrary-uid identity | UC-ASSIGN-03/04/14, UC-TERR-04, UC-STAT-13, J-08 | — | S | ⬜ |
| WP-04 | HX-5: shared spec utilities (window.open stub, whatsapp decoder, CSV reader, confirm registrar, CDK drag) | UC-TERR-21/34, UC-ASSIGN-19, UC-USERS-14, UC-WORK-19, UC-CFG-10 | — | M | ⬜ |
| **Phase 1 — Selectors & shared page objects** ([details](./phase-1-selectors-and-shared-pos.md)) | | | | | |
| WP-05 | testids batch A: auth screens, home/header, `/work/:id`, `/territories/assign` | phase-2 specs | — | M | ⬜ |
| WP-06 | testids batch B: territories dialogs, statistics, users, profile, configuration | phase-3/4 specs | — | M | ⬜ |
| WP-07 | shared POs: `ConfirmDialog`, `HistoryDialog`, `SortFilterDialog`, `HeaderComponent`, `ToastComponent` | all areas | — | M | ⬜ |
| **Phase 2 — Core user paths** ([details](./phase-2-core-user-paths.md)) | | | | | |
| WP-08 | `tests/auth.spec.ts` | UC-AUTH-01…03, 08…13, 22, 23 (+ owns 9 redirect-leg rows) | WP-05 | L | ⬜ |
| WP-09 | `tests/invite-sign-in.spec.ts` | UC-AUTH-14, 15, 16 | WP-02, WP-05 | M | ⬜ |
| WP-10 | `tests/work-designation.spec.ts` — open & complete | UC-WORK-01…14 | WP-05 | L | ⬜ |
| WP-11 | `tests/work-designation.spec.ts` — correct/reverse/affordances/expiry | UC-WORK-15…23 | WP-05, WP-04 | L | ⬜ |
| WP-12 | `tests/navigation.spec.ts` | UC-NAV-01…05, 08, 09, 11…14 | WP-05, WP-03 (NAV-08) | M | ⬜ |
| **Phase 3 — Territories admin** ([details](./phase-3-territories-admin.md)) | | | | | |
| WP-13 | `tests/territories.spec.ts` — list/search/sort extensions | UC-TERR-01…08, 33 | WP-03 (TERR-04) | M | ⬜ |
| WP-14 | `tests/territories-filters.spec.ts` | UC-TERR-09…13 | WP-06, WP-07 | M | ⬜ |
| WP-15 | `tests/territories-crud.spec.ts` | UC-TERR-14…22 | WP-06, WP-07, WP-04 (drag) | L | ⬜ |
| WP-16 | `tests/territories-alerts.spec.ts` | UC-TERR-23…32 | WP-06, WP-07 | L | ⬜ |
| WP-17 | `tests/territories-export.spec.ts` + role gating | UC-TERR-34, 35, 36 | WP-04, WP-01 | M | ⬜ |
| WP-18 | `tests/territories-assign.spec.ts` — selection | UC-ASSIGN-01…11 | WP-05, WP-07, WP-03 (03/04) | L | ⬜ |
| WP-19 | `tests/territories-assign.spec.ts` — creation & share | UC-ASSIGN-12…20, 22 | WP-04, WP-01, WP-03 (14) | L | ⬜ |
| WP-20 | `tests/territories-statistics.spec.ts` — static & counting rules | UC-STAT-01…03, 10…12 | WP-06 | M | ⬜ |
| WP-21 | `tests/territories-statistics.spec.ts` — periods & boundaries | UC-STAT-04…09, 13, 14, 15, 18, 19 | WP-06, WP-01, WP-03 | M | ⬜ |
| **Phase 4 — People & configuration** ([details](./phase-4-people-and-configuration.md)) | | | | | |
| WP-22 | `tests/users.spec.ts` | UC-USERS-01…09, 15 | WP-06, WP-07, WP-01 | L | ⬜ |
| WP-23 | `tests/users-invites.spec.ts` | UC-USERS-10, 11, 13, 14 | WP-06, WP-04 | M | ⬜ |
| WP-24 | `tests/profile.spec.ts` | UC-PROF-01…10 | WP-06, WP-07, WP-01 | M | ⬜ |
| WP-25 | `tests/configuration.spec.ts` | UC-CFG-01…13 | WP-06, WP-04, WP-07 | L | ⬜ |
| **Phase 5 — Journeys** ([details](./phase-5-journeys.md)) | | | | | |
| WP-26 | `tests/journey-admin-assign-work.spec.ts` | J-01 | WP-10/11, WP-15, WP-18/19 | L | ⬜ |
| WP-27 | `tests/journey-visit-feedback.spec.ts` | J-02 | WP-01, WP-10, WP-16, WP-20 | M | ⬜ |
| WP-28 | `tests/journey-invite-onboarding.spec.ts` | J-03 | WP-02, WP-09, WP-23 | M | ⬜ |
| WP-29 | `tests/journey-moved-alert.spec.ts` | J-04 | WP-01, WP-11, WP-16, WP-20 | M | ⬜ |
| WP-30 | `tests/journey-city-rename.spec.ts` | J-05 | WP-25, WP-13 | M | ⬜ |
| WP-31 | `tests/journey-expired-designation.spec.ts` | J-06 | WP-11 | M | ⬜ |
| WP-32 | `tests/journey-statistics-reconciliation.spec.ts` | J-07 | WP-20/21 | M | ⬜ |
| WP-33 | `tests/journey-empty-system.spec.ts` | J-08 | WP-03, WP-13, WP-18, WP-20, WP-17 | M | ⬜ |
| **Phase 6 — Final sweep** ([details](./phase-6-final-sweep.md)) | | | | | |
| WP-34 | suite hygiene, coverage marks, manual checklist, HX-4 decision | all | everything | S | ⬜ |

**Dependency notes:** phases are ordered but WPs inside a phase can be parallelised across agents as
long as the *Depends on* column is respected. WP-01/WP-02/WP-03/WP-04 are mutually independent. The two
redirect-leg dups (UC-ASSIGN-23/24, UC-STAT-16/17, UC-USERS-16/17, UC-NAV-06/07/10) are implemented
**only** inside WP-08's parametrized matrices — do not re-implement them in area specs.

## 6. Session playbook (how to execute one WP)

1. Open the phase file and read your WP block, then read the linked `docs/` entries it covers —
   they carry the exact seed preconditions, steps, pt-BR strings and Firestore assertions.
2. Create/extend page objects first (selector lists are in each WP and in
   `docs/testability-gaps.md` §1), following the existing `page-objects/territories.page.ts` pattern.
3. Write the specs; keep one `test()` per catalog row, ID-first titles.
4. `npx nx typecheck-e2e ministry-maps` → fix → run the new spec file → fix → run the full suite.
5. Commit (message format in §2.7), check the tracking box, flip catalog `Covered` marks.

## Sources

- `apps/ministry-maps/docs/` (entire behavioral catalog)
- `apps/ministry-maps/e2e/README.md`, `.ai/rules/frontend/e2e-testing.md`
- `apps/ministry-maps/e2e/tests/{smoke,territories}.spec.ts`
