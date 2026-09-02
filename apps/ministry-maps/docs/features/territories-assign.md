# Assigning territories (`UC-ASSIGN`)

This document describes the behavioural use cases for the `/territories/assign` screen: an admin/elder picks territories (optionally scoped by city), submits the form, and the app creates a `designations` doc whose id is shared via a WhatsApp deep link pointing at `/work/:id`. Field/model shapes referenced below are defined in [`../domain/data-model.md`](../domain/data-model.md#23-designation--designationterritory---srcmodelsdesignationts); pt-BR ↔ English vocabulary is in [`../domain/glossary.md`](../domain/glossary.md).

**Route:** `/territories/assign`
**Actors:** `ADMIN`, `ELDER`, `ORGANIZER`, `SUPERINTENDENT`, `APP_ADMIN` can reach the page (guarded at the parent `/territories` path by `canActivateChild: [authGuard]`, `data.roles: TERRITORY_ALLOWED_ROLES`); see
[`../domain/roles-and-permissions.md`](../domain/roles-and-permissions.md). `PUBLISHER` is redirected to
`/welcome`; anonymous visitors are redirected to `/login`.

### Listing and city scope

#### UC-ASSIGN-01 — Page renders for an authorised user: per-city list, default order, disabled submit

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline (`seed-territory-1`/`-3` São Paulo `positionIndex 0`/`2`, `seed-territory-2` Osasco)
- **Steps:** 1. sign in as admin → 2. open `/territories/assign`
- **Expected UI:** heading `Designar Território` (singular, verbatim as written); a native `<select name="Cidade">` (no visible `<label>`, `lib-select` is a bare attribute directive) pre-selected to the congregation's first city, `São Paulo`; a `kingdom-apps-territory-checkbox` row per territory of that city, ordered by `positionIndex` ascending (`Rua das Acácias...` index 0 above `Rua Harmonia...` index 2); the floating submit button (`title="Enviar Designação"`) renders with a paper-plane icon and is `disabled` because `selectedTerritoriesModel.size === 0` — its numeric badge (UC-ASSIGN-12) is hidden at zero
- **Expected persistence:** `db.getDoc(db.collections.territories,'seed-territory-1').positionIndex === 0`; `db.getDoc(db.collections.territories,'seed-territory-3').positionIndex === 2`; no `designations` doc created (`db.getCollectionDocs(db.collections.designations)` still has only `seed-designation`)
- **Edge cases:** this screen reuses `territoriesFilterPipe`/`TERRITORY_SORT_FILTER_CONFIG` verbatim from `/territories` (same sort options `Ordem de Cadastro`/`Última Visita`, same toggles); see [`territories-management.md`](./territories-management.md) for the pipe's exact rules, not repeated here
- **Priority:** P0 · **Gaps:** no `data-testid` anywhere on this screen (none of the app's 4 testids apply here); rows must be located by their rendered address text

#### UC-ASSIGN-02 — City `<select>` mirrors `congregation.cities`, "Todas" is a synthetic last option, alphabetical order under "Todas"

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline (`cities: ['São Paulo', 'Osasco']`)
- **Steps:** 1. open `/territories/assign` → 2. inspect the city `<option>`s → 3. select `Osasco` → 4. select `Todas`
- **Expected UI:** options in order `São Paulo`, `Osasco`, `Todas` (`ALL_OPTION`, always last); selecting `Osasco` re-fetches and shows only `Av. dos Autonomistas, 1200 - Centro`; selecting `Todas` fetches via `getAllByCongregation` (no `city` clause) and sorts **alphabetically by `city`** (`territoriesFilterPipe`'s `ALL_OPTION` branch), so Osasco's territory renders before either São Paulo one, ignoring `positionIndex`
- **Expected persistence:** `db.getDoc(db.collections.congregations, seed.ids.congregation).cities` equals `['São Paulo', 'Osasco']` in that order
- **Edge cases:** switching city calls `handleSelectedCityChange`, which resets the search box (`searchInputComponent.resetSearch()`) and re-queries Firestore, but does **not** touch `selectedTerritoriesModel` — see UC-ASSIGN-12
- **Priority:** P0 · **Gaps:** no `data-testid` on the `<select>` or its `<option>`s

#### UC-ASSIGN-03 — Zero-territory congregation: page renders without crashing, submission is impossible

- **Actor:** Admin (harness extension needed — see below)
- **Route:** `/territories/assign`
- **Preconditions (seed):** a **second** congregation (`buildCongregation({ cities: ['São Paulo'] })`) with its own admin user (`buildUser({ role: 'ADMIN', congregationId: <that congregation> })`) and **zero** `territories` docs referencing it
- **Steps:** 1. sign in as that congregation's admin → 2. open `/territories/assign`
- **Expected UI:** the page does **not** crash: heading `Designar Território`, city `<select>` shows `São Paulo` / `Todas`, the checkbox list area renders with **zero** rows (the `@for` over `filteredTerritories$ | async` simply iterates nothing — there is no dedicated "nenhum território" empty-state message, matching the pattern in [`territories-management.md#UC-TERR-03`](./territories-management.md)), and the floating submit button is permanently `disabled` since nothing can ever be ticked — **creating a designation is impossible from this screen for such a congregation**
- **Expected persistence:** `db.queryWhere(db.collections.territories, 'congregationId', '==', <newCongregationId>)` returns `[]`; after the test, `db.getCollectionDocs(db.collections.designations)` is unchanged (still only the default baseline's `seed-designation`, since nothing from the new congregation could be submitted)
- **Edge cases:** this is the explicitly-requested "zero territories" edge case, distinct from UC-ASSIGN-04 below (which is about zero **cities**, a different and buggier condition)
- **Priority:** P0 · **Gaps:** `signInAs` only supports `'admin'`/`'publisher'` bound to the **default** congregation's users; a second congregation's admin has no `ROLE_UIDS` entry today — this whole use case needs a harness extension (a way to `signInAs` an arbitrary seeded uid, or a second named identity) before it can be automated

#### UC-ASSIGN-04 — ⚠ suspected defect: a congregation with an empty `cities` array collapses city selection

- **Actor:** Admin (harness extension needed, same as UC-ASSIGN-03)
- **Route:** `/territories/assign`
- **Preconditions (seed):** a congregation with `cities: []` and an admin user of that congregation
- **Steps:** 1. sign in as that admin → 2. open `/territories/assign`
- **Expected UI:** `ngOnInit` runs the identical buggy ternary found on `/territories`
  (`const firstCity = cities.length >= 0 ? cities[0] : ALL_OPTION;`) — since an array's `.length` is **always** `>= 0`, `cities[0]` (`undefined`) is assigned instead of falling back to `ALL_OPTION`. The
  `<select>` then binds `[ngModel]='selectedCity'` to `undefined`, so **no** `<option>` appears selected (only the synthetic `Todas` option exists in the DOM, since `cities` is empty); `fetchTerritories(id,
undefined)` takes the `getAllByCongregationAndCities(id, [undefined])` branch (because `undefined !==
'ALL'`), which Firestore rejects when the query executes — the resulting observable errors, so
  `filteredTerritories$ | async` never emits and the `@for` block renders zero checkbox rows. **Verified
  reality:** unlike `/territories` (whose whole page collapses — see UC-TERR-04), this page still renders
  its heading, city `<select>` (with only `Todas`), search box and submit FAB; only the checkbox list is
  empty, so the FAB is permanently disabled
- **Expected persistence:** `db.getDoc(db.collections.congregations, id).cities` is `[]`; assert `db.getCollectionDocs(db.collections.designations)` unchanged, same as UC-ASSIGN-03
- **Edge cases:** shares the root cause with [`territories-management.md#UC-TERR-04`](./territories-management.md) but the outward symptom is milder here (the page shell survives); test today must assert the city `<select>` exposes only `Todas`, zero checkbox rows render, and the FAB stays disabled — do not assert a graceful fallback
- **Priority:** P2 · **Gaps:** `⚠ suspected defect` (shared root cause with `UC-TERR-04`); same harness extension as UC-ASSIGN-03

### Search, sort and filter

#### UC-ASSIGN-05 — Multi-word search narrows the checkbox list (same pipe as `/territories`)

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline, city `São Paulo`
- **Steps:** 1. open `/territories/assign` → 2. type `acácias` into `lib-search-input`
- **Expected UI:** only `Rua das Acácias, 45 - Pinheiros` remains; clearing the box restores both São Paulo territories
- **Expected persistence:** `db.getDoc(db.collections.territories,'seed-territory-1').address === 'Rua das Acácias, 45 - Pinheiros'`
- **Edge cases:** search is case-insensitive but accent-sensitive, and matches the concatenation `address + note` with no separator — see [`territories-management.md#UC-TERR-05`](./territories-management.md) for the exact pipe caveats, which apply identically here
- **Priority:** P1 · **Gaps:** no `data-testid` on the search input

#### UC-ASSIGN-06 — "Estudantes da Bíblia" toggle (default ON) gates bible-student territories from selection

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline (`seed-territory-3` `isBibleStudent: true`), city `São Paulo`
- **Steps:** 1. open `/territories/assign` (both São Paulo territories listed by default) → 2. open the sort/filter dialog (`Ordenar e Filtrar`) → 3. untick `Estudantes da Bíblia` (`Filtrar territórios com estudantes da Bíblia`) → 4. `Aplicar`
- **Expected UI:** `Rua Harmonia, 300 - Vila Madalena` disappears from the list entirely — it cannot be selected while filtered out, even if it was already ticked (the checkbox component itself is removed from the DOM by the `@for`, but the underlying `selectedTerritoriesModel` entry, if any, is **not** cleared)
- **Expected persistence:** `db.getDoc(db.collections.territories,'seed-territory-3').isBibleStudent === true`
- **Edge cases:** the toggle default is `true` (`TERRITORY_SORT_FILTER_CONFIG.filterConfigs.initial`), identical to `/territories` — see [`territories-management.md#UC-TERR-09`](./territories-management.md)
- **Priority:** P1 · **Gaps:** no `data-testid` on the toggle

#### UC-ASSIGN-07 — "Territórios que Mudaram" toggle reveals a moved territory, whose selection then prompts a confirmation dialog

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline + 1 extra `buildTerritory({ congregationId: seed.ids.congregation, city: 'São Paulo', history: [] })` whose parent doc is patched (via `db`/admin write, or by seeding `recentHistory` directly if the factory supports it) to carry `recentHistory: [{ visitOutcome: 2, isResolved: false, ... }]` (unresolved `MOVED`)
- **Steps:** 1. open `/territories/assign`, city `São Paulo` (moved territory absent) → 2. sort/filter dialog → 3. tick `Territórios que Mudaram` (`Incluir territórios que mudaram de endereço`) → `Aplicar` → 4. tick the moved territory's checkbox
- **Expected UI:** the moved territory appears only after step 3; ticking it in step 4 opens a `ConfirmDialogComponent` titled `Se Mudou` with body `Um publicador recentemente relatou que esse morador se mudou.` then `Você deseja designar esse território mesmo assim?` and the cross-app `Cancelar`/`Confirmar` buttons (see [`../domain/glossary.md`](../domain/glossary.md#2-cross-app-ui-labels))
- **Expected persistence:** `db.getDoc(...).recentHistory` contains the unresolved `MOVED` (`visitOutcome: 2`) entry; N/A for the dialog itself (client-only)
- **Edge cases:** choosing `Confirmar` keeps the checkbox ticked and `selectedTerritoriesModel` gains the id; choosing `Cancelar` (or closing) runs `TerritoryBO`'s dialog `.closed` subscription with a falsy result and `handleTerritoryCheck` explicitly `.delete()`s the id back out of `selectedTerritoriesModel`, unticking the box
- **Priority:** P1 · **Gaps:** no `data-testid` on the toggle or the confirm dialog buttons

#### UC-ASSIGN-08 — Selecting a territory with an unresolved "asked to not visit again" alert also prompts a confirmation

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** 1 territory with `recentHistory: [{ visitOutcome: 3, isResolved: false, date: <10 months ago> }]` (unresolved `ASKED_TO_NOT_VISIT_AGAIN`, within the 24-month window)
- **Steps:** 1. open `/territories/assign`, select its city → 2. tick that territory's checkbox
- **Expected UI:** `ConfirmDialogComponent` titled `Não visitar`, body `Esse morador pediu para não ser visitado por uma Testemunha de Jeová recentemente dentro dos últimos dois anos.` then `Você deseja designar esse território mesmo assim?`
- **Expected persistence:** `db.getDoc(...).recentHistory` entry has `visitOutcome === 3`, `isResolved: false`
- **Edge cases:** `TerritoryAlertsBO.findImportantAlert` checks `MOVED` before `ASKED_TO_NOT_VISIT_AGAIN` — a territory with both unresolved entries only ever shows the `Se Mudou` dialog; also note the 24-month window uses `differenceInMonths(history.date, now) < 24`, exactly like the `/territories` badge (see [`territories-management.md#UC-TERR-25`](./territories-management.md)), so a 25-month-old entry raises **no** dialog and the territory selects silently
- **Priority:** P1 · **Gaps:** no `data-testid` on the confirm dialog

### Selecting and deselecting territories

#### UC-ASSIGN-09 — Ticking/unticking a checkbox toggles the submit button's disabled state

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline, city `São Paulo`
- **Steps:** 1. open `/territories/assign` → 2. observe the submit FAB is disabled → 3. tick `Rua das Acácias, 45 - Pinheiros` → 4. observe FAB enabled → 5. untick it
- **Expected UI:** FAB `disabled` attribute flips from `true`→`false`→`true` as `selectedTerritoriesModel.size` goes `0`→`1`→`0`; the checkbox itself gets class `territory-checkbox--selected` while ticked
- **Expected persistence:** N/A (pure client state; no write happens until submit) — assert `db.getCollectionDocs(db.collections.designations)` is unchanged throughout
- **Edge cases:** ticking a territory that carries no alert (`findImportantAlert` returns `null`) never opens a confirm dialog — the checkbox state change is immediate
- **Priority:** P0 · **Gaps:** no `data-testid` on the checkbox or the FAB; use the rendered address text / `title="Enviar Designação"`

#### UC-ASSIGN-10 — Declining the "moved" confirmation reverts the checkbox to unchecked

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** same as UC-ASSIGN-07 (1 territory with unresolved `MOVED`, filter toggled to include it)
- **Steps:** 1. tick the moved territory's checkbox → 2. in the `Se Mudou` dialog, click `Cancelar`
- **Expected UI:** the checkbox visually returns to unchecked (`value` is set `true` momentarily by `setValue`, then `handleTerritoryCheck`'s subscription removes the id and Angular re-evaluates `[ngModel]='hasAlreadyBeenSelected(territory.id)'` back to `false` on the next check cycle)
- **Expected persistence:** N/A; `selectedTerritoriesModel` never included this id in the final submitted set for this interaction
- **Edge cases:** the id is added to `selectedTerritoriesModel` **before** the dialog opens (`handleTerritoryCheck` mutates the Set synchronously, then conditionally opens the dialog) — a test asserting on the Set's transient state (not exposed to Playwright anyway) would see a false positive if it raced the async `.closed` subscription
- **Priority:** P1 · **Gaps:** no `data-testid` on the confirm dialog's `Cancelar` button

#### UC-ASSIGN-11 — Selections persist across city switches (invisibly)

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline
- **Steps:** 1. select city `São Paulo`, tick `Rua das Acácias, 45 - Pinheiros` → 2. switch city to `Osasco`, tick `Av. dos Autonomistas, 1200 - Centro` → 3. switch back to `São Paulo`
- **Expected UI:** after step 3, `Rua das Acácias, 45 - Pinheiros` renders **still ticked** (`hasAlreadyBeenSelected` checks `selectedTerritoriesModel`, which was never cleared by `handleSelectedCityChange`); the submit FAB stays enabled throughout since the Set always has at least one entry
- **Expected persistence:** N/A until submit; if submitted at this point, both territory ids end up in a single designation's `territories[]` (see UC-ASSIGN-16) even though they were never simultaneously visible on screen
- **Edge cases:** this is a deliberate cross-city accumulation feature, not a bug — the FAB's numeric badge (UC-ASSIGN-12) keeps showing the accumulated count while the user is viewing an unrelated city, and stays enabled throughout since the Set always has at least one entry
- **Priority:** P0 · **Gaps:** the FAB badge (`fab-badge` testid, UC-ASSIGN-12) exposes the running count; a test wanting per-row state must still tick, navigate city away and back, and assert the checkbox's checked state via its `input[type=checkbox]:checked` state

#### UC-ASSIGN-12 — FAB badge counts the selected territories across city switches

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline
- **Steps:** 1. open `/territories/assign` → 2. tick `Rua das Acácias, 45 - Pinheiros` → 3. switch city to `Osasco` and tick `Av. dos Autonomistas, 1200 - Centro` → 4. submit
- **Expected UI:** the submit FAB renders a numeric badge (`data-testid="fab-badge"`, provided by `FloatingActionButtonComponent`'s `badge` input) bound to `selectedCount = computed(() => selectedTerritoriesModel.size)`: **hidden while `0`**, reads `1` after step 2, `2` after step 3 (cross-city accumulation per UC-ASSIGN-11 is now visible), and hidden again after submit removes the submitted ids from the selection
- **Expected persistence:** after step 4, one new designation holds both territories (UC-ASSIGN-15/16); `db.getCollectionDocs(db.collections.designations)` grows by exactly 1
- **Edge cases:** the badge renders exactly when the FAB is enabled (`size > 0` is also the FAB's `[disabled]` condition), so the two can never disagree; it is a common-ui affordance carrying no pt-BR copy of its own; a failed submission keeps the badge (and ticks) since the selection is only cleared on success (UC-ASSIGN-21)
- **Priority:** P0 · **Gaps:** none — this entry previously locked the *absence* of a selected-count UI (⚠ suspected gap); the FAB badge resolved it

### Expiry derivation

#### UC-ASSIGN-13 — `expiresAt` is `createdAt` plus `designationAccessExpiryDays` days, in raw milliseconds

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline (`congregation.settings.designationAccessExpiryDays === 7`)
- **Steps:** 1. tick `Rua das Acácias, 45 - Pinheiros` → 2. submit at a known time `T`
- **Expected UI:** the expiry date/time is **never shown** anywhere on this screen — no label, no preview, no confirmation copy states when the designation will expire
- **Expected persistence:** `TerritoryBO.createDesignationForTerritories` computes
  `new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)` — a pure millisecond addition with **no**
  truncation of time-of-day (unlike a "midnight of day N" calculation). Assert
  `db.getDoc(db.collections.designations, newId).expiresAt` (read via `db.getDocSnapshot` to inspect the raw `Timestamp`) equals `T + 7 * 86_400_000` ms, **not** midnight of the 7th day; a small tolerance (a few seconds) is needed for the time elapsed between `Date.now()` inside the app and the test's own clock read
- **Edge cases:** because the arithmetic runs at submit time, two designations submitted seconds apart from the same congregation get `expiresAt` values that differ by exactly that many seconds, not aligned to any day boundary
- **Priority:** P0 · **Gaps:** none for the assertion itself; needs a small time tolerance in the test

#### UC-ASSIGN-14 — Missing congregation settings fall back to the environment default, still never surfaced

- **Actor:** Admin (harness extension needed — new congregation)
- **Route:** `/territories/assign`
- **Preconditions (seed):** a congregation whose `settings` object omits `designationAccessExpiryDays` (if the seed type requires the field, simulate by writing the congregation doc directly via `db.firestore` without it) plus 1 territory and an admin user
- **Steps:** 1. sign in as that admin → 2. tick the territory → 3. submit
- **Expected UI:** identical to UC-ASSIGN-13 — no expiry is shown before or after submission
- **Expected persistence:** `CongregationSettingsBO.getSettingOrDefault('designationAccessExpiryDays')` falls back to `environment.congregationSettingsDefaultValues.designationAccessExpiryDays` (**45**, `src/environments/environment.ts`) whenever `settings?.designationAccessExpiryDays` is nullish; assert the new designation's `expiresAt` is `createdAt + 45 days`, not `7`
- **Edge cases:** this fallback is a **client-side** default only — the value is never written back to the congregation doc, so every subsequent designation for that congregation re-derives it the same way until an admin explicitly sets it via `/configuration`
- **Priority:** P2 · **Gaps:** same harness extension as UC-ASSIGN-03; the seed factory `buildCongregation` always fills `settings` with concrete numbers, so this scenario needs a raw Admin-SDK write, not `seed.factories.buildCongregation`

### Designation creation and persistence

#### UC-ASSIGN-15 — Submitting creates one `designations` doc with the expected top-level fields

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline, city `São Paulo`
- **Steps:** 1. tick `Rua das Acácias, 45 - Pinheiros` and `Rua Harmonia, 300 - Vila Madalena` → 2. submit
- **Expected UI:** the FAB shows its loading spinner (`[loading]='isCreatingAssignment'`) and is `disabled` for the duration of the write (a re-entrancy guard in `handleTerritoryFormSubmit` plus the disabled binding prevent a double-click from creating duplicate designations), then a new browser window/navigation opens for the WhatsApp share link (see UC-ASSIGN-19) — there is **no success toast** anywhere in this flow (contrast with `/territories`' CSV export, see [`territories-management.md#UC-TERR-34`](./territories-management.md))
- **Expected persistence:** a new `designations/{id}` doc exists with `congregationId === seed.ids.congregation`, `createdBy === seed.ids.adminUser`, `createdAt` ≈ submit time, `expiresAt` per UC-ASSIGN-13, and `settings.shouldDesignationBlockAfterExpired === true` (copied from `congregation.settings.shouldDesignationBlockAfterExpired` at creation time, per the default baseline) — assert via `db.queryWhere(db.collections.designations, 'congregationId', '==', seed.ids.congregation)` filtered to the new id (not `seed-designation`)
- **Edge cases:** the doc's own `id` field is also written **inside** the document body (`setDoc(newDesignationDocRef, { ...designation, id: newDesignationDocRef.id })`), mirroring the territory/user write pattern documented in [`data-model.md`](../domain/data-model.md)
- **Priority:** P0 · **Gaps:** none

#### UC-ASSIGN-16 — Embedded `territories[]` is a frozen snapshot: every entry is `status: 'PENDING'`, `recentHistory` stripped, `history` present but capped

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline (`seed-territory-1` has 2 `history` subcollection docs)
- **Steps:** 1. tick `Rua das Acácias, 45 - Pinheiros` → 2. submit
- **Expected UI:** N/A beyond UC-ASSIGN-15
- **Expected persistence:** the new designation's `territories` array has exactly one entry whose shape is
  `Omit<Territory,'recentHistory'> & { status, history }`: `status === 'PENDING'`; the key `recentHistory`
  is absent (`delete t['recentHistory']` in `TerritoryBO`); `history` is present and equals the territory's **full** `history` subcollection **read via `getAllInIds`** (both seeded visits), then `.slice(-5)` — for this seed that is both 2 visits, unchanged. Assert
  `db.getDoc(db.collections.designations, newId).territories[0]` has `address === 'Rua das Acácias, 45 - Pinheiros'`,
  `status === 'PENDING'`, `history.length === 2`, and no `recentHistory` key
- **Edge cases:** `⚠ suspected defect` — `getAllInIds` builds `history` from an **unordered** `getDocs` call (no `orderBy('date')`), and `TerritoryBO` slices the **last 5 of that arbitrary order** (`t?.history?.slice(-5)`), not the 5 most recent by date. A territory with more than 5 visit docs can therefore embed a `history`
  array that omits its true most-recent visits; contrast with `TerritoryRepository.update()`'s
  `recentHistory`, which explicitly sorts by date before slicing (see
  [`data-model.md §4.1`](../domain/data-model.md#41-dual-history-subcollection-vs-recenthistory-vs-lastvisit)). A test proving this must seed **6+** `history` docs with distinct dates and assert the embedded `history`
  is **not guaranteed** to be the 5 newest
- **Priority:** P1 · **Gaps:** `⚠ suspected defect`, consolidate under Testability gaps below

#### UC-ASSIGN-17 — Two designations from overlapping territory sets persist independently

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline
- **Steps:** 1. tick `Rua das Acácias, 45 - Pinheiros` (`seed-territory-1`) and `Rua Harmonia, 300 - Vila Madalena` (`seed-territory-3`) → 2. submit, capture id `D1` from the share link → 3. reload `/territories/assign`, tick `Rua das Acácias, 45 - Pinheiros` and `Av. dos Autonomistas, 1200 - Centro` (`seed-territory-2`) → 4. submit, capture id `D2`
- **Expected UI:** each submission independently opens its own share link/dialog; nothing on screen indicates `seed-territory-1` is already "in flight" on another designation (the row does become checked-and-disabled after the first submit — tapping it re-sends that designation, UC-ASSIGN-25 — but there is no cross-designation overview). Note the session mechanics that make step 3 possible: after step 2's submit succeeds, `assignedDesignations` (a `Map<designationId, Set<territoryId>>` populated **only in the success `subscribe`** of `handleTerritoryFormSubmit`) holds the submitted ids under `D1` and their checkboxes render checked-and-**disabled** — but both the map and `selectedTerritoriesModel` are component state, so the full reload in step 3 re-creates the component with an **empty** map and selection and every checkbox becomes tickable again (the state is only ever preserved across _city switches_ and submissions, never across reloads — see UC-ASSIGN-21 for the failure case that now also leaves the selection untouched)
- **Expected persistence:** `db.getDoc(db.collections.designations, D1).territories` contains `seed-territory-1` and `seed-territory-3`, both `status: 'PENDING'`; `db.getDoc(db.collections.designations, D2).territories` contains `seed-territory-1` and `seed-territory-2`, both `status: 'PENDING'` — the two docs are entirely independent rows; `db.getCollectionDocs(db.collections.designations)` has grown by 2 (from the 1 baseline doc to 3)
- **Edge cases:** mutating `D1.territories[0].status` to `'DONE'` (simulating a completed visit on `/work/:id`) must **not** change `D2.territories[0].status`, since each is an independently-written snapshot, not a shared reference
- **Priority:** P0 · **Gaps:** none

#### UC-ASSIGN-18 — Firestore `in`-query limits: internal batching at 10, the raw 30-item cap is a real but currently unreached boundary

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** a congregation with **35** territories in one city (harness note: `seed.write` accepts an array, so this can be built with 35 `buildTerritory({ congregationId, city })` calls without a new harness feature)
- **Steps:** 1. open `/territories/assign`, select that city → 2. tick all 35 checkboxes → 3. submit
- **Expected UI:** submission still succeeds; the loading spinner may be visibly longer since `batchGetTerritoriesInIds` issues **4** sequential `getAllInIds` calls of 10+10+10+5 ids (`BATCH_SIZE = 10` in `TerritoryBO`, joined with `forkJoin`) rather than 1–2 calls of up to 30
- **Expected persistence:** the resulting designation's `territories` array has length `35`; no query in this flow ever sends more than 10 ids to Firestore's `where(documentId(),'in',ids)`, so the **true** Firestore cap of 30 (documented in [`data-model.md §4.7`](../domain/data-model.md#47-firestore-query-limits-worth-testing)) is never actually exercised by this code path — it is only a real risk for `getAllByCongregationAndCities`'s `where('city','in',cities)`, which has **no** batching at all. That second call is only ever invoked by this screen with a **single-element** array (`[city]`), so a congregation would need **more than 30 cities** in `congregation.cities` before this screen could hit the real Firestore error, which is an **untested boundary** — no seed today builds a congregation with >30 cities
- **Edge cases:** `batchGetTerritoriesInIds`'s doc-comment says "Firebase that only allow 10 Firebase Query 'IN'", which is factually wrong (Firestore's real cap is 30) — the code is unnecessarily conservative but not broken; do not "fix" the assertion to expect batches of 30
- **Priority:** P2 · **Gaps:** `⚠ suspected defect` (misleading comment, not a functional bug); the >30-cities scenario is flagged as an untested boundary, not automated here

### The generated share link

#### UC-ASSIGN-19 — Share link composition and delivery: `location.origin` (not `environment.baseUrl`) wrapped in a WhatsApp deep link

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline
- **Steps:** 1. tick `Rua das Acácias, 45 - Pinheiros` → 2. submit → 3. capture the resulting popup/navigation
- **Expected UI:** on successful creation, `shareDesignation(designationId)` builds
  `` `${location.origin}/${FeatureRoutesEnum.WORK}/${designationId}` `` (i.e. `http://localhost:4200/work/{id}`
  in the Playwright environment), wraps it as `` `whatsapp://send?text=` + builtUrl `` via
  `createSendWhatsAppLink`, then either navigates the current tab (`window.location.href = builtUrl` when
  `isMobileDevice()`, a `navigator.userAgent` regex test) or calls `window.open(builtUrl)` on desktop
- **Expected persistence:** `db.getDoc(db.collections.designations, newId).id === newId`, matching the
  `{id}` segment captured from the URL
- **Edge cases:** `⚠ suspected defect` — every other share link in this app (`invite-create-dialog.component.ts`)
  is built from `environment.baseUrl` (`NX_APP_BASE_URL`); this screen instead uses the browser's own
  `location.origin`, which happens to coincide with `environment.baseUrl` in the emulator/dev setup but is a behavioural inconsistency worth locking in as-is: assert the link contains `location.origin`, do **not**
  assert it contains `environment.baseUrl` unless the test also proves the two strings are equal in that environment. **Playwright technique:** desktop path — `const popupPromise = page.waitForEvent('popup'); await submit(); const popup = await popupPromise; expect(popup.url()).toContain('whatsapp://send?text=')` (a
  `whatsapp://` scheme `window.open` typically fails navigation in a headless browser but Playwright still surfaces it as a `popup` event with that attempted URL); the `text=` query parameter is the URL-encoded `${location.origin}/work/{id}`, decode it to extract `{id}` for a persistence assertion
- **Priority:** P0 · **Gaps:** `⚠ suspected defect` (base-URL inconsistency); confirm in a real (non-emulator) deploy whether `location.origin` and `environment.baseUrl` ever actually diverge

#### UC-ASSIGN-20 — ⚠ suspected gap: there is no clipboard/copy affordance on this screen

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline
- **Steps:** 1. tick a territory → 2. submit → 3. inspect every element rendered during/after the share flow for a "copy link" button
- **Expected UI:** none exists — a repository-wide search for `navigator.clipboard` and `clipboard` returns **zero** matches anywhere under `apps/ministry-maps/src`. The **only** sharing mechanism is the WhatsApp deep link of UC-ASSIGN-19; there is no separate "copy to clipboard" button, icon, or toast confirming a copy action
- **Expected persistence:** N/A (UI-only observation)
- **Edge cases:** a test author expecting `navigator.clipboard.writeText` (a common pattern in similar apps)
  must not write that assertion here — it would test a feature that does not exist. If a future PR adds a copy button, this entry must be rewritten and a `page.context().grantPermissions(['clipboard-read',
'clipboard-write'])` step added before reading `navigator.clipboard.readText()`
- **Priority:** P2 · **Gaps:** documents the current absence; no automatable clipboard flow exists today

#### UC-ASSIGN-25 — Tapping an already-assigned territory re-triggers the share for its designation

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline
- **Steps:** 1. tick `Rua das Acácias, 45 - Pinheiros` and `Rua Harmonia, 300 - Vila Madalena` → 2. submit, capture designation id `D1` from the share link (UC-ASSIGN-19) → 3. tap the now checked-and-disabled row for `Rua das Acácias, 45 - Pinheiros`
- **Expected UI:** after step 2 the submitted rows render checked-and-disabled with `title="Enviar designação novamente"` and `cursor: pointer`. Tapping such a row emits `TerritoryCheckboxComponent.assignedClick` (a touch-first affordance — the click handler deliberately has no keyboard activation, since this screen is primarily used on mobile devices), which the page resolves through the `assignedDesignations` map (`designationId → territoryIds`) to call `shareDesignation(D1)` again — producing the same `whatsapp://send?text={location.origin}/work/D1` link and delivery path (desktop `window.open` / mobile `location.href`) as the original submission. The row stays checked-and-disabled afterwards
- **Expected persistence:** none — re-sharing never writes; `db.getCollectionDocs(db.collections.designations)` is unchanged and `D1` is untouched
- **Edge cases:** the tap does **not** open the assignment-confirmation dialog (`findImportantAlert`) — that flow belongs to *ticking* an enabled checkbox (UC-ASSIGN-07/08); clicks that originate inside the row's action buttons never re-share (UC-ASSIGN-26); the state is session-only, so after a reload no row is assigned (UC-ASSIGN-17). This map (`designationId → territoryIds`) is the groundwork for the planned "show designations already done" view
- **Priority:** P0 · **Gaps:** none

#### UC-ASSIGN-26 — Assigned-row affordances: Maps/History buttons keep their behavior; assigned icon is dimmed

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline (every seeded territory carries a `mapsLink` and visit history)
- **Steps:** 1. tick `Rua das Acácias, 45 - Pinheiros` → 2. submit → 3. click the assigned row's Maps button → 4. click the assigned row's History button → 5. switch to dark mode (`emulateMedia({ colorScheme: 'dark' })` under the `system` preference)
- **Expected UI:** the action buttons inside an assigned row are unaffected by the disabled state — Maps still opens the Google Maps link (a `window.open` to the maps URL on Chromium), History still opens the `Histórico de Visitas` dialog (`history-dialog` testid) — and **neither triggers a WhatsApp share** (`handleCardClick` ignores clicks whose target is inside a `button`). In dark mode the assigned row's territory icon renders at the disabled tone (`--kui-color-text-disabled`, computed `rgba(255, 255, 255, 0.38)`) while selectable rows keep full contrast (`--kui-color-text`, `rgba(255, 255, 255, 0.87)`); the same semantic token dims it proportionally in light mode (`rgba(0, 0, 0, 0.38)`), matching the row's already-dim description text — previously the icon stayed at full contrast, making assigned rows hard to tell apart in dark mode
- **Expected persistence:** N/A (no writes in this flow); `designations` unchanged beyond the one created in step 2
- **Edge cases:** the tone is applied via `.territory-checkbox--disabled .territory-checkbox__icon` in `territory-checkbox.component.scss`, not a dark-mode-only override — both themes consume the semantic token
- **Priority:** P1 · **Gaps:** none

#### UC-ASSIGN-21 — ⚠ residual gap: on a failed creation the ticks remain selectable (no optimistic marking), but no error is shown

- **Actor:** Admin (harness extension needed — see below)
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline, plus a way to force `TerritoryBO.createDesignationForTerritories` to error (e.g. temporarily revoke Firestore write access for `designations` in the emulator's rules; if not automatable today the behaviour is pinned by unit tests — see below)
- **Steps:** 1. tick `Rua das Acácias, 45 - Pinheiros` → 2. submit while the write is forced to fail
- **Expected UI:** `handleTerritoryFormSubmit` leaves `selectedTerritoriesModel` untouched until the creation resolves and populates `assignedDesignations` only inside the success `subscribe` (the designation id — the map's key — only exists after the write). On failure the checkbox therefore **stays ticked and selectable**, the FAB stays enabled with its badge still reading `1`, and `shareDesignation` is never called (`TerritoryBO`'s `catchError` swallows the error and returns `EMPTY`, so nothing user-visible happens — the only trace is a `loggerService.error` call); the `finalize` still stops the FAB spinner. The admin can simply resubmit once the cause is fixed
- **Expected persistence:** `db.getCollectionDocs(db.collections.designations)` is unchanged (no new doc) — matching the DOM, which no longer claims anything is assigned
- **Edge cases:** this entry used to document the ⚠ defect "optimistic 'already assigned' marking survives a failed, silently-swallowed creation error" — the designation-map refactor resolved the marking (a failed create can no longer render rows checked-and-disabled), and the unit suite pins the rollback semantics (`assign-territories-page.component.spec.ts`); what **remains** is the silent failure (no error toast/dialog anywhere on this screen)
- **Priority:** P1 · **Gaps:** `⚠ residual gap` (silent failure surface); automating the e2e failure trigger still needs a harness hook (HX-4)

### Access control

#### UC-ASSIGN-22 — Authorised roles reach `/territories/assign`; `APP_ADMIN` bypasses the role list

- **Actor:** Admin
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline
- **Steps:** 1. sign in as admin → 2. `page.goto('/territories/assign')`
- **Expected UI:** page renders normally (per UC-ASSIGN-01); the same guard also allows `ELDER`, `ORGANIZER`,
  `SUPERINTENDENT` and `APP_ADMIN` (harness extensions needed for those identities, see below)
- **Expected persistence:** `db.getDoc(db.collections.users, seed.ids.adminUser).role === 'ADMIN'`
- **Edge cases:** the guard is declared once, on the **parent** `/territories` route as `canActivateChild`, not per-child — so `/territories`, `/territories/assign` and `/territories/statistics` always share exactly the same role list (`TERRITORY_ALLOWED_ROLES`); there is no way to grant access to one child without the others
- **Priority:** P0 · **Gaps:** `signInAs('elder' | 'organizer' | 'superintendent' | 'app_admin')` harness extension needed for the non-admin roles

#### UC-ASSIGN-23 — Signed-in publisher is redirected to `/welcome`

- **Actor:** Publisher
- **Route:** `/territories/assign`
- **Preconditions (seed):** default baseline
- **Steps:** 1. sign in as publisher → 2. `page.goto('/territories/assign')`
- **Expected UI:** `page` URL becomes `/welcome`; heading `Bem-Vindo {{ firstName }}!` renders instead
- **Expected persistence:** N/A (guard redirect, no Firestore write); assert
  `db.getCollectionDocs(db.collections.designations)` is unchanged
- **Edge cases:** this redirect applies uniformly to `/territories`, `/territories/assign` and
  `/territories/statistics` — do not special-case the assign route
- **Priority:** P0 · **Gaps:** none

#### UC-ASSIGN-24 — Anonymous access redirects to `/login`

- **Actor:** Anonymous
- **Route:** `/territories/assign`
- **Preconditions (seed):** none required beyond the default baseline
- **Steps:** 1. `page.goto('/territories/assign')` without signing in
- **Expected UI:** `page` URL becomes `/login`
- **Expected persistence:** N/A (auth guard, no Firestore write); assert
  `db.getCollectionDocs(db.collections.designations)` still equals the untouched baseline (1 doc,
  `seed-designation`) to prove no side effect occurred
- **Edge cases:** an anonymous visitor hitting `/work/:id` instead is **not** redirected at all (that route has no guard) — do not conflate the two
- **Priority:** P0 · **Gaps:** none

## Testability gaps (summary)

- **`data-testid` coverage is partial.** The screen carries the `assign-*` testids (heading, city select, territory list, checkbox rows) plus the FAB badge's `fab-badge` (from `FloatingActionButtonComponent`); the search input and the sort/filter dialog toggles still have none and rely on rendered pt-BR text / inner-element selectors.
- ~~**No selected-count UI** (UC-ASSIGN-12)~~ — **resolved**: the FAB's `fab-badge` renders `selectedTerritoriesModel.size` (hidden at `0`).
- **No success or error toast** anywhere in the create-and-share flow (UC-ASSIGN-15, UC-ASSIGN-21) — success is only inferable from the share-link popup/navigation, and failure is invisible to the user entirely.
- **No clipboard/copy affordance** exists (UC-ASSIGN-20) — only a WhatsApp deep link (`whatsapp://send?text=`).
- **Harness extensions needed:** a second congregation + non-default admin identity for the zero-territory and zero-cities edge cases (UC-ASSIGN-03, UC-ASSIGN-04, UC-ASSIGN-14); `signInAs` support for `ELDER`,
  `ORGANIZER`, `SUPERINTENDENT`, `APP_ADMIN` (UC-ASSIGN-22); a way to force a Firestore write failure to automate UC-ASSIGN-21 in e2e (its rollback semantics are unit-tested meanwhile).
- **Untested boundary:** congregations with more than 30 cities would make `getAllByCongregationAndCities`'s
  `where('city','in',cities)` exceed Firestore's real cap (UC-ASSIGN-18) — not reproduced by any seed today.
- **Documented current-behaviour-vs-defect items** (see the corresponding entry for the assertion to make today): UC-ASSIGN-04 (empty-`cities` ternary bug, shared with `UC-TERR-04`), UC-ASSIGN-16 (embedded
  `history` sliced from an unordered read, not the true 5 most recent), UC-ASSIGN-18 (batching comment cites the wrong Firestore limit), UC-ASSIGN-19 (share link uses `location.origin`, not `environment.baseUrl`). ~~UC-ASSIGN-21 (optimistic "already assigned" marking survives a failed, silently-swallowed creation error)~~ — **resolved**: assignment is marked only on successful creation; the silent-failure surface remains documented above.

## Sources

- `apps/ministry-maps/src/app/features/territory/pages/assign-territories-page/assign-territories-page.component.ts`
- `apps/ministry-maps/src/app/features/territory/pages/assign-territories-page/assign-territories-page.component.html`
- `apps/ministry-maps/src/app/features/territory/components/territory-checkbox/territory-checkbox.component.ts`
- `apps/ministry-maps/src/app/features/territory/bo/territory/territory.bo.ts`
- `libs/common-ui/src/lib/components/floating-action-btn/floating-action-button.component.ts` (FAB badge)
- `apps/ministry-maps/src/app/features/territory/bo/territory-alerts/territory-alerts.bo.ts`
- `apps/ministry-maps/src/app/features/territory/territory-routes.module.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-designation-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-territory-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/territories.repository.ts`, `designation.repository.ts`
- `apps/ministry-maps/src/app/core/features/congregation-settings/bo/congregation-settings.bo.ts`
- `apps/ministry-maps/src/app/shared/utils/share-utils.ts`, `open-google-maps.ts`, `user-agent.ts`,
  `territories-filter-pipe.ts`
- `apps/ministry-maps/src/app/shared/components/dialogs/history-dialog/history-dialog.component.ts`
- `apps/ministry-maps/src/app/features/territory/config/territory-filter.config.ts`
- `apps/ministry-maps/src/app/app-routes.ts`, `src/environments/environment.ts`
- `apps/ministry-maps/src/models/designation.ts`, `territory.ts`, `congregation.ts`,
  `enums/{designation-status,role}.ts`
- `apps/ministry-maps/e2e/seed/default.seed.ts`, `e2e/seed/factories/{territory,designation,congregation,user}.factory.ts`
- `apps/ministry-maps/e2e/fixtures/{auth,database}.fixture.ts`
- `apps/ministry-maps/docs/README.md`, `docs/domain/data-model.md`, `docs/domain/roles-and-permissions.md`,
  `docs/domain/glossary.md`, `docs/features/territories-management.md`
