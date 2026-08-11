# Territories management (`UC-TERR`)

This document describes the behavioural use cases for the `/territories` screen: the congregation's
territory list, its search/sort/filter tooling, territory CRUD, drag-and-drop reordering, alert badges and
their resolution dialogs, the visit-history dialog, and CSV export.

**Route:** `/territories`
**Actors:** `ADMIN`, `ELDER`, `ORGANIZER`, `SUPERINTENDENT`, `APP_ADMIN` can reach the page (see
[`../domain/roles-and-permissions.md`](../domain/roles-and-permissions.md)); `PUBLISHER` is redirected to
`/welcome`; anonymous visitors are redirected to `/login`. Within the page, `ORGANIZER` sees a materially
reduced UI (no overflow menu, no edit/delete/alert-resolution on list items) — see the *Role gating* group.
Field/model shapes referenced below are defined in [`../domain/data-model.md`](../domain/data-model.md);
pt-BR ↔ English vocabulary is in [`../domain/glossary.md`](../domain/glossary.md).

### Listing and city scope

#### UC-TERR-01 — List shows only the signed-in user's congregation territories
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline (3 territories in `seed-congregation`); plus 1 extra territory with a different `congregationId`
- **Steps:** 1. sign in as admin → 2. open `/territories`
- **Expected UI:** `territories-list` (`data-testid`) renders only the 3 territories whose `congregationId === seed.ids.congregation`; the foreign territory never appears, in any city filter state
- **Expected persistence:** `db.queryWhere(db.collections.territories, 'congregationId', '==', seed.ids.congregation)` returns exactly the 3 baseline territories; `db.getCollectionDocs(db.collections.territories)` returns 4 (baseline + foreign)
- **Edge cases:** the query (`getAllByCongregation`) has no `city` clause — city is filtered client-side, so a large congregation always downloads its full territory set
- **Priority:** P0 · **Gaps:** none

