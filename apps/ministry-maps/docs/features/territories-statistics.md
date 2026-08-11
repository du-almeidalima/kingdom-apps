# Territories statistics (`UC-STAT`)

This document describes the behavioural use cases for the `/territories/statistics` screen, where congregation leaders can monitor territory coverage and visit metrics.

**Route:** `/territories/statistics`
**Actors:** `ADMIN`, `ELDER`, `ORGANIZER`, `SUPERINTENDENT`, `APP_ADMIN` (Publishers are redirected).

## Testability gaps (summary)

- **Missing Selectors:** No `data-testid` on the main heading, city filter `<select>`, period filter `<select>`, or any individual metric tile. Selectors must rely on verbatim text or DOM structure.
- **Harness Extensions:** `signInAs` fixture only supports `'admin'` and `'publisher'`. Roles like `ELDER`, `ORGANIZER`, `SUPERINTENDENT`, and `APP_ADMIN` require harness extensions to be testable.
- **Inconsistent Data Sources:** The "Mudaram" metric relies on denormalised `recentHistory` (last 5 visits), while "Visitas" and "Revisitas" use the full `history` subcollection.

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

#### UC-STAT-03 — Displays "Moved" count from recent history
- **Actor:** Admin
- **Route:** `/territories/statistics`
- **Preconditions (seed):** default baseline; plus 1 territory with `recentHistory` containing a visit with `visitOutcome: 2` (MOVED) and `isResolved: false`
- **Steps:** 1. navigate to statistics
- **Expected UI:** "Mudaram: 1"
- **Expected persistence:** `db.getDoc(db.collections.territories, id)` has `recentHistory` with an unresolved `MOVED` (2) outcome
- **Edge cases:** if `isResolved: true`, the count is 0; ⚠ suspected defect: if the `MOVED` visit is older than the last 5 (not in `recentHistory`), it is ignored even if it exists in the `history` subcollection
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
- **Expected UI:** ⚠ **Defect** — page hangs in loading state forever: the `statistics-heading` and disabled `statistics-city-filter` render, but the `statistics-loading` spinner is the only branch shown; the static/dynamic sections never appear. Root cause: `FirebaseTerritoryDatasourceService.getAllByCongregation({ getHistory: true })` builds `combineLatest([])` for an empty snapshot, which never emits; `finalize` never flips `isLoading`. See `testability-gaps.md` §3 #42.
- **Expected persistence:** `db.getCollectionDocs(db.collections.territories)` is empty (scoped to the congregation)
- **Priority:** P2 · **Gaps:** no data-testids (now present); ⚠ suspected defect

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
- `apps/ministry-maps/docs/domain/data-model.md`
- `apps/ministry-maps/docs/domain/roles-and-permissions.md`
