# Congregation configuration — cities (`UC-CFG`)

This document describes the behavioural use cases for the `/configuration` screen: listing, adding,
renaming and deleting a congregation's `cities[]`, the single-edit-at-a-time constraint, validation, the
save write (congregation doc + territory batch rename) and its staleness/atomicity caveats.

**Route:** `/configuration`
**Actors:** every signed-in role reaches the page and — unlike every other admin screen in this app —
can **edit** it: `EDIT_CONGREGATION_CONFIGURATION` (`ADMIN` + `APP_ADMIN` bypass) exists as a constant but
is **never referenced by any `*libAuthorize` in this feature** (see `UC-CFG-13`), so there is no role
gating at all on this screen today. **Anonymous** visitors also reach it, because the route's `data.roles`
is `['*']` (see [`../domain/roles-and-permissions.md §3.1`](../domain/roles-and-permissions.md#31-suspected-defect--roles--short-circuits-the-login-check)).
Field/model shapes are in [`../domain/data-model.md`](../domain/data-model.md); pt-BR ↔ English vocabulary
is in [`../domain/glossary.md`](../domain/glossary.md).

> **⚠ Locale note:** unlike every other screen catalogued in this app, `ConfigCongregationCitiesComponent`'s
> template and every `ToasterService` message on it are hard-coded in **English** (`"Manage Congregation
Cities"`, `"Edit"`, `"Save Changes"`, …), not pt-BR. All literal strings below are quoted verbatim as they
> appear in the running app — do **not** "correct" them to Portuguese.

### Cities list

#### UC-CFG-01 — Cities list renders `congregation.cities` for the signed-in admin

- **Actor:** Admin
- **Route:** `/configuration`
- **Preconditions (seed):** default baseline (`seed.ids.congregation` cities `['São Paulo', 'Osasco']`)
- **Steps:** 1. `signInAs('admin')` → 2. open `/configuration`
- **Expected UI:** heading `Manage Congregation Cities`; subtitle `Congregação Jardim Primavera`; the list renders exactly 2 rows, in array order, each showing `São Paulo` then `Osasco` with `Edit`/`Delete` buttons; `Save Changes` is present but disabled (`hasChanges()` is `false` on load)
- **Expected persistence:** `db.getDoc(db.collections.congregations, seed.ids.congregation).cities` deep-equals `['São Paulo', 'Osasco']` — the list is a pure client-side render of `UserStateService.currentUser.congregation.cities`, a snapshot taken once in `ngOnInit`, not a live listener
- **Edge cases:** if `congregation.cities` were `[]`, the empty-state paragraph `No cities configured yet. Add your first city below.` renders instead of the list container's rows
- **Priority:** P0 · **Gaps:** no `data-testid` anywhere on this screen; select rows by their text content

### Add / rename / cancel

#### UC-CFG-02 — Add a city opens a new, empty, editable row

- **Actor:** Admin
- **Route:** `/configuration`
- **Preconditions (seed):** default baseline
- **Steps:** 1. open `/configuration` → 2. click `+ Add City`
- **Expected UI:** a third row appears at the end of the list, already `isEditing`, with an empty text `<input placeholder="Enter city name">` and a `Cancel` button (no `Edit`/`Delete` on this row while it is new); the input carries a green border class (`border-green-500`) distinguishing "new" from "renaming" (blue border) rows; `+ Add City` itself becomes disabled (`hasEditingCities` is now `true`)
- **Expected persistence:** N/A — nothing is written until `Save Changes`; assert `db.getDoc(db.collections.congregations, seed.ids.congregation).cities` is still `['São Paulo', 'Osasco']` (unchanged) while the row is only local component state
- **Edge cases:** typing a name and navigating away (no `beforeunload` guard) discards the unsaved row entirely
- **Priority:** P0 · **Gaps:** none

#### UC-CFG-03 — Rename an existing city inline

- **Actor:** Admin
- **Route:** `/configuration`
- **Preconditions (seed):** default baseline
- **Steps:** 1. open `/configuration` → 2. click `Edit` on the `São Paulo` row → 3. clear the input and type `São Paulo Centro`
- **Expected UI:** the row switches to its editing layout (`-mx-6 -my-4 px-6 py-4 bg-gray-50` highlight, blue-border input pre-filled `São Paulo`) with only a `Cancel` button; `Save Changes` becomes enabled as soon as the text differs from the original (`hasChanges()` compares `currentName !== originalName`)
- **Expected persistence:** N/A until save; the underlying doc is untouched at this point
- **Edge cases:** every other row's `Edit`/`Delete` buttons and the `+ Add City` button are disabled the instant this row enters edit mode (see `UC-CFG-05`)
- **Priority:** P0 · **Gaps:** none

#### UC-CFG-04 — Cancel an in-progress edit

- **Actor:** Admin
- **Route:** `/configuration`
- **Preconditions (seed):** default baseline
- **Steps:** 1. edit `Osasco` → type `Osasco Norte` → click `Cancel` → observe → 2. click `+ Add City` → type `Sorocaba` → click `Cancel` on that row → observe
- **Expected UI:** step 1: the row exits edit mode and reverts to displaying `Osasco` (`city.currentName = city.originalName`) — the typed text is discarded; step 2: the entire new row is removed from the list (`this.cities.splice(index, 1)`), not merely cleared
- **Expected persistence:** `db.getDoc(db.collections.congregations, seed.ids.congregation).cities` unaffected in both cases (no write ever happened)
- **Edge cases:** `cancelEdit` branches on `city.isNew` — this is why an existing city reverts in place while a freshly-added one disappears entirely; there is no confirmation prompt for discarding typed text
- **Priority:** P1 · **Gaps:** none

#### UC-CFG-05 — Single-edit-at-a-time constraint disables other rows and "Add", but not "Save Changes"

- **Actor:** Admin
- **Route:** `/configuration`
- **Preconditions (seed):** default baseline
- **Steps:** 1. click `Edit` on `São Paulo` → 2. observe the `Osasco` row's `Edit`/`Delete` buttons and the `+ Add City` button → 3. without clicking `Cancel`, type a new name and click `Save Changes` directly while the row is still `isEditing`
- **Expected UI:** step 2: `Osasco`'s `Edit` and `Delete` are both `disabled` (`[disabled]="hasEditingCities"`), and `+ Add City` is disabled too — only one row can ever be mid-edit; step 3: `Save Changes` is **not** gated by `hasEditingCities`, only by `!hasChanges() || isLoading` — clicking it while `São Paulo`'s row is still visually in edit mode still runs `saveChanges()` against the typed (uncommitted) `currentName`, and on success every row (including the one that was mid-edit) is reset to `isEditing: false`
- **Expected persistence:** after step 3's successful save, `db.getDoc(db.collections.congregations, seed.ids.congregation).cities` contains the typed new name, proving the edit did not need to be "confirmed" out of edit mode first
- **Edge cases:** this means a test can save a rename without ever seeing the row return to its read-only state first — do not assume `Cancel`/blur is required before `Save Changes` is clickable
- **Priority:** P1 · **Gaps:** none

### Validation

#### UC-CFG-06 — ⚠ Empty city name blocks save with a toast; nothing persisted

- **Actor:** Admin
- **Route:** `/configuration`
- **Preconditions (seed):** default baseline
- **Steps:** 1. click `+ Add City` → 2. leave the input empty (or type only spaces) → 3. click `Save Changes`
- **Expected UI:** an error toast reads exactly `All cities must have a name.` (`ToasterService.error`, icon `error-8`); the new empty row remains on screen, still editable; `isLoading` never flips to `true` — the check runs client-side in `saveChanges()` before `ConfigurationBO` is even called
- **Expected persistence:** `db.getDoc(db.collections.congregations, seed.ids.congregation).cities` is unchanged (still `['São Paulo', 'Osasco']`); no territory writes occur
- **Edge cases:** the check is `!city.currentName.trim()` across **every** row, not just the new one — a pre-existing row emptied out via `Edit` triggers the same toast
- **Priority:** P0 · **Gaps:** `⚠ suspected defect`-adjacent only in that the message is in English on an otherwise pt-BR app; the behaviour itself (block + toast) is correct and should be asserted as-is; no `data-testid` on the toast — assert via its rendered text

#### UC-CFG-07 — ⚠ Duplicate city name blocks save with a toast; nothing persisted

- **Actor:** Admin
- **Route:** `/configuration`
- **Preconditions (seed):** default baseline
- **Steps:** 1. click `Edit` on `Osasco` → rename it to `São Paulo` (case-insensitive duplicate of the other row, e.g. also try `são paulo`) → 2. click `Save Changes`
- **Expected UI:** error toast reads exactly `City names must be unique.`; the component's own duplicate check (`cityNames.indexOf(name) !== index` over `trim().toLowerCase()`) fires **before** `ConfigurationBO` is invoked, so `ConfigurationBO.validateUpdateCongregationCities`'s own duplicate/collision checks (which throw `Duplicate new city name in payload: …` or `City already exists in congregation: …`) are effectively unreachable from this UI — they would only surface as an unhandled `error:` callback text `Error updating cities: <message>` if the component-level check were ever bypassed
- **Expected persistence:** `db.getDoc(db.collections.congregations, seed.ids.congregation).cities` unchanged; no `batchUpdate` on territories
- **Edge cases:** the comparison is case-insensitive (`toLowerCase()`) but accent-sensitive, matching the general search behaviour documented in [`territories-management.md`](./territories-management.md#uc-terr-06--search-is-case-insensitive-but-accent-sensitive)
- **Priority:** P0 · **Gaps:** none beyond the English-copy note above

### Save & persistence

#### UC-CFG-08 — Save persists `congregations/{id}.cities` and batch-renames every affected territory

- **Actor:** Admin
- **Route:** `/configuration`
- **Preconditions (seed):** default baseline; `seed-territory-1`/`seed-territory-3` in `São Paulo`, `seed-territory-2` in `Osasco`
- **Steps:** 1. `Edit` on `São Paulo` → rename to `São Paulo Zona Sul` → 2. `Save Changes`
- **Expected UI:** button shows `Saving...` while `isLoading`; on success, a toast reads exactly `Cities updated successfully!`; the row returns to read-only, now showing `São Paulo Zona Sul`
- **Expected persistence:** `db.getDoc(db.collections.congregations, seed.ids.congregation).cities` deep-equals `['São Paulo Zona Sul', 'Osasco']` (order preserved); `db.getDoc(db.collections.territories, 'seed-territory-1').city === 'São Paulo Zona Sul'` and `db.getDoc(db.collections.territories, 'seed-territory-3').city === 'São Paulo Zona Sul'` (both batch-updated via a Firestore `runTransaction` in `FirebaseTerritoryDatasourceService.batchUpdate`); `db.getDoc(db.collections.territories, 'seed-territory-2').city === 'Osasco'` (untouched, different city)
- **Edge cases:** the two writes — `CongregationRepository.update` (a plain `updateDoc`) and the territory `batchUpdate` (a `runTransaction`) — are combined with `forkJoin([congregationUpdate$, affectedTerritoriesUpdate$])` inside `ConfigurationBO.updateCongregationCities`: they run **in parallel, not as one atomic unit**. If the transaction fails after the congregation doc already committed (or vice versa), the congregation's `cities` array and the territories' `city` fields can disagree; a test asserting robustness under failure would need to fault-inject one of the two writes, which the current harness cannot do
- **Priority:** P0 · **Gaps:** `⚠ suspected defect` (partial-failure window from non-atomic `forkJoin`) — today's happy-path assertion is both writes landing, as above; no fault-injection harness exists to exercise the failure window

#### UC-CFG-09 — A newly added city needs no territory updates; an untouched city is skipped by the rename batch

- **Actor:** Admin
- **Route:** `/configuration`
- **Preconditions (seed):** default baseline
- **Steps:** 1. `+ Add City` → type `Guarulhos` → 2. `Save Changes`
- **Expected UI:** toast `Cities updated successfully!`; `Guarulhos` now listed as a third, read-only row
- **Expected persistence:** `db.getDoc(db.collections.congregations, seed.ids.congregation).cities` deep-equals `['São Paulo', 'Osasco', 'Guarulhos']`; `db.getCollectionDocs(db.collections.territories)` — all 3 baseline territories keep their original `city` values, since `updateCitiesOfTerritory` builds its rename list from `oldCityName` (`undefined` for a new city) and filters out anything where `oldCityName` is falsy — a new city is never a rename target, so the territory `batchUpdate` step is skipped entirely (`updatedTerritories.length === 0` short-circuits to `of(undefined)`)
- **Edge cases:** the same short-circuit applies to any row whose `currentName === originalName` (untouched) — it is excluded from the rename map even though it is still included, unchanged, in the new `cities` array sent to `CongregationRepository.update`
- **Priority:** P1 · **Gaps:** none

### Delete a city

#### UC-CFG-10 — ⚠ Delete removes the city from `congregation.cities` but leaves territories orphaned, pointing at a name that no longer exists

- **Actor:** Admin
- **Route:** `/configuration`
- **Preconditions (seed):** default baseline (`seed-territory-2` is in `Osasco`)
- **Steps:** 1. click `Delete` on the `Osasco` row → 2. a **native** browser `confirm()` dialog appears with text `Are you sure you want to delete this city?` → 3. accept it → 4. `Save Changes`
- **Expected UI:** after accepting the confirm, the `Osasco` row disappears immediately (local splice, before any save) and `Save Changes` is **enabled** — a delete-only change counts in `hasChanges()` (fixed 2026-08: the row count is compared against the congregation snapshot; previously a plain delete left Save disabled and deletions were unsavable on their own). Because this is `window.confirm(...)`, not an in-app dialog component, Playwright must register `page.on('dialog', dialog => dialog.accept())` (or `.dismiss()`) **before** the click that triggers it — a normal `getByRole('dialog')`/`getByText` locator will never see it, and an unhandled native dialog will hang the test. After `Save Changes`, toast `Cities updated successfully!`
- **Expected persistence:** `db.getDoc(db.collections.congregations, seed.ids.congregation).cities` deep-equals `['São Paulo']` (no `Osasco`); **but** `db.getDoc(db.collections.territories, 'seed-territory-2').city` is still exactly `'Osasco'` — `deleteCity` only removes the array entry client-side and is never translated into an `UpdateCongregationCityDTO`, so `ConfigurationBO` has no record that `Osasco` was removed and performs **no** territory update for it. `seed-territory-2` is now an orphan: its `city` value no longer appears in any city `<select>` on `/territories` (it was built from `congregation.cities`), yet the territory document and its history are fully intact and still returned by `db.queryWhere(db.collections.territories, 'congregationId', '==', seed.ids.congregation)`
- **Edge cases:** dismissing the native confirm (via `dialog.dismiss()` or a manual `Cancelar`-equivalent) leaves the row in place with no change at all
- **Priority:** P1 · **Gaps:** `⚠ suspected defect` — orphaned territories after a city delete; test today must assert the territory **survives with its stale city name** (not that it is migrated or deleted), and must use `page.on('dialog')` for the native `confirm()`

### Stale state after save

#### UC-CFG-11 — ⚠ `/territories`'s city `<select>` does not reflect a cities save until a full reload

- **Actor:** Admin
- **Route:** `/configuration` then `/territories`
- **Preconditions (seed):** default baseline
- **Steps:** 1. open `/configuration` → rename `Osasco` to `Osasco Centro` → `Save Changes` → 2. navigate (SPA `routerLink`/`page.goto`, no reload) to `/territories` → 3. observe `territories-city-filter` → 4. `page.reload()` → 5. observe again
- **Expected UI:** after step 2, the city filter still lists `São Paulo`/`Osasco`/`Todas` — the **old** name — because `ConfigCongregationCitiesComponent`/`ConfigurationBO` never call `UserStateService.setUser(...)`; `TerritoriesPageComponent.ngOnInit` reads `this.userState.currentUser?.congregation?.cities`, which is still the pre-rename in-memory object. Only after step 4's hard reload — which resets `UserStateService` to `null` and forces `AuthService.resolveUserFromAuthProvider()` to refetch and re-hydrate the user (and its congregation) from Firestore — does the filter show `Osasco Centro`
- **Expected persistence:** `db.getDoc(db.collections.congregations, seed.ids.congregation).cities` already contains `Osasco Centro` immediately after step 1's save (the backend is correct the whole time; only the cached client state is stale)
- **Edge cases:** contrast with `UC-PROF-06`, where the profile congregation-switch flow **does** call `setUser` and therefore does not need a hard reload — the two "state goes stale" stories in this app have different fixes
- **Priority:** P1 · **Gaps:** `⚠ suspected defect` (or at least a UX gap) — test must call `page.reload()` between the save and the `/territories` assertion, not just navigate

### Anonymous access & role gating

#### UC-CFG-12 — ⚠ Anonymous visit does not redirect and shows the "no congregation" state

- **Actor:** Anonymous
- **Route:** `/configuration`
- **Preconditions (seed):** none required; do not sign in
- **Steps:** 1. `page.goto('/configuration')` without signing in
- **Expected UI:** URL stays `/configuration` (guard step 1 returns `true` for `roles: ['*']` before any login check); `UserStateService.currentUser` is `null`, so `ConfigCongregationCitiesComponent.congregation` stays `null` and the template renders only the red banner: `No congregation found. Please ensure you are logged in.`; the cities list, `+ Add City` and `Save Changes` are absent (all gated behind `@if (congregation)` / rendered unconditionally but inert — `Save Changes` still renders since it is outside the `@if`, but stays disabled since `hasChanges()` is `false` on an empty `cities` array)
- **Expected persistence:** N/A; assert `db.getCollectionDocs(db.collections.congregations)` unchanged (still 1 baseline doc) to prove no side effect
- **Edge cases:** the outer `configuration-main-page` heading `Configurações` still renders regardless of auth state, since it has no gating of its own
- **Priority:** P1 · **Gaps:** `⚠ suspected defect` (tracked alongside `UC-PROF-03` in [`../domain/roles-and-permissions.md §3.1`](../domain/roles-and-permissions.md#31-suspected-defect--roles--short-circuits-the-login-check)); no `data-testid` on the banner — match its literal text

#### UC-CFG-13 — ⚠ `EDIT_CONGREGATION_CONFIGURATION` is defined but never enforced — every role, including `PUBLISHER`, can edit cities

- **Actor:** Publisher
- **Route:** `/configuration`
- **Preconditions (seed):** default baseline
- **Steps:** 1. `signInAs('publisher')` → 2. open `/configuration` → 3. `Edit` a city, rename it, `Save Changes`
- **Expected UI:** the full editable UI (list, `Edit`/`Delete`/`+ Add City`/`Save Changes`) renders identically to the admin experience in `UC-CFG-01`–`UC-CFG-09` — `configuration-roles.config.ts` exports `EDIT_CONGREGATION_CONFIGURATION = [RoleEnum.ADMIN]`, but grepping the entire `features/configuration` tree shows **zero** usages of that constant and **zero** `*libAuthorize` directives anywhere in this feature; `ConfigCongregationCitiesComponent` has no role check of its own either
- **Expected persistence:** the rename **does** persist: `db.getDoc(db.collections.congregations, seed.ids.congregation).cities` reflects the publisher's edit, exactly as if an admin had made it — this is a real write, not a cosmetic UI leak
- **Edge cases:** this is a stronger claim than "`PUBLISHER` merely reaches the route by URL" (true for every `['*']`-gated route) — here `PUBLISHER` can additionally **mutate congregation and territory data**, despite [`../domain/roles-and-permissions.md §4`](../domain/roles-and-permissions.md#4-in-template-authorization---libauthorize)'s table listing this affordance as `ADMIN`-gated. Any spec written against "a non-admin sees a read-only view" would fail today — there is no read-only view
- **Priority:** P0 · **Gaps:** `⚠ suspected defect` (unenforced authorization — the most severe gap in this document); test today must assert the write **succeeds** for a `PUBLISHER`, not that it is blocked; the fix (wiring `*libAuthorize="EDIT_CONGREGATION_CONFIGURATION"` around the editable controls) is a product decision, not something to work around in the spec

## Testability gaps (summary)

- Zero `data-testid`s exist on `/configuration` — every row, button, input and toast must be selected by
  its (English) text content or CSS class.
- Native-dialog obstacle: deleting a city uses `window.confirm(...)`, not an in-app dialog — every delete
  spec must register `page.on('dialog', dialog => dialog.accept())` before the triggering click, or the
  test will hang (`UC-CFG-10`).
- No fault-injection harness exists to exercise the non-atomic `forkJoin` window in `UC-CFG-08` (congregation
  update succeeding while the territory batch rename fails, or vice versa).
- Documented current-behaviour-vs-defect items (see the corresponding entry for the assertion to make
  today): `UC-CFG-08` (save is two independent, non-atomic writes), `UC-CFG-10` (deleting a city orphans
  territories that still point at the removed name), `UC-CFG-11` (a full `page.reload()` — not just a SPA
  navigation — is required for `/territories` to see a renamed city), `UC-CFG-12` (anonymous visitor is not
  redirected and sees the "no congregation" banner), `UC-CFG-13` (role gating for this screen is entirely
  unenforced — any signed-in role, including `PUBLISHER`, can edit and persist city changes).
- Locale inconsistency: this is the only feature in the app whose UI copy and toast messages are in English
  rather than pt-BR — do not "fix" the quoted strings in this document or in a spec to match the rest of the
  app's language.

## Sources

- `apps/ministry-maps/src/app/features/configuration/components/config-manage-congregation-citites/config-congregation-cities.component.ts`
- `apps/ministry-maps/src/app/features/configuration/pages/main-page/configuration-main-page.component.ts`
- `apps/ministry-maps/src/app/features/configuration/pages/main-page/configuration-main-page.component.html`
- `apps/ministry-maps/src/app/features/configuration/configuration.routes.ts`
- `apps/ministry-maps/src/app/features/configuration/config/configuration-roles.config.ts`
- `apps/ministry-maps/src/app/shared/business-objects/configuration.bo.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-congregation-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-territory-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/territories.repository.ts`, `congregation.repository.ts`
- `apps/ministry-maps/src/app/state/user.state.service.ts`
- `apps/ministry-maps/src/app/core/features/auth/services/auth.service.ts`
- `libs/common-ui/src/lib/components/toaster/toaster.service.ts`
- `apps/ministry-maps/src/app/features/territory/pages/territories-page/territories-page.component.ts`
- `apps/ministry-maps/src/app/app-routes.ts`
- `apps/ministry-maps/e2e/seed/default.seed.ts`, `e2e/config/auth.config.ts`
- `apps/ministry-maps/docs/README.md`, `docs/domain/data-model.md`, `docs/domain/roles-and-permissions.md`, `docs/domain/glossary.md`