#### UC-TERR-02 — City `<select>` mirrors `congregation.cities`, "Todas" is a synthetic last option, ordering differs by scope
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline (`cities: ['São Paulo', 'Osasco']`)
- **Steps:** 1. open `/territories` → 2. inspect `territories-city-filter` (`data-testid`) options → 3. select `São Paulo` (default) → 4. select `Todas`
- **Expected UI:** options are, in order, `São Paulo`, `Osasco`, `Todas` (cities first, in `congregation.cities` array order, `Todas` always last); on load the first city (`São Paulo`) is pre-selected, listing its 2 territories sorted by `positionIndex` (0, 2); selecting `Todas` shows all 3, sorted **alphabetically by `city`** (Osasco's territory first, then the two São Paulo ones) — a different sort rule than the per-city view
- **Expected persistence:** `db.getDoc(db.collections.congregations, seed.ids.congregation)` has `cities: ['São Paulo', 'Osasco']` in that order
- **Edge cases:** `Todas` never applies the "Ordem de Cadastro"/"Última Visita" sort chosen in the sort dialog — it is hard-coded to `city.localeCompare` in `territoriesFilterPipe`
- **Priority:** P0 · **Gaps:** no `data-testid` on individual `<option>`s

#### UC-TERR-03 — Empty state: selected city has no territories
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline; congregation's `cities` extended with `'Guarulhos'` (no territory in that city)
- **Steps:** 1. open `/territories` → 2. select `Guarulhos`
- **Expected UI:** `territories-list` container still renders (the `@if` on the observable is still truthy) but contains zero `territory-list-item` rows
- **Expected persistence:** `db.queryWhere(db.collections.territories, 'city', '==', 'Guarulhos')` returns an empty array
- **Edge cases:** no dedicated "nenhum território encontrado" copy exists — the section is simply empty
- **Priority:** P2 · **Gaps:** no empty-state message/testid to assert against; test must assert row count `0`

#### UC-TERR-04 — ⚠ Empty congregation (no cities) breaks the filter
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** congregation with `cities: []` and 0 territories
- **Steps:** 1. sign in as a user of that congregation → 2. open `/territories`
- **Expected UI:** `ngOnInit` runs `this.selectedCity = this.cities.length >= 0 ? this.cities[0] : ALL_OPTION` — since an array's `length` is **always** `>= 0`, `cities[0]` (i.e. `undefined`) is assigned instead of falling back to `ALL_OPTION`. `cityFilter(t, undefined)` then calls `undefined.toLowerCase()` and throws inside the `map()` in `territoriesFilterPipe`, which errors the `filteredTerritories$` observable. **Today's reality (verified):** the error aborts rendering of the **entire** page content — the router outlet renders an empty `<main>` with no heading, no city `<select>` and no `territories-list` section (no error banner either)
- **Expected persistence:** `db.getDoc(db.collections.congregations, id)` has `cities: []`; `db.getCollectionDocs(db.collections.territories)` is empty
- **Edge cases:** assert `data-testid="territories-heading"`, `territories-city-filter` and `territories-list` are **all** absent (empty outlet), and that the congregation doc has `cities: []` — do not assert a graceful empty state, that is not current behaviour
- **Priority:** P1 · **Gaps:** `⚠ suspected defect` — condition should be `cities.length > 0`; consolidate in `testability-gaps.md`

### Search

#### UC-TERR-05 — Multi-word search AND-matches across `address` and `note`
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline; seed 1 extra territory `address: 'Rua das Flores, 123 - Vila Mariana'`, `note: 'Prédio com portaria, falar com o porteiro.'` (the `buildTerritory` default note)
- **Steps:** 1. open `/territories`, select `Todas` → 2. type `flores porteiro` into `lib-search-input`
- **Expected UI:** only the extra territory remains in `territories-list`; typing `flores inexistente` (a word matching neither field) yields zero results
- **Expected persistence:** `db.getDoc(db.collections.territories, id).address` and `.note` both contain the searched substrings (assert the seeded strings the UI is filtering over)
- **Edge cases:** `territoriesFilterPipe` builds the haystack as `(t.address + t.note).toLowerCase()` with **no separator** between the two fields — a search term that spans the literal boundary (last chars of `address` + first chars of `note`) can match even though it is not a real substring of either field alone; `searchTerm.split(' ')` on a string with repeated/leading/trailing spaces produces empty-string terms which match everything (harmless no-op)
- **Priority:** P0 · **Gaps:** no `data-testid` on the search input (relies on `lib-search-input` component internals)

#### UC-TERR-06 — Search is case-insensitive but accent-sensitive
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline (territory `seed-territory-1`, address `Rua das Acácias, 45 - Pinheiros`)
- **Steps:** 1. open `/territories`, select `Todas` → 2. search `ACÁCIAS` (uppercase, correct accent) → 3. clear, search `acacias` (no accent)
- **Expected UI:** step 2 shows `seed-territory-1` (case folded via `.toLowerCase()` on both sides); step 3 shows **zero** results because `á` and `a` are never normalised/stripped by the pipe
- **Expected persistence:** `db.getDoc(db.collections.territories, 'seed-territory-1').address === 'Rua das Acácias, 45 - Pinheiros'`
- **Edge cases:** this is current, intended-looking behaviour (not flagged as a defect) but must be documented since a naive test author would expect accent-insensitive search
- **Priority:** P1 · **Gaps:** none

### Sorting

#### UC-TERR-07 — "Ordem de Cadastro" sorts by saved `positionIndex`
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline, city `São Paulo` selected (`seed-territory-1` `positionIndex 0`, `seed-territory-3` `positionIndex 2`)
- **Steps:** 1. open `/territories` (default sort is `SAVED_INDEX`, city `São Paulo`)
- **Expected UI:** `Rua das Acácias, 45 - Pinheiros` (index 0) renders above `Rua Harmonia, 300 - Vila Madalena` (index 2)
- **Expected persistence:** `db.getDoc(db.collections.territories,'seed-territory-1').positionIndex === 0`; `db.getDoc(db.collections.territories,'seed-territory-3').positionIndex === 2`
- **Edge cases:** territories missing `positionIndex` sort as `0` (`t1.positionIndex ?? 0`), so they float to the top ahead of explicitly-indexed items
- **Priority:** P1 · **Gaps:** none

#### UC-TERR-08 — "Última Visita" sorts by `lastVisit`
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline, city `São Paulo`; `seed-territory-1` last visit `2024-03-10` (`REVISIT`), `seed-territory-3` last visit `2024-03-12` (`SPOKE`)
- **Steps:** 1. open the sort/filter dialog → 2. choose `Última Visita` in "Ordenar por" → 3. "Aplicar"
- **Expected UI:** order flips ascending by `lastVisit` — `seed-territory-1` (2024-03-10) now above `seed-territory-3` (2024-03-12)
- **Expected persistence:** `db.getDoc(db.collections.territories,'seed-territory-1').lastVisit` and `.../seed-territory-3').lastVisit` reflect the seeded dates
- **Edge cases:** a territory with no `lastVisit` sorts as epoch `0` (oldest first), so unvisited territories always float to the top of this sort
- **Priority:** P1 · **Gaps:** none

### Sort/filter dialog

#### UC-TERR-09 — "Estudantes da Bíblia" toggle (default ON) hides bible-student territories when turned off
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline (`seed-territory-3` has `isBibleStudent: true`), city `São Paulo`
- **Steps:** 1. open `/territories` (both São Paulo territories visible by default) → 2. open the sort/filter dialog (title `Ordenar e Filtrar`) → 3. untick "Estudantes da Bíblia" (secondary text `Filtrar territórios com estudantes da Bíblia`) → 4. "Aplicar"
- **Expected UI:** `Rua Harmonia, 300 - Vila Madalena` disappears from the list; toggling it back on restores it
- **Expected persistence:** `db.getDoc(db.collections.territories,'seed-territory-3').isBibleStudent === true`
- **Edge cases:** the toggle's default is `true` in `TERRITORY_SORT_FILTER_CONFIG.filterConfigs.initial`, so bible-student territories are visible on a fresh page load without any user action
- **Priority:** P1 · **Gaps:** no `data-testid` on the toggle

#### UC-TERR-10 — "Territórios que Mudaram" toggle (default OFF) reveals unresolved-moved territories
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline; plus 1 territory with `recentHistory` containing a `MOVED` (`2`) entry, `isResolved: false`, and a non-empty `note`
- **Steps:** 1. open `/territories`, select `Todas` (moved territory absent by default) → 2. open sort/filter dialog → 3. tick "Territórios que Mudaram" (secondary text `Incluir territórios que mudaram de endereço`) → 4. "Aplicar"
- **Expected UI:** the moved territory appears in `territories-list` only after ticking the toggle
- **Expected persistence:** `db.getSubcollectionDocs(db.collections.territories, tid, db.historySubcollection)` or `db.getDoc(...).recentHistory` has an entry `{ visitOutcome: 2, isResolved: false }`
- **Edge cases:** `TerritoryAlertsBO.hasRecentlyMoved` ignores entries with `isResolved: true` — a resolved MOVED entry is shown regardless of this toggle
- **Priority:** P1 · **Gaps:** none

#### UC-TERR-11 — Icon `<select>` filter narrows the list to one `TerritoryIcon`
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline, city `São Paulo` (`seed-territory-1` icon `cp`/`Casal`, `seed-territory-3` icon `m`/`Homem`)
- **Steps:** 1. open sort/filter dialog → 2. select `Homem` under "Ícone" (placeholder `Todos`) → 3. "Aplicar"
- **Expected UI:** only `Rua Harmonia, 300 - Vila Madalena` remains
- **Expected persistence:** `db.getDoc(db.collections.territories,'seed-territory-3').icon === 'm'`
- **Edge cases:** clearing back to `Todos` (empty string) restores both; `icon` and city/text filters are cumulative (AND), not exclusive alternatives
- **Priority:** P2 · **Gaps:** none

#### UC-TERR-12 — ⚠ Active-filter badge counts the default toggle as "active" from first render
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline
- **Steps:** 1. open `/territories` fresh (no interaction with the sort/filter dialog yet)
- **Expected UI:** the `sort-filter__badge` next to the filter icon already shows `1`. `SortFilterComponent.activeFilterCount` compares `currentValue().filters` against `initialValue()` (the component's own `input()`, defaulting to `{ sort: undefined, filters: undefined }`) — **not** against `config.filterConfigs.initial`. Since `includeBibleStudent: true` differs from that empty baseline, it is counted even though the user changed nothing
- **Expected persistence:** N/A (client-only UI state); assert against the config default `TERRITORY_SORT_FILTER_CONFIG.filterConfigs.initial === { includeBibleStudent: true }`
- **Edge cases:** counter-intuitively, explicitly **unticking** "Estudantes da Bíblia" (setting it to `false`) drops the badge back to `0`, because `countActiveFilters` excludes any current value that is `false`/`''`/`null`/`undefined` regardless of whether it differs from a baseline — so the badge does not mean "N filters differ from the app default", it means "N filter values are currently truthy and differ from an empty object"
- **Priority:** P2 · **Gaps:** `⚠ suspected defect` — badge baseline should be `config.filterConfigs.initial`, not the unset `initialValue` input; test must assert `1` on fresh load, not `0`

#### UC-TERR-13 — Sort/filter state persists in `localStorage` across reload
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline
- **Steps:** 1. open `/territories` → 2. open sort/filter dialog → 3. choose `Última Visita`, tick "Territórios que Mudaram" → 4. "Aplicar" → 5. reload the page
- **Expected UI:** after reload, `territories-list` is already sorted by last visit without reopening the dialog (the component re-emits on `ngOnInit`)
- **Expected persistence:** browser `localStorage.getItem('sort-filter-state')` (fixed key — `storeFilterState` is set on `<lib-sort-filter>` without a custom `[storageKey]`) equals a JSON string of shape `{ "sort": "LAST_VISIT", "filters": { "includeBibleStudent": true, "includeMoved": true, "icon": "" } }`
- **Edge cases:** persisted state is global per browser origin, not scoped per user/congregation — signing in as a different user in the same browser profile inherits the previous session's sort/filter
- **Priority:** P1 · **Gaps:** none (Playwright can read `localStorage` via `page.evaluate`)

### Create dialog

#### UC-TERR-14 — Required-field validation blocks submit
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline
- **Steps:** 1. click the floating "+" button (`title="Adicionar Território"`) → 2. observe the `Endereço` field is empty → 3. clear/leave it empty
- **Expected UI:** dialog title `Adicionar Território`; submit button (`Adicionar`) is `disabled` while `Endereço` is empty (the only field with no default value and `Validators.required`); typing any address enables it
- **Expected persistence:** N/A — no document is written while invalid
- **Edge cases:** `Cidade`, `Ícone` and `Quantidade de pessoas` all ship with non-empty defaults (`cities[0]`, `m`, `1`), so in practice only `Endereço` gates the button on a fresh form
- **Priority:** P0 · **Gaps:** no `data-testid`s on the manage-dialog form fields (rely on `#territory-address`, label text)

#### UC-TERR-15 — City prefills from the currently selected city filter
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline
- **Steps:** 1. select city `Osasco` in the page filter → 2. click "+"
- **Expected UI:** the `Cidade` `<select>` inside the dialog opens pre-set to `Osasco`; if the page filter is `Todas` instead, it falls back to `data.cities[0]` (`São Paulo`)
- **Expected persistence:** after filling `Endereço` and submitting, the new doc's `city === 'Osasco'`
- **Edge cases:** `Cidade` options only list `congregation.cities` — a territory cannot be created in a city outside that list from this dialog
- **Priority:** P1 · **Gaps:** none

#### UC-TERR-16 — Bible-student toggle reveals the instructor field; ⚠ re-checking clears it
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline
- **Steps:** 1. open the create dialog → 2. tick `Estudando a Bíblia` → 3. type a name into `Instrutor` (placeholder `Nome do Instrutor`) → 4. untick, then re-tick `Estudando a Bíblia`
- **Expected UI:** `Instrutor` only renders while the checkbox is checked; after step 4 the field is visible again but **empty** — `isBibleStudent.valueChanges` calls `bibleInstructor.reset()` whenever the emitted value is truthy, wiping whatever was typed
- **Expected persistence:** submitting right after step 3 (without unchecking) would persist `bibleInstructor` as typed; submitting after step 4 persists `bibleInstructor: null` (the form control's `reset()` value is serialized as `null` by the Firestore write)
- **Edge cases:** on **edit** of an existing bible-student territory the field is correctly pre-filled, because `patchValue` runs before the listener is attached — the data loss only happens from interactively toggling within one dialog session
- **Priority:** P2 · **Gaps:** `⚠ suspected defect` — listener should reset on the *false* transition, not the *true* one

#### UC-TERR-17 — `positionIndex` is allocated as max+1 per city on create
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline, city `São Paulo` (`positionIndex` 0 and 2 already used)
- **Steps:** 1. select `São Paulo` → 2. "+" → 3. fill `Endereço` → 4. "Adicionar"
- **Expected UI:** dialog closes; new item appears in the São Paulo list
- **Expected persistence:** `getNextPositionIndexForCity('São Paulo')` queries `where('city','==','São Paulo')` + `orderBy('positionIndex','desc')` + `limit(1)`, so the new doc's `positionIndex === 3` (last used `2`, plus 1); assert via `db.queryWhere(db.collections.territories,'city','==','São Paulo')` and check the max
- **Edge cases:** the allocation query is **not** scoped by `congregationId` (see [`data-model.md §4.3`](../domain/data-model.md#43-positionindex-is-allocated-per-city)) — seeding another congregation's territory in the same city with a higher `positionIndex` changes the number a fresh territory receives here
- **Priority:** P1 · **Gaps:** none

#### UC-TERR-18 — Create vs edit dialog: title and submit label differ
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline
- **Steps:** 1. click "+" (create) → observe → 2. cancel → 3. open the menu on `seed-territory-1` → `Editar` (edit) → observe
- **Expected UI:** create: title `Adicionar Território`, submit button text `Adicionar`; edit: title `Editar Território`, submit button text `Salvar`; both share `Cancelar`
- **Expected persistence:** N/A (pure UI)
- **Edge cases:** the spinner shown while `isSubmitting` replaces the label text in both modes, so a slow submit briefly hides `Adicionar`/`Salvar`
- **Priority:** P2 · **Gaps:** none

### Edit dialog

#### UC-TERR-19 — Edit dialog pre-fills existing values and persists a merged diff
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline (`seed-territory-2`: Osasco, `Av. dos Autonomistas, 1200 - Centro`, icon `w`)
- **Steps:** 1. open the menu on `seed-territory-2` → `Editar` → 2. verify `Cidade=Osasco`, `Endereço=Av. dos Autonomistas, 1200 - Centro`, `Ícone=Mulher` are pre-filled → 3. change `Endereço` to `Av. dos Autonomistas, 1200 - Centro (fundos)` → 4. `Salvar`
- **Expected UI:** dialog closes; the list item re-renders (live `collectionData` listener) with the new address
- **Expected persistence:** `db.getDoc(db.collections.territories,'seed-territory-2').address === 'Av. dos Autonomistas, 1200 - Centro (fundos)'`; unchanged fields (`city`, `icon`, `positionIndex`) retain their original values, since submission spreads `{ ...data.territory, ...form.value }`
- **Edge cases:** the form's `note` control has no validator and starts `''` — editing a territory whose `note` was previously unset always shows an empty textarea, never `undefined`
- **Priority:** P0 · **Gaps:** none

### Delete territory

#### UC-TERR-20 — Delete confirmation, doc removal, and orphaned history
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline (`seed-territory-1`, which has 2 `history` subcollection docs)
- **Steps:** 1. open the menu on `seed-territory-1` → `Apagar` → 2. observe the confirmation dialog → 3. `Confirmar`
- **Expected UI:** dialog title `Excluir Território`; body text exactly `Você realmente deseja excluir este território?` then `Essa ação não poderá ser desfeita`; footer buttons `Cancelar` / `Confirmar`; after confirming, the item disappears from `territories-list`
- **Expected persistence:** `db.getDoc(db.collections.territories,'seed-territory-1')` is `undefined`; `db.getSubcollectionDocs(db.collections.territories, 'seed-territory-1', db.historySubcollection)` still returns its **2** history docs — `TerritoryRepository.delete` only calls Firestore `deleteDoc` on the parent, Firestore never cascade-deletes subcollections
- **Edge cases:** clicking `Cancelar` closes the dialog with no request sent and the territory remains
- **Priority:** P0 · **Gaps:** `⚠ suspected defect` — orphaned `history` subcollection after delete; test should assert the subcollection **survives** (reality), not that it is cleaned up

### Drag-and-drop reorder

#### UC-TERR-21 — Reordering persists `positionIndex` via a batched transaction
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline, city `São Paulo` selected, sort `Ordem de Cadastro` (default) — required for drag to be enabled
- **Steps:** 1. drag `Rua das Acácias, 45 - Pinheiros` (index 0) below `Rua Harmonia, 300 - Vila Madalena` (index 2) using a mouse-based sequence (`hover` → `mouse.down()` → several `mouse.move()` steps → `mouse.up()`; native HTML5 drag events are not dispatched by Playwright and CDK drag-drop does not use them)
- **Expected UI:** the list re-renders immediately with the new order (optimistic local update)
- **Expected persistence:** `moveItemInArray` recomputes `positionIndex` for every item by its new array index, but `handleTerritoryDrop` only sends the ones whose index actually changed to `batchUpdate` (a `runTransaction`); assert `db.getDoc(db.collections.territories,'seed-territory-1').positionIndex === 2` and `.../seed-territory-3').positionIndex === 0` after the swap
- **Edge cases:** dropping on the same index (`previousIndex === currentIndex`) is a no-op, no write occurs
- **Priority:** P1 · **Gaps:** no `data-testid` on the drag handle button; requires Playwright's low-level mouse API, not `dragTo()`

#### UC-TERR-22 — Drag handle is gated by city scope and sort mode
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline
- **Steps:** 1. select `Todas` → observe no drag handle renders at all (`@if (selectedCity !== ALL_OPTION)`) → 2. select `São Paulo`, switch sort to `Última Visita` → observe the handle renders but is disabled
- **Expected UI:** with `Última Visita` selected, the handle's icon is greyed (`disabledLight`) and its `title` attribute reads exactly `Para ordernar manualmente, use a ordenação Ordem de Cadastro` (verbatim, including the source typo "ordernar"); `cdkDragDisabled`/`cdkDragHandleDisabled` are both `true`
- **Expected persistence:** N/A (client-only gating)
- **Edge cases:** switching back to `Ordem de Cadastro` re-enables the handle without a reload
- **Priority:** P2 · **Gaps:** none

### Alert badges

Alert conditions are computed in `TerritoryAlertsBO` purely from the parent doc's `recentHistory` array
(never the full `history` subcollection). There is **no** badge or alert tied to the `NOT_ANSWERED` (`1`)
outcome — only bible-student, `MOVED` (unresolved), `ASKED_TO_NOT_VISIT_AGAIN` (unresolved, within 24
months) and `isRevisit` drive a badge.

#### UC-TERR-23 — "Estudante" badge for bible-study territories
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline (`seed-territory-3`: `isBibleStudent: true`, non-empty `note` required — see UC-TERR-27)
- **Steps:** 1. select `São Paulo`
- **Expected UI:** `Rua Harmonia, 300 - Vila Madalena` shows a badge with text `Estudante` and `title="Essa pessoa é um estudante da Bíblia"`
- **Expected persistence:** `db.getDoc(db.collections.territories,'seed-territory-3').isBibleStudent === true`
- **Priority:** P1 · **Gaps:** none

#### UC-TERR-24 — "Mudou" badge for an unresolved `MOVED` entry
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** 1 territory with `note` set and `recentHistory` containing `{ visitOutcome: 2, isResolved: false }`
- **Steps:** 1. open `/territories`
- **Expected UI:** badge text `Mudou`, `title="Essa pessoa se mudou"`
- **Expected persistence:** `db.getDoc(...).recentHistory` contains that unresolved `MOVED` entry
- **Edge cases:** setting `isResolved: true` on that same entry removes the badge without any other change
- **Priority:** P1 · **Gaps:** none

#### UC-TERR-25 — "Não quer visitas" badge, 24-month window
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** 1 territory with `note` set and `recentHistory` containing `{ visitOutcome: 3, isResolved: false, date: <10 months ago> }`
- **Steps:** 1. open `/territories`
- **Expected UI:** badge text `Não quer visitas`, `title="Essa pessoa disse que não quer ser visitada por uma Testemunha de Jeová"`
- **Expected persistence:** `db.getDoc(...).recentHistory` entry has `visitOutcome === 3`
- **Edge cases:** `differenceInMonths(history.date, now) < 24` — a matching entry from 25 months ago no longer shows the badge even if unresolved
- **Priority:** P1 · **Gaps:** none

#### UC-TERR-26 — "Revisita" badge for any `isRevisit` entry
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline (`seed-territory-3` has a `recentHistory` entry `{ visitOutcome: 0, isRevisit: true }`, plus its own non-empty `note`)
- **Steps:** 1. select `São Paulo`
- **Expected UI:** `Rua Harmonia, 300 - Vila Madalena` shows badge `Revisita`, `title="Essa pessoa foi marcada como revisita recentemente"` (alongside `Estudante`, since both conditions hold)
- **Expected persistence:** `db.getDoc(...,'seed-territory-3').recentHistory` has an entry with `isRevisit: true`
- **Edge cases:** unlike the moved/stop-visiting checks, `hasRecentRevisit` does **not** look at `isResolved` at all — only the `isRevisit` boolean matters
- **Priority:** P1 · **Gaps:** none

#### UC-TERR-27 — ⚠ Alert badges only render when `note` is non-empty
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** 1 territory with `note: ''`, `isBibleStudent: true`, and `recentHistory` containing an unresolved `MOVED` entry
- **Steps:** 1. open `/territories`
- **Expected UI:** **no** badge renders at all — `territory-list-item.component.ts` wraps the entire `.territory-list-item__notes` block (which contains every badge) in `@if (territory.note)`; with an empty note, `Estudante` and `Mudou` are computed (`isBibleStudent`/`hasRecentlyMoved` are `true`) but never shown, and the menu's alert-resolution actions (`Mudou`, `Revisita`, `Não Visitar`) still appear since those live outside the note block
- **Expected persistence:** `db.getDoc(...).note === ''`, `.isBibleStudent === true`, `.recentHistory` has the unresolved `MOVED` entry — persisted state has the alert, UI does not show it
- **Edge cases:** setting any non-empty `note` (even a single space-free character) immediately reveals all applicable badges without touching the alert data
- **Priority:** P1 · **Gaps:** `⚠ suspected defect`, already tracked in [`data-model.md §4.4`](../domain/data-model.md#44-alerts-depend-on-note); test today must assert badges are **absent** despite qualifying data, and seed a non-empty `note` for every other badge UC in this document

### Visit-history dialog

#### UC-TERR-28 — ⚠ "Histórico" loads the entire `history` subcollection, reversed, unordered
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline (`seed-territory-1`: 2 history docs, `REVISIT` 2024-03-10 and `SPOKE` 2024-02-20)
- **Steps:** 1. open the menu on `seed-territory-1` → `Histórico`
- **Expected UI:** dialog title `Histórico de Visitas`; each row shows an outcome icon, `{{ notes || 'Sem observações' }}`, an optional `Revisita` badge (`isRevisit`), and `{{ name }}, {{ date }}`; footer button `Fechar`. `handleOpenHistory` calls `TerritoryRepository.getTerritoryVisitHistory(id)`, which reads **every** doc in `territories/{id}/history` with **no** `limit` and **no** `orderBy`, then `.reverse()`s the resulting array client-side — it does **not** read `recentHistory` and is **not** capped at 5
- **Expected persistence:** `db.getSubcollectionDocs(db.collections.territories, 'seed-territory-1', db.historySubcollection)` returns exactly 2 docs; assert the dialog shows both, not a subset
- **Edge cases:** because Firestore does not guarantee document order without an explicit `orderBy`, the displayed row order is not contractually chronological — a test asserting a specific row order is asserting incidental behaviour, not a guarantee
- **Priority:** P1 · **Gaps:** `⚠ suspected defect` — no `orderBy('date')`/`limit(5)` on the query; contrast with `/work/:id`'s history dialog, which renders the designation-embedded `history` array instead (see `data-model.md §4.2`)

#### UC-TERR-29 — "Histórico" menu item is always visible, even with zero visits
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** 1 territory with no `history` subcollection docs (`history: []` at seed time)
- **Steps:** 1. open the menu on that territory
- **Expected UI:** `Histórico` is still listed (it carries no `*libAuthorize` and no conditional `@if`, unlike `Editar`/`Apagar`); clicking it opens `Histórico de Visitas` with zero rows and only the `Fechar` button
- **Expected persistence:** `db.getSubcollectionDocs(db.collections.territories, tid, db.historySubcollection)` is empty
- **Edge cases:** contradicts an "affordance hidden when empty" assumption — assert the menu item and the empty dialog **exist**, not that they are absent
- **Priority:** P2 · **Gaps:** none

### "Moved" alert resolution dialog

#### UC-TERR-30 — Resolve "Mudou" alert: mark as resolved, delete, or edit
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** 1 territory with non-empty `note` and `recentHistory` containing an unresolved `MOVED` entry (`notes` length > 1 so it is quoted)
- **Steps:** 1. list-item menu → `Mudou` → 2. dialog title `Morador Mudou`, intro `Recentemente um publicador reportou que esse morador não está mais nesse endereço:`, quoted report, prompt `O que você quer fazer?` with 3 radio options: `Remover Marcação`, `Apagar Endereço`, `Editar Endereço` → 3. keep default `Remover Marcação` selected → 4. `Salvar`
- **Expected UI:** dialog closes; `Mudou` badge/menu item disappears from that territory (list is manually re-fetched, since "Firebase doesn't update changes on an array property")
- **Expected persistence:** `resolveTerritoryHistoryAlert` is called with the **full** `recentHistory` (not a filtered subset); the matching `MOVED` entry gets `isResolved: true` on both the parent's `recentHistory` (via `TerritoryRepository.update`) **and** the corresponding `history/{visitId}` subcollection doc (`setVisitHistory`) — assert both `db.getDoc(...).recentHistory` and `db.getSubcollectionDocs(db.collections.territories, tid, db.historySubcollection)` show `isResolved: true` for that entry
- **Edge cases:** choosing `Apagar Endereço` instead closes this dialog with that action, which the page maps to `handleRemoveTerritory` (same flow as UC-TERR-20, confirmation dialog and all — assert the parent doc is deleted); choosing `Editar Endereço` opens the manage dialog pre-filled (UC-TERR-19 flow) and does **not** itself resolve the alert
- **Priority:** P0 · **Gaps:** no `data-testid`s on the radio options (use `kingdom-apps-icon-radio` text content)

### "Revisita" / "Não Visitar" alert resolution dialogs

#### UC-TERR-31 — ⚠ Resolving "Revisita" can silently drop unrelated `recentHistory` entries
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** 1 territory, non-empty `note`, `recentHistory` with **two** entries: (A) `{ isRevisit: true }` and (B) an unrelated unresolved `MOVED` (`visitOutcome: 2`) entry
- **Steps:** 1. menu → `Revisita` (only entry A is passed to the dialog: `territory.recentHistory.filter(h => h.isRevisit)`) → 2. dialog title `Revisita`, message `Um ou mais publicadores marcaram que esse território está sendo revisitado: `, quoted report(s) → 3. `Remover Marcação`
- **Expected UI:** the `Revisita` badge disappears; the unrelated `Mudou` badge/menu item also disappears even though it was never addressed
- **Expected persistence:** `handleResolveAlert` calls `markAsResolvedCallback` with **only** entry A; `resolveTerritoryHistoryAlert` sets `copiedTerritory.history = [A with isRevisit:false]` and `TerritoryRepository.update` recomputes `recentHistory = history.slice(-5)` from that single-element array — so the parent doc's `recentHistory` now contains **only** entry A, and entry B is gone from `recentHistory`. Assert `db.getDoc(...).recentHistory` has length `1` after this action. The `history` subcollection is untouched for entry B (`db.getSubcollectionDocs` still has both docs) — only the denormalised array loses it
- **Edge cases:** this reproduces identically for `Não Visitar` (`handleResolveStopVisitingAlert` filters by `visitOutcome === 3` the same way)
- **Priority:** P1 · **Gaps:** `⚠ suspected defect` — resolving one alert type should not truncate unrelated `recentHistory` entries; consolidate in `testability-gaps.md`

#### UC-TERR-32 — Resolve "Não Visitar" alert clears the badge
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** 1 territory, non-empty `note`, `recentHistory` with one unresolved `ASKED_TO_NOT_VISIT_AGAIN` (`3`) entry dated within 24 months
- **Steps:** 1. menu → `Não Visitar` → 2. dialog title `Parar de Visitar`, message `Um ou mais publicadores marcaram que esse território pediu para não ser visitado: ` → 3. `Remover Marcação`
- **Expected UI:** `Não quer visitas` badge and `Não Visitar` menu item disappear
- **Expected persistence:** the matching entry's `isResolved` becomes `true` in both `recentHistory` and the `history/{visitId}` subcollection doc
- **Priority:** P1 · **Gaps:** none (see UC-TERR-31 for the truncation caveat when other alerts coexist)

### Maps-link affordance

#### UC-TERR-33 — ⚠ No "open in Maps" button exists on this screen
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline (all 3 territories have a `mapsLink`, per `buildTerritory`'s default)
- **Steps:** 1. open `/territories` → 2. inspect a `territory-list-item`
- **Expected UI:** unlike `/territories/assign` (`territory-checkbox`) and `/work/:id` (`work-item`), the `territory-list-item` template never renders a maps button/icon — `mapsLink` is only ever captured/edited via the manage dialog's `Link do Maps` field (placeholder `https://goo.gl/maps/* ou https://maps.app.goo.gl/*`) and exported in the CSV; it is never opened from this screen
- **Expected persistence:** `db.getDoc(db.collections.territories, id).mapsLink` is set and round-trips through create/edit (see UC-TERR-14/19), but there is nothing to click here
- **Edge cases:** do **not** write a `window.open`/`page.on('popup')` test against `/territories` — that belongs to the assign/work feature docs; this entry exists only to record the gap for this screen
- **Priority:** P2 · **Gaps:** `⚠ suspected defect` (or at least an inconsistency) — no UI affordance despite the field being fully modelled and editable here

### CSV export

#### UC-TERR-34 — Export downloads a pt-BR CSV, sorted by city
- **Actor:** Admin
- **Route:** `/territories`
- **Preconditions (seed):** default baseline
- **Steps:** 1. open the overflow menu (⋮ button) → `Exportar Territórios` → 2. `page.waitForEvent('download')`
- **Expected UI:** a success toast `Territórios exportados com sucesso.` appears; the download's suggested filename matches `mm-territorios-<timestamp>.csv` where `<timestamp>` is `new Date().toISOString().slice(0,19)` with `:`/`T` replaced by `-` (UTC time, e.g. `mm-territorios-2026-07-25-10-11-00.csv`)
- **Expected persistence:** read the downloaded file (`download.path()`/`createReadStream`) and assert: `;`-delimited, UTF-8 **BOM** (`\uFEFF`) prefix, header row exactly `Cidade;Endereço;Observação;Link do Mapa;Ícone;Estudante da Bíblia;Instrutor da Bíblia;Última Visita`, one data row per `db.getCollectionDocs(db.collections.territories)` entry, rows sorted by `city.localeCompare` (Osasco before São Paulo), dates formatted `dd/MM/yyyy`
- **Edge cases:** `bibleInstructor` is exported as the **raw stored id** (e.g. `seed-user-publisher-1`), not a resolved display name — the CSV never joins against `users`; `;` characters inside `note`/`address` are replaced with `,` to protect the delimiter
- **Priority:** P1 · **Gaps:** requires `page.waitForEvent('download')`; no `data-testid` on the menu trigger or the `Exportar Territórios` item

#### UC-TERR-35 — Export/overflow menu hidden for `ORGANIZER`/`ELDER`
- **Actor:** Organizer (harness extension needed — only `admin`/`publisher` exist in `signInAs` today)
- **Route:** `/territories`
- **Preconditions (seed):** default baseline; a user with `role: 'ORGANIZER'`
- **Steps:** 1. sign in as that user → 2. open `/territories`
- **Expected UI:** the `⋮` overflow button (`*libAuthorize="[APP_ADMIN, SUPERINTENDENT, ADMIN]"`) is absent — `ORGANIZER` and `ELDER` cannot see `Exportar Territórios` at all
- **Expected persistence:** `db.getDoc(db.collections.users, uid).role === 'ORGANIZER'`
- **Edge cases:** `ELDER` can edit/delete territories (see UC-TERR-36) but still cannot export, since the overflow menu's role list (`APP_ADMIN, SUPERINTENDENT, ADMIN`) excludes it
- **Priority:** P1 · **Gaps:** `signInAs('organizer')`/`signInAs('elder')` harness extension needed

### Role gating

#### UC-TERR-36 — List-item menu (`EDIT_ALLOWED`) excludes `ORGANIZER`
- **Actor:** Organizer (harness extension needed)
- **Route:** `/territories`
- **Preconditions (seed):** default baseline; a user with `role: 'ORGANIZER'`
- **Steps:** 1. sign in as organizer → 2. open the menu on any `territory-list-item`
- **Expected UI:** only `Histórico` is visible (ungated); `Editar`, the alert-resolution actions (`Mudou`/`Revisita`/`Não Visitar`), the separators and `Apagar` are all hidden — `EDIT_ALLOWED = [ADMIN, ELDER, SUPERINTENDENT]` (see [`territory-roles.config.ts`](../../src/app/features/territory/config/territory-roles.config.ts)) does not include `ORGANIZER`, and `*libAuthorize` clears content when there is no matching role
- **Expected persistence:** N/A (client-side gating only — a malicious `ORGANIZER` could still call the repository directly; there is no Firestore security-rule assertion in scope here)
- **Edge cases:** `APP_ADMIN` bypasses every `*libAuthorize` check regardless of the listed roles (see [`roles-and-permissions.md §4`](../domain/roles-and-permissions.md#4-in-template-authorization---libauthorize))
- **Priority:** P1 · **Gaps:** `signInAs('organizer')` harness extension needed

#### UC-TERR-37 — Anonymous access redirects to `/login`
- **Actor:** Anonymous
- **Route:** `/territories`
- **Preconditions (seed):** none required (already covered by `apps/ministry-maps/e2e/tests/territories.spec.ts`)
- **Steps:** 1. `page.goto('/territories')` without signing in
- **Expected UI:** `page` URL becomes `/login`
- **Expected persistence:** N/A (auth guard, no Firestore write); assert `db.getCollectionDocs(db.collections.territories)` still equals the untouched baseline (3 docs) to prove no side effect occurred
- **Edge cases:** a signed-in `PUBLISHER` hitting `/territories` is redirected to `/welcome`, not `/login` — do not conflate the two redirects
- **Priority:** P0 · **Gaps:** none — already exercised by the existing spec; do not duplicate the exact same assertion in a new spec file, extend it instead

## Testability gaps (summary)

- Only 4 `data-testid`s exist for this whole screen (`territories-heading`, `territories-list`,
  `territories-city-filter`, `territory-list-item`); every dialog, form field, menu item, badge, toggle and
  the search input must be selected by pt-BR text/role.
- No `data-testid` on: the sort/filter trigger button and its badge, the overflow-menu `⋮` trigger and
  `Exportar Territórios` item, the list-item `⋮` trigger and its menu items (`Editar`/`Histórico`/`Mudou`/
  `Revisita`/`Não Visitar`/`Apagar`), the drag handle, the FAB, and every field in the create/edit,
  delete, move-alert, generic-alert and history dialogs.
- Native/browser obstacles: CSV export uses a synthetic `<a download>` + `URL.createObjectURL` click,
  requiring `page.waitForEvent('download')`; drag-and-drop uses Angular CDK's pointer-event-based
  dragging, requiring a manual `mouse.down()/move()/up()` sequence (no native HTML5 drag events, so
  `dragTo()` will not work); there is no `mapsLink`/`window.open` affordance on this screen at all
  (see UC-TERR-33) despite one existing on `/territories/assign` and `/work/:id`.
- Harness extensions needed: `signInAs` only supports `'admin'`/`'publisher'` — every `ORGANIZER`, `ELDER`,
  `SUPERINTENDENT`, `APP_ADMIN` scenario in this document (UC-TERR-35, UC-TERR-36) needs a new seeded user
  and `ROLE_UIDS` entry before it can be automated.
- Documented current-behaviour-vs-defect items (see corresponding entries for the assertion to make today):
  UC-TERR-04 (empty-congregation filter throws), UC-TERR-12 (badge miscounts on fresh load), UC-TERR-16
  (bible-instructor cleared on re-check), UC-TERR-20 (orphaned `history` subcollection after delete),
  UC-TERR-27 (badges gated by `note`, already tracked in `data-model.md`), UC-TERR-28 (history dialog reads
  the unordered full subcollection, not `recentHistory`), UC-TERR-31 (alert resolution truncates unrelated
  `recentHistory` entries), UC-TERR-33 (no maps affordance on this screen).

## Sources

- `apps/ministry-maps/src/app/features/territory/pages/territories-page/territories-page.component.ts`
- `apps/ministry-maps/src/app/features/territory/pages/territories-page/territories-page.component.html`
- `apps/ministry-maps/src/app/features/territory/components/territory-list-item/territory-list-item.component.ts`
- `apps/ministry-maps/src/app/features/territory/components/territory-manage-dialog/territory-manage-dialog.component.ts`
- `apps/ministry-maps/src/app/features/territory/components/territory-delete-dialog/territory-delete-dialog.component.ts`
- `apps/ministry-maps/src/app/features/territory/components/territory-move-alert-dialog/territory-move-alert-dialog.component.ts`
- `apps/ministry-maps/src/app/features/territory/components/territory-generic-alert-dialog/territory-generic-alert-dialog.component.ts`
- `apps/ministry-maps/src/app/shared/components/dialogs/history-dialog/history-dialog.component.ts`
- `apps/ministry-maps/src/app/features/territory/bo/territory/territory.bo.ts`
- `apps/ministry-maps/src/app/features/territory/bo/territory-alerts/territory-alerts.bo.ts`
- `apps/ministry-maps/src/app/features/territory/bo/territory-csv-exporter/territory-csv-exporter.bo.ts`
- `apps/ministry-maps/src/app/shared/utils/territories-filter-pipe.ts`
- `apps/ministry-maps/src/app/features/territory/config/territory-filter.config.ts`
- `apps/ministry-maps/src/app/features/territory/config/territory-roles.config.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-territory-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/territories.repository.ts`
- `libs/common-ui/src/lib/components/sort-filter/sort-filter.component.ts`
- `libs/common-ui/src/lib/components/sort-filter/sort-filter-dialog/sort-filter-dialog.component.ts`
- `libs/common-ui/src/lib/components/sort-filter/sort-filter-dialog/sort-filter-dialog.component.html`
- `libs/common-ui/src/lib/components/sort-filter/types/sort-filter.model.ts`
- `apps/ministry-maps/src/app/features/territory/components/territory-checkbox/territory-checkbox.component.ts`
- `apps/ministry-maps/src/app/shared/utils/open-google-maps.ts`
- `apps/ministry-maps/src/models/territory.ts`, `src/models/territory-visit-history.ts`, `src/models/enums/visit-outcome.ts`
- `apps/ministry-maps/e2e/seed/default.seed.ts`, `e2e/seed/factories/territory.factory.ts`
- `apps/ministry-maps/e2e/tests/territories.spec.ts`, `e2e/page-objects/territories.page.ts`
- `apps/ministry-maps/docs/README.md`, `docs/domain/data-model.md`, `docs/domain/roles-and-permissions.md`, `docs/domain/glossary.md`
