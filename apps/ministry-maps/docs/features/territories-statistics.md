# Territories statistics (`UC-STAT`)

This document describes the behavioural use cases for the `/territories/statistics` screen, where congregation leaders can monitor territory coverage and visit metrics.

**Route:** `/territories/statistics`
**Actors:** `ADMIN`, `ELDER`, `ORGANIZER`, `SUPERINTENDENT`, `APP_ADMIN` (Publishers are redirected).

## How data is loaded

The page fetches all territories **and their visit history in a single collection-group query**
(`FirebaseTerritoryDatasourceService.getAllByCongregation(congregationId, { getHistory: true })`,
see [`../domain/data-model.md §4.8`](../domain/data-model.md#48-statistics-history-resolution-one-collection-group-query)):
one `collectionGroup('history')` read filtered by `congregationId` and `date >= now - 1 year`, with
results grouped per territory. This is what keeps the page fast on congregations with significant
history — there is no per-territory subcollection query.

Two properties follow from this design:

- Visit documents must carry the `congregationId`/`territoryId` stamps to be counted. New visits are
  stamped by the work page write-back, seeded visits by the E2E seeder, and legacy documents by the
  one-time `backfill:history-stamps` script (see `apps/ministry-maps/docs/2026-08-statistics-deployment-plan.md`).
- Every metric on this page only sees visits from the **last year**; older visits exist in Firestore
  but are outside the query window.

## Testability gaps (summary)

- **Missing Selectors:** No `data-testid` on the main heading, city filter `<select>`, period filter `<select>`, or any individual metric tile. Selectors must rely on verbatim text or DOM structure.
- **Harness Extensions:** `signInAs` fixture only supports `'admin'` and `'publisher'`. Roles like `ELDER`, `ORGANIZER`, `SUPERINTENDENT`, and `APP_ADMIN` require harness extensions to be testable.

### Gerais (Static totals)

#### UC-STAT-01 — Displays static totals for all cities
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** default baseline seed (3 territories: São Paulo x2, Osasco x1)
- **Steps:** 1. sign in as admin → 2. navigate to `/territories/statistics` → 3. observe the "Gerais" section
- **Expected UI:** heading "Gerais"; tiles with "Territórios: 3", "Pessoas: 3", "Estudos bíblicos: 1", "Mudaram: 0"
- **Expected persistence:** `db.getCollectionDocs(db.collections.territories)` has 3 documents; sum of `peopleQuantity` (defaulting to 1 if missing or 0) is 3; exactly 1 doc has `isBibleStudent: true`
- **Edge cases:** territory with `peopleQuantity: 0` counts as 1 person (⚠ suspected defect); missing `peopleQuantity` counts as 1
- **Priority:** P0 · **Gaps:** no data-testids

#### UC-STAT-02 — Filters static totals by city
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** default baseline seed
- **Steps:** 1. navigate to statistics → 2. select "São Paulo" in the city `<select>`
- **Expected UI:** "Territórios: 2", "Pessoas: 2", "Estudos bíblicos: 1", "Mudaram: 0"
- **Expected persistence:** `db.queryWhere(db.collections.territories, 'city', '==', 'São Paulo')` returns 2 documents
- **Edge cases:** selecting "Todas" restores the totals from UC-STAT-01
- **Priority:** P1 · **Gaps:** no data-testids

#### UC-STAT-03 — Displays "Moved" count from unresolved-MOVED visits in the fetched history
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** default baseline; plus 1 territory whose `history` contains a visit with `visitOutcome: 2` (MOVED) and `isResolved: false` (the seeder stamps the subcollection docs)
- **Steps:** 1. navigate to statistics
- **Expected UI:** "Mudaram: 1"
- **Expected persistence:** the `history/{visitId}` doc carries `congregationId === seed.ids.congregation` and `territoryId === <territory id>` (the stamps that make it visible to the collection-group query); `recentHistory` also reflects the entry, but the count does not depend on that
- **Edge cases:** if `isResolved: true`, the count is 0; a visit older than 1 year is outside the query window and never counts
- **Priority:** P1 · **Gaps:** no data-testids

#### UC-STAT-03b — "Moved" counts an unresolved MOVED beyond the last 5 visits
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** 1 territory with six visits within the last year: five newer `NOT_ANSWERED` visits (weekly) fill `recentHistory`, plus one unresolved `MOVED` dated ~2 months ago — pushed out of `recentHistory` but inside the query window
- **Steps:** 1. navigate to statistics
- **Expected UI:** "Mudaram: 1" — the count derives from the fetched full history, not from the capped `recentHistory`
- **Expected persistence:** parent doc's `recentHistory` has length ≤ 5 and excludes the MOVED entry; the `history` subcollection holds all 6 docs
- **Priority:** P1 · **Gaps:** no data-testids

### Por período (Dynamic metrics)

*Note: All dynamic periods start at the 1st day of the calculated month. Tests must seed history dates using `new Date()` arithmetic relative to the current execution time. Baseline history (2024) is ignored by all periods today.*

#### UC-STAT-04 — Dynamic metrics for "Este Mês" (THIS_MONTH)
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** default baseline; seed 1 territory with a visit today: `visitOutcome: 0` (SPOKE), `isRevisit: true`
- **Steps:** 1. navigate to statistics → 2. ensure "Este Mês" is selected (default)
- **Expected UI:** heading "Por período"; "Visitas: 1", "Revisitas: 1"
- **Expected persistence:** `db.getSubcollectionDocs(db.collections.territories, tid, db.historySubcollection)` contains a visit where `date >= firstDayOfCurrentMonth`
- **Edge cases:** visits on the last day of the previous month are excluded
- **Priority:** P0 · **Gaps:** no data-testids

#### UC-STAT-05 — Dynamic metrics for "1 Mês" (ONE_MONTH)
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** default baseline; seed 1 visit today (`visitOutcome: 0`) and 1 visit on the 15th of the PREVIOUS month (`visitOutcome: 0`, `isRevisit: true`)
- **Steps:** 1. navigate to statistics → 2. select "1 Mês"
- **Expected UI:** "Visitas: 2", "Revisitas: 1"
- **Expected persistence:** `db.getSubcollectionDocs(db.collections.territories, tid, db.historySubcollection)` has 2 docs with `date >= firstDayOfPreviousMonth`
- **Edge cases:** this period covers the current month plus the entirety of the previous month
- **Priority:** P1 · **Gaps:** no data-testids

#### UC-STAT-06 — Dynamic metrics for "3 Meses" (THREE_MONTHS)
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** default baseline; seed 1 visit today and 1 visit 2 months ago (both `visitOutcome: 4` REVISIT, `isRevisit: true`)
- **Steps:** 1. navigate to statistics → 2. select "3 Meses"
- **Expected UI:** "Visitas: 2", "Revisitas: 2"
- **Expected persistence:** `db.getSubcollectionDocs(db.collections.territories, tid, db.historySubcollection)` has 2 docs where `date >= firstDayOfMonth(3 months ago)`
- **Edge cases:** `REVISIT` (4) outcome counts as a "Visita" in dynamic metrics
- **Priority:** P1 · **Gaps:** no data-testids

#### UC-STAT-07 — Dynamic metrics for "6 meses" (SIX_MONTHS)
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** default baseline; seed 1 visit 5 months ago
- **Steps:** 1. navigate to statistics → 2. select "6 meses"
- **Expected UI:** "Visitas: 1"
- **Expected persistence:** visit `date >= firstDayOfMonth(6 months ago)`
- **Priority:** P1 · **Gaps:** no data-testids

#### UC-STAT-08 — Dynamic metrics for "1 ano" (ONE_YEAR)
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** default baseline; seed 1 visit 11 months ago
- **Steps:** 1. navigate to statistics → 2. select "1 ano"
- **Expected UI:** "Visitas: 1"
- **Expected persistence:** visit `date >= firstDayOfSameMonth(previousYear)`
- **Priority:** P1 · **Gaps:** no data-testids

#### UC-STAT-09 — Dynamic metrics for "Este Ano" (YEAR_TO_DATE)
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** default baseline; seed 1 visit on Jan 1st of the current year
- **Steps:** 1. navigate to statistics → 2. select "Este Ano"
- **Expected UI:** "Visitas: 1"
- **Expected persistence:** visit `date >= firstDayOfCurrentYear`
- **Priority:** P1 · **Gaps:** no data-testids

#### UC-STAT-10 — Visit counting rule (Outcome logic)
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** seed 1 territory with 5 visits today: `SPOKE` (0), `NOT_ANSWERED` (1), `MOVED` (2), `ASKED_TO_NOT_VISIT_AGAIN` (3), `REVISIT` (4)
- **Steps:** 1. navigate to statistics
- **Expected UI:** "Visitas: 2"
- **Expected persistence:** only outcomes `0` and `4` increment the `visitCount` in `TerritoryStatisticsBO.getVisitCountInPeriod`
- **Priority:** P0 · **Gaps:** no data-testids

#### UC-STAT-11 — Revisit counting rule (Boolean logic)
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** seed 1 territory with 2 visits today: (A) `visitOutcome: 0`, `isRevisit: true`; (B) `visitOutcome: 4`, `isRevisit: false`
- **Steps:** 1. navigate to statistics
- **Expected UI:** "Revisitas: 1"
- **Expected persistence:** only the `isRevisit: true` boolean increments the `revisitCount` in `TerritoryStatisticsBO.getRevisitCountInPeriod`, regardless of the `visitOutcome`
- **Priority:** P0 · **Gaps:** no data-testids

#### UC-STAT-12 — Statistics read from full history subcollection
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** default baseline; seed 1 territory with 7 visits today (all `visitOutcome: 0`)
- **Steps:** 1. navigate to statistics
- **Expected UI:** "Visitas: 7"
- **Expected persistence:** `db.getSubcollectionDocs(db.collections.territories, tid, db.historySubcollection)` returns 7 docs; parent `recentHistory` only contains 5 entries
- **Edge cases:** verifies that statistics do not conflate the denormalised `recentHistory` array with the full visit log
- **Priority:** P0 · **Gaps:** no data-testids

### Boundary and Access cases

#### UC-STAT-13 — Empty congregation
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** congregation with 0 territories
- **Steps:** 1. navigate to statistics
- **Expected UI:** clean zero totals — the loading state clears, the static section renders "Territórios: 0", "Pessoas: 0", "Estudos bíblicos: 0", "Mudaram: 0", the dynamic section renders "Visitas: 0", "Revisitas: 0", and the city filter becomes enabled while still listing the congregation's cities
- **Expected persistence:** `db.getCollectionDocs(db.collections.territories)` is empty (scoped to the congregation)
- **Edge cases:** `getAllByCongregation({ getHistory: true })` returns `of([])` immediately for an empty territory snapshot — no history query is issued at all
- **Priority:** P2 · **Gaps:** no data-testids

#### UC-STAT-14 — Loading state
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** default baseline
- **Steps:** 1. navigate to statistics → 2. observe while data is fetching
- **Expected UI:** `<lib-spinner>` is visible; city filter is `disabled`
- **Expected persistence:** N/A (UI state)
- **Priority:** P2 · **Gaps:** no data-testid on spinner

#### UC-STAT-15 — Access control (Organizer)
- **Actor:** Organizer (Harness extension needed)
- **Route:** `/territories/statistics`
- **Preconditions (seed):** user with role `ORGANIZER`
- **Steps:** 1. sign in as organizer → 2. navigate to `/territories/statistics`
- **Expected UI:** page loads correctly
- **Expected persistence:** `users/{uid}.role === 'ORGANIZER'`
- **Priority:** P1 · **Gaps:** `signInAs('organizer')` extension needed

#### UC-STAT-16 — Access control (Publisher redirect)
- **Actor:** Publisher
- **Route:** `/territories/statistics`
- **Preconditions (seed):** default baseline
- **Steps:** 1. sign in as publisher → 2. attempt to navigate to `/territories/statistics`
- **Expected UI:** redirected to `/welcome`
- **Expected persistence:** N/A (Auth guard)
- **Priority:** P1 · **Gaps:** none

#### UC-STAT-17 — Access control (Anonymous redirect)
- **Actor:** Anonymous
- **Route:** `/territories/statistics`
- **Preconditions (seed):** N/A
- **Steps:** 1. attempt to navigate to `/territories/statistics` without signing in
- **Expected UI:** redirected to `/login`
- **Expected persistence:** N/A (Auth guard)
- **Priority:** P1 · **Gaps:** none

#### UC-STAT-18 — Territories with no history
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** 1 territory with `history: []` (no visits)
- **Steps:** 1. navigate to statistics
- **Expected UI:** "Visitas: 0", "Revisitas: 0"
- **Expected persistence:** `db.getSubcollectionDocs(db.collections.territories, tid, db.historySubcollection)` returns an empty array
- **Priority:** P2 · **Gaps:** no data-testids

#### UC-STAT-19 — Visits outside selected period
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** seed 1 visit exactly 2 months ago
- **Steps:** 1. navigate to statistics → 2. ensure "Este Mês" is selected
- **Expected UI:** "Visitas: 0"
- **Expected persistence:** visit `date < firstDayOfCurrentMonth`
- **Priority:** P2 · **Gaps:** no data-testids

## Sources

- `apps/ministry-maps/src/app/features/territory/pages/statistics-territories-page/statistics-territories-page.component.ts`
- `apps/ministry-maps/src/app/features/territory/components/territory-statistics-static-section/territory-statistics-static-section.component.ts`
- `apps/ministry-maps/src/app/features/territory/components/territory-statistics-dynamic-section/territory-statistics-dynamic-section.component.ts`
- `apps/ministry-maps/src/app/features/territory/bo/territory-statistics/territory-statistics.bo.ts`
- `apps/ministry-maps/src/app/features/territory/bo/territory-alerts/territory-alerts.bo.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-territory-datasource.service.ts`
- `firestore.indexes.json` (history collection-group composite index) · `firestore.rules` (recursive history match)
- `functions/ministry-maps/src/scripts/backfill-territory-history-stamps.ts` (legacy document stamps)
- `apps/ministry-maps/docs/domain/data-model.md`
- `apps/ministry-maps/docs/domain/roles-and-permissions.md`
