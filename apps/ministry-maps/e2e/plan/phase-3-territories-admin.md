# Phase 3 — Territories admin (WP-13 … WP-21)

The `/territories` surface: list, filters, CRUD, alerts, export, assign, statistics — 76 catalog entries.
Specs here extend the one existing feature spec (`territories.spec.ts`) and introduce the remaining area
spec files.

---

### WP-13 — `tests/territories.spec.ts` extensions (list/search/sort)

- **Goal:** complete the list-level behaviours in the existing spec file.
- **Covers:** UC-TERR-01 (foreign-territory leg — baseline legs already covered), UC-TERR-02 (option
  order + `Todas` alphabetical ordering), UC-TERR-03 (empty city → zero rows), UC-TERR-04 (⚠ empty
  `cities` congregation collapses the filter), UC-TERR-05 (multi-word AND search), UC-TERR-06
  (accent-sensitive), UC-TERR-07 (`positionIndex` sort), UC-TERR-08 (`lastVisit` sort), UC-TERR-33
  (no maps button on this screen ⚠).
- **Depends on:** WP-03 (only for UC-TERR-04's empty-cities congregation identity); existing
  `TerritoriesPage` PO.
- **Files:** edit `e2e/tests/territories.spec.ts` (append a new `test.describe` per group); extend
  `TerritoriesPage` with `searchInput` (`lib-search-input`), `cityOptions()` (option texts), `rowCount()`.
- **Context to read first:** `docs/features/territories-management.md` §Listing, §Search, §Sorting,
  §Maps-link affordance.
- **Implementation notes:**
  - UC-TERR-02: assert option order `São Paulo`, `Osasco`, `Todas` and the per-scope ordering rules
    (positionIndex per city vs `city.localeCompare` under `Todas`).
  - UC-TERR-05/06: search through `lib-search-input`'s inner `input`; remember the haystack is
    `address + note` **with no separator** and accents are significant.
  - UC-TERR-04: seed a `cities: []` congregation + admin, sign in via `signInAsUser`, assert
    `territories-list` is **absent** and the select has only `Todas` (⚠ reality).
  - UC-TERR-33: assert no maps icon/button inside `territory-list-item` (locks in the absence).
- **Acceptance criteria:** existing three tests untouched and green; 9 entries implemented.

### WP-14 — `tests/territories-filters.spec.ts`

- **Goal:** the sort/filter dialog end to end, including persistence.
- **Covers:** UC-TERR-09 (bible-student toggle), UC-TERR-10 (moved toggle), UC-TERR-11 (icon select),
  UC-TERR-12 (⚠ badge counts default toggle as active → assert `1` on fresh load), UC-TERR-13
  (localStorage persistence across reload, key `sort-filter-state`).
- **Depends on:** WP-06 (testids), WP-07 (`SortFilterDialogPage`).
- **Files:** create `e2e/tests/territories-filters.spec.ts`; extend `TerritoriesPage` with
  `sortFilterTrigger` + `activeFilterBadge` if not in the shared PO.
- **Context to read first:** `docs/features/territories-management.md` §Sort/filter dialog.
- **Implementation notes:**
  - UC-TERR-10 needs an unresolved-`MOVED` territory (`recentHistory: [{ visitOutcome: 2, isResolved:
false }]`) — patch the parent doc via `db.firestore` after `seed.write` (the seeder derives
    `recentHistory` from `history`; a direct patch is the documented route).
  - UC-TERR-13: read `localStorage` via `page.evaluate`; assert JSON shape
    `{ sort: 'LAST_VISIT', filters: { includeBibleStudent: true, includeMoved: true, icon: '' } }`;
    after `page.reload()` assert the list order reflects the persisted sort without reopening the dialog.
- **Acceptance criteria:** 5 entries green.

### WP-15 — `tests/territories-crud.spec.ts`

- **Goal:** create/edit/delete/reorder with full persistence proof.
- **Covers:** UC-TERR-14 (required-field gating), UC-TERR-15 (city prefill), UC-TERR-16 (⚠ instructor
  reset), UC-TERR-17 (`positionIndex` max+1), UC-TERR-18 (create vs edit labels), UC-TERR-19 (edit merged
  diff), UC-TERR-20 (delete + orphaned history ⚠), UC-TERR-21 (drag reorder persists), UC-TERR-22 (drag
  handle gating).
- **Depends on:** WP-06 (testids), WP-07 (`ConfirmDialogPage`), WP-04 (`cdk-drag.util` for UC-TERR-21).
- **Files:**
  - create `e2e/page-objects/territory-manage-dialog.page.ts` (`title`, `addressInput`
    (`#territory-address`), `citySelect`, `iconSelect`, `peopleInput`, `mapsLinkInput`,
    `bibleStudentCheckbox`, `instructorInput`, `submit()`, `cancel()`).
  - create `e2e/tests/territories-crud.spec.ts`.
- **Context to read first:** `docs/features/territories-management.md` §Create dialog, §Edit dialog,
  §Delete territory, §Drag-and-drop reorder; `docs/domain/data-model.md` §4.3.
- **Implementation notes:**
  - UC-TERR-17: assert the new doc's `positionIndex === 3` in São Paulo (baseline max 2); note the
    allocation query is **not** congregation-scoped (§4.3) — keep seeds clean of cross-congregation city
    collisions in this spec.
  - UC-TERR-20: after `ConfirmDialogPage.confirm()`, assert parent doc `undefined` **and** the orphaned
    `history` subcollection still returns its 2 docs (⚠ reality).
  - UC-TERR-21: use `dragRowByMouse`; assert both swapped `positionIndex` values via `db.getDoc`.
  - UC-TERR-22: assert handle absence under `Todas` and the disabled state + verbatim
    `Para ordernar manualmente, use a ordenação Ordem de Cadastro` title (typo included) under
    `Última Visita`.
- **Acceptance criteria:** 9 entries green.

### WP-16 — `tests/territories-alerts.spec.ts`

- **Goal:** badges, history dialog, and the three alert-resolution dialogs.
- **Covers:** UC-TERR-23, UC-TERR-24, UC-TERR-25, UC-TERR-26 (badges), UC-TERR-27 (⚠ note-gated
  rendering), UC-TERR-28 (⚠ unordered full-subcollection history dialog), UC-TERR-29 (history menu
  always visible), UC-TERR-30 (resolve `Mudou` — `Remover Marcação` persistence +
  `Apagar Endereço`/`Editar Endereço` mappings), UC-TERR-31 (⚠ `Revisita` resolution truncates
  `recentHistory` → assert `length === 1`), UC-TERR-32 (resolve `Não Visitar`).
- **Depends on:** WP-06 (testids), WP-07 (`HistoryDialogPage`, `ConfirmDialogPage`).
- **Files:**
  - create `e2e/page-objects/territory-alerts.page.ts` (one PO for the three resolution dialogs:
    `title`, `selectOption(label)`, `save()`; radios via `kingdom-apps-icon-radio` text).
  - create `e2e/tests/territories-alerts.spec.ts`.
- **Context to read first:** `docs/features/territories-management.md` §Alert badges, §Visit-history
  dialog, §resolution dialogs; `docs/domain/data-model.md` §4.1, §4.4.
- **Implementation notes:**
  - **Every badge seed needs a non-empty `note`** (UC-TERR-27) — bake this into a spec-local seed helper.
  - Badge assertions: text + `title` attribute verbatim (`Estudante`, `Mudou`, `Não quer visitas`,
    `Revisita`).
  - Resolution assertions always check **both** stores: the `history/{visitId}` subcollection doc
    (`isResolved: true`) and the parent `recentHistory` entry — and for UC-TERR-31 the truncation of the
    unrelated entry (⚠ assert `recentHistory.length === 1`).
  - UC-TERR-28: assert the dialog shows **all** seeded visits (not capped at 5) — assert as a set, never
    as an order (unordered query).
- **Acceptance criteria:** 10 entries green.

### WP-17 — `tests/territories-export.spec.ts` (+ overflow role gating)

- **Goal:** CSV export correctness and the overflow-menu role rules.
- **Covers:** UC-TERR-34 (download, filename, BOM, headers, `;` delimiter, sorted rows, `dd/MM/yyyy`),
  UC-TERR-35 (overflow hidden for ORGANIZER/ELDER), UC-TERR-36 (list-item menu excludes ORGANIZER).
- **Depends on:** WP-04 (`csv-download.util`), WP-01 (organizer/elder identities).
- **Files:** create `e2e/tests/territories-export.spec.ts`; extend `TerritoriesPage` with
  `overflowMenu`/`exportItem` locators (from WP-06 testids).
- **Context to read first:** `docs/features/territories-management.md` §CSV export, §Role gating.
- **Implementation notes:**
  - CSV content assertions: starts with `\uFEFF`; first line exactly
    `Cidade;Endereço;Observação;Link do Mapa;Ícone;Estudante da Bíblia;Instrutor da Bíblia;Última Visita`;
    row count === `db.getCollectionDocs(territories).length`; first data row's city `Osasco` (sorted);
    `bibleInstructor` exported as the **raw uid** (`seed-user-publisher-1`).
  - Filename: match `/^mm-territorios-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.csv$/`.
  - Success toast: `Territórios exportados com sucesso.` (use `ToastPage`).
  - UC-TERR-35/36: `signInAs('organizer')`/`signInAs('elder')` — assert the ⋮ trigger absent and the
    item menu showing only `Histórico` for organizer.
- **Acceptance criteria:** 3 entries green.

### WP-18 — `tests/territories-assign.spec.ts` part A (listing & selection)

- **Goal:** the assign page's listing, filtering and selection mechanics.
- **Covers:** UC-ASSIGN-01 (render + disabled submit), UC-ASSIGN-02 (city select + `Todas` alphabetical),
  UC-ASSIGN-03 (zero territories — no crash, submit impossible), UC-ASSIGN-04 (⚠ empty `cities`),
  UC-ASSIGN-05 (search), UC-ASSIGN-06 (bible-student toggle), UC-ASSIGN-07 (moved → `Se Mudou` confirm),
  UC-ASSIGN-08 (no-visit → `Não visitar` confirm), UC-ASSIGN-09 (checkbox ↔ submit disabled),
  UC-ASSIGN-10 (decline confirm → unticked), UC-ASSIGN-11 (selections persist across city switches).
- **Depends on:** WP-05 (testids), WP-07 (`SortFilterDialogPage`, `ConfirmDialogPage`), WP-03 (for
  UC-ASSIGN-03/04's second-congregation identities).
- **Files:**
  - create `e2e/page-objects/assign-territories.page.ts` (`heading`, `cityFilter`,
    `checkboxByAddress(address)` filtering `assign-territory-checkbox`, `submitFab`
    (`title="Enviar Designação"`), `searchInput`).
  - create `e2e/tests/territories-assign.spec.ts` (this WP adds part A; WP-19 extends the same file).
- **Context to read first:** `docs/features/territories-assign.md` §Listing, §Search/sort/filter,
  §Selecting and deselecting.
- **Implementation notes:**
  - Alert-confirm seeds mirror WP-14/WP-16: `recentHistory` patched with unresolved outcome entries.
  - UC-ASSIGN-07/08 dialog titles verbatim: `Se Mudou` / `Não visitar`, with the exact two-line bodies.
  - UC-ASSIGN-11: after switching city away and back, assert the row's checkbox is checked again
    (`input[type=checkbox]:checked` inside the row).
  - UC-ASSIGN-03: second congregation with a city and zero territories — assert heading renders, zero
    rows, FAB permanently disabled, and `designations` count unchanged after the visit.
- **Acceptance criteria:** 11 entries green.

### WP-19 — `tests/territories-assign.spec.ts` part B (creation & share)

- **Goal:** designation creation, persistence shape, expiry derivation, share link.
- **Covers:** UC-ASSIGN-12 (⚠ no selected-count UI), UC-ASSIGN-13 (`expiresAt` = now + N days raw ms),
  UC-ASSIGN-14 (missing settings → 45-day env default), UC-ASSIGN-15 (top-level fields), UC-ASSIGN-16
  (embedded snapshot shape ⚠), UC-ASSIGN-17 (overlapping designations), UC-ASSIGN-18 (35-territory
  batching), UC-ASSIGN-19 (⚠ share link via `location.origin` + whatsapp popup), UC-ASSIGN-20 (⚠ no
  clipboard affordance), UC-ASSIGN-22 (role matrix + APP_ADMIN bypass). (UC-ASSIGN-21 stays blocked —
  HX-4; UC-ASSIGN-23/24 owned by WP-08.)
- **Depends on:** WP-04 (`whatsapp-link.util`), WP-01 (role matrix), WP-03 (UC-ASSIGN-14's
  settings-less congregation).
- **Files:** extend `e2e/tests/territories-assign.spec.ts` + `AssignTerritoriesPage`.
- **Context to read first:** `docs/features/territories-assign.md` §Expiry derivation, §Designation
  creation, §The generated share link, §Access control.
- **Implementation notes:**
  - Prevent the whatsapp popup from derailing the page: capture via `captureWhatsAppPopup(page, () =>
fab.click())` and assert `sharedUrl` starts with `page.url()`'s origin + `/work/` — decode the id
    from `sharedUrl` for all persistence assertions.
  - UC-ASSIGN-13: assert `expiresAt.toMillis()` ≈ `createdAt.toMillis() + 7 * 86_400_000` (few-seconds
    tolerance).
  - UC-ASSIGN-16: assert each embedded entry has `status === 'PENDING'`, a `history` key, and **no**
    `recentHistory` key; the >5-visits unordered-slice ⚠ leg is documented — assert the weak contract
    (`history.length === 5` with 6+ seeded visits), not which visits they are.
  - UC-ASSIGN-17: `page.reload()` between submissions (resets the assigned Sets — see the corrected note
    in the feature doc); assert both docs independent.
  - UC-ASSIGN-18: seed 35 territories in one city; assert designation length 35 (slow spec — keep it
    focused; no extra assertions).
  - UC-ASSIGN-22: loop `['elder','organizer','superintendent','app_admin']` + admin reaching the page.
- **Acceptance criteria:** 10 entries green.

### WP-20 — `tests/territories-statistics.spec.ts` part A (static & counting rules)

- **Goal:** the `Gerais` section and the visit/revisita counting rules.
- **Covers:** UC-STAT-01 (totals; `peopleQuantity: 0` counts as 1 ⚠), UC-STAT-02 (city scoping),
  UC-STAT-03 (`Mudaram` from `recentHistory` ⚠ 5-cap caveat), UC-STAT-10 (visits = outcomes 0 and 4
  only), UC-STAT-11 (revisitas = `isRevisit` boolean only), UC-STAT-12 (full subcollection — 7 visits).
- **Depends on:** WP-06 (testids).
- **Files:**
  - create `e2e/page-objects/statistics.page.ts` (`heading`, `cityFilter`, `periodFilter`,
    `staticSection`, `dynamicSection`, `tile(testid)` per metric).
  - create `e2e/tests/territories-statistics.spec.ts` (this WP adds part A; WP-21 extends the same file).
- **Context to read first:** `docs/features/territories-statistics.md` §Gerais, UC-STAT-10/11/12.
- **Implementation notes:**
  - Tile assertions match the rendered `Label: N` text (e.g. `Territórios: 3`).
  - UC-STAT-10: one territory, 5 visits today (one per outcome 0–4) → `Visitas: 2`.
  - UC-STAT-12: 7 visits → `Visitas: 7` while parent `recentHistory` holds 5 (proves subcollection
    sourcing).
- **Acceptance criteria:** 6 entries green.

### WP-21 — `tests/territories-statistics.spec.ts` part B (periods & boundaries)

- **Goal:** every period option, boundary rules, and access/empty cases.
- **Covers:** UC-STAT-04, UC-STAT-05, UC-STAT-06, UC-STAT-07, UC-STAT-08, UC-STAT-09 (the six period
  options), UC-STAT-13 (empty congregation zeros), UC-STAT-14 (loading state — mechanism level),
  UC-STAT-15 (organizer access), UC-STAT-18 (history-less territory), UC-STAT-19 (out-of-period
  exclusion). (UC-STAT-16/17 owned by WP-08's matrices.)
- **Depends on:** WP-06 (testids), WP-01 (organizer), WP-03 (empty-congregation identity).
- **Files:** extend `e2e/tests/territories-statistics.spec.ts` + `StatisticsPage`.
- **Context to read first:** `docs/features/territories-statistics.md` §Por período (incl. the
  clock-relative note), §Boundary and Access cases.
- **Implementation notes:**
  - **All period seeds compute dates from `new Date()`** (see J-07's seed pattern — same arithmetic);
    baseline 2024 history contributes 0 to every period.
  - Period select labels verbatim: `Este Mês`, `1 Mês`, `3 Meses`, `6 meses`, `1 ano`, `Este Ano`.
  - UC-STAT-19: visit on the 15th of last month → `Este Mês` shows `Visitas: 0`.
- **Acceptance criteria:** 11 entries green.

---

## Phase 3 exit checklist

- [ ] 76 catalog entries implemented across 7 spec-file WPs.
- [ ] `territories.spec.ts` original tests unchanged and green.
- [ ] `typecheck-e2e` + full suite green (twice — isolation check).
