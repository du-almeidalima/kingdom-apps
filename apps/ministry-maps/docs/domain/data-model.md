# Domain data model — the "second brain"

Everything an E2E author needs to build **realistic seeds** and write **backend assertions**. Read this before touching `seed.write(...)`: the app cannot read documents whose shapes do not match these contracts (most notably `User.congregation` as a `DocumentReference` and the **numeric**
`visitOutcome`).

---

## 1. Firestore collections

| Collection                 | Doc id                                    | Written by                                          | Notes                                                                                |
| -------------------------- | ----------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `congregations`            | free-form (seed uses `seed-congregation`) | Configuration screen (`cities` only)                | Holds `cities[]` + `settings`.                                                       |
| `users`                    | **=== Firebase Auth `uid`**               | sign-in (auto-create), Users screen                 | `congregation` is a `DocumentReference`.                                             |
| `territories`              | auto-id (`doc(collection)`)               | Territories screen, Work page write-back            | Parent doc carries `recentHistory` + `lastVisit`.                                    |
| `territories/{id}/history` | visit id (client-generated)               | Work page (complete/edit/undo visit)                | **Full** visit log, one doc per visit.                                               |
| `designations`             | auto-id                                   | Assign page                                         | Embeds a **snapshot** of the assigned territories.                                   |
| `designations_header`      | auto-id                                   | Assign page (lazy, on first designation of a cycle) | One `IN_PROGRESS` doc per congregation; closed by the Stop button or the daily cron. |
| `invitation_links`         | auto-id                                   | Users screen (invite dialog)                        | ⚠ note the **underscore** in the collection name.                                    |

The E2E layer re-declares these in `e2e/seed/collections.ts`
(`db.collections.congregations | users | territories | designations | designations_header`, `db.historySubcollection === 'history'`).

```
congregations/{congregationId}
users/{uid}                      → congregation: DocumentReference<congregations/{id}>
territories/{territoryId}        → congregationId: string (plain id, NOT a ref)
territories/{territoryId}/history/{visitId}
designations/{designationId}     → congregationId: string, territories: DesignationTerritory[], designationHeaderId?: string
designations_header/{headerId}   → congregationId: string (plain id, NOT a ref), status: 'IN_PROGRESS' | 'DONE'
invitation_links/{linkId}        → congregation: DocumentReference on create, embedded object after update (§2.6)
```

> **Mixed linking styles are intentional and must be reproduced exactly.** > `users` link by reference, `territories`/`designations` link by plain `congregationId` string.

---

## 2. Models

### 2.1 `Territory` — `src/models/territory.ts`

| Field             | Type                       | Required | Meaning / test relevance                                                                            |
| ----------------- | -------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `id`              | `string`                   | ✔        | Also stored **inside** the document (the app writes `id` on create).                                |
| `city`            | `string`                   | ✔        | Must be one of `congregation.cities` for the UI filter to show it.                                  |
| `address`         | `string`                   | ✔        | Primary visible label on the list; search matches on it.                                            |
| `note`            | `string`                   | ✔        | Free text. **Gates alert-badge rendering** (see §4.4).                                              |
| `mapsLink`        | `string?`                  | ✖        | When absent the "maps" affordance is hidden.                                                        |
| `congregationId`  | `string`                   | ✔        | Plain id. Scoping key for every list query.                                                         |
| `isBibleStudent`  | `boolean?`                 | ✖        | Drives the bible-student badge, statistics count and a filter toggle.                               |
| `bibleInstructor` | `string?`                  | ✖        | A **user id** (not a name). Only meaningful with `isBibleStudent: true`.                            |
| `positionIndex`   | `number?`                  | ✖        | Manual sort order, **allocated per city** (§4.3).                                                   |
| `icon`            | `TerritoryIcon`            | ✔        | `'m' \| 'w' \| 'c' \| 'cp' \| 'o'` (see §3.1).                                                      |
| `lastVisit`       | `Date?` → `Timestamp`      | ✖        | Denormalised date of the newest visit.                                                              |
| `history`         | `TerritoryVisitHistory[]?` | ✖        | **Never persisted on the parent doc** — stripped on `add`/`update` and stored in the subcollection. |
| `recentHistory`   | `TerritoryVisitHistory[]?` | ✖        | Denormalised **last 5** visits, ascending by date (§4.1).                                           |
| `peopleQuantity`  | `number?`                  | ✖        | Usually `1`; summed by statistics.                                                                  |

### 2.2 `TerritoryVisitHistory` — `src/models/territory-visit-history.ts`

| Field            | Type                 | Required | Meaning / test relevance                                                                                                                                           |
| ---------------- | -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`             | `string`             | ✔        | Same id in the subcollection doc **and** in the `recentHistory` array element.                                                                                     |
| `notes`          | `string`             | ✔        | Free text captured in the complete-visit dialog.                                                                                                                   |
| `isRevisit`      | `boolean`            | ✔        | Counted separately in statistics.                                                                                                                                  |
| `isResolved`     | `boolean?`           | ✖        | Used by the "not answered" / "moved" alert resolution flow.                                                                                                        |
| `name`           | `string?`            | ✖        | Name of the publisher who did the visit; required by the dialog when `isRevisit` is ticked.                                                                        |
| `date`           | `Date` → `Timestamp` | ✔        | Drives `lastVisit`, `recentHistory` ordering and every statistics period.                                                                                          |
| `visitOutcome`   | `VisitOutcomeEnum`   | ✔        | **Numeric** on the wire (§3.2).                                                                                                                                    |
| `congregationId` | `string?`            | ✖        | Plain id, stamped at write time. Enables the single collection-group statistics query (§4.7). Backfill stamps legacy docs (`functions` `backfill:history-stamps`). |
| `territoryId`    | `string?`            | ✖        | Plain id of the parent territory document, stamped at write time alongside `congregationId`.                                                                       |

### 2.3 `Designation` / `DesignationTerritory` — `src/models/designation.ts`

```ts
type DesignationTerritory = Omit<Territory, 'recentHistory'> & { status: DesignationStatusEnum };
type DesignationSettings = Partial<Pick<CongregationSettings, 'shouldDesignationBlockAfterExpired'>>;
```

| Field                 | Type                     | Required | Meaning / test relevance                                                                                                                    |
| --------------------- | ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | `string`                 | ✔        | The `:id` in `/work/:id`. Anyone holding it can open the page.                                                                              |
| `congregationId`      | `string`                 | ✔        | Plain id.                                                                                                                                   |
| `territories`         | `DesignationTerritory[]` | ✔        | **Embedded snapshot** (§4.2), each with its own `status`.                                                                                   |
| `createdAt`           | `Date` → `Timestamp`     | ✔        |                                                                                                                                             |
| `createdBy`           | `string`                 | ✔        | Creator's user id / uid.                                                                                                                    |
| `expiresAt`           | `Date` → `Timestamp`     | ✔        | Derived on creation from `designationAccessExpiryDays`.                                                                                     |
| `settings`            | `DesignationSettings?`   | ✖        | Snapshot of `shouldDesignationBlockAfterExpired` at creation time.                                                                          |
| `designationHeaderId` | `string?`                | ✖        | Id of the `designations_header` cycle this designation belongs to (§2.7). Optional: legacy docs predate headers; **all new writes set it**. |

### 2.4 `User` — `src/models/user.ts`

| Field          | Type                        | Required        | Meaning / test relevance                                                        |
| -------------- | --------------------------- | --------------- | ------------------------------------------------------------------------------- |
| `id`           | `string`                    | ✔               | **=== Auth uid** and === doc id.                                                |
| `name`         | `string`                    | ✔               | Split on spaces for initials and the home greeting ("Bem-Vindo {firstName}!").  |
| `email`        | `string`                    | ✔               | Compared against `InvitationLink.email` during invite sign-in.                  |
| `photoUrl`     | `string?`                   | ✖               |                                                                                 |
| `congregation` | `Congregation \| undefined` | ✔ (in practice) | **Stored as `DocumentReference`**, hydrated into a full `Congregation` on read. |
| `role`         | `RoleEnum`                  | ✔               | Defaults to `PUBLISHER` when written without one.                               |

Reading a user resolves the reference. If the congregation document is missing, the app logs an error and substitutes an `EMPTY_CONGREGATION` (`id: ''`, `name: ''`, `cities: []`,
`settings: environment.congregationSettingsDefaultValues`) instead of failing — so a dangling reference yields an app that renders with empty city lists rather than an error page.

### 2.5 `Congregation` / `CongregationSettings` — `src/models/congregation.ts`

| Field                                         | Type       | Meaning / test relevance                                                                     |
| --------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| `id`                                          | `string`   |                                                                                              |
| `name`                                        | `string`   | Shown on the profile card.                                                                   |
| `locatedOn`                                   | `string`   | e.g. `'São Paulo, SP'`.                                                                      |
| `cities`                                      | `string[]` | Source of the city `<select>` options everywhere; renamed/added/deleted on `/configuration`. |
| `settings.designationAccessExpiryDays`        | `number`   | Days added to "now" to compute `Designation.expiresAt`.                                      |
| `settings.shouldDesignationBlockAfterExpired` | `boolean`  | When `true`, an expired `/work/:id` blocks its actions.                                      |

### 2.6 `InvitationLink` — `src/models/invitation-link.ts`

| Field          | Type                 | Meaning / test relevance                                                                                                                                  |
| -------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | `string`             | Appears in the link: `${environment.baseUrl}sign-in/{id}`. Also written **inside** the document body on `add`.                                            |
| `createdBy`    | `string`             | Creator's **email** (`currentUser.email`), not the uid.                                                                                                   |
| `congregation` | `Congregation`       | **Shape drifts per write path** — see the caveat below. Read code may rely on either shape.                                                               |
| `createdAt`    | `Date` → `Timestamp` |                                                                                                                                                           |
| `usedAt`       | `Date?`              | Set when consumed.                                                                                                                                        |
| `usedBy`       | `string?`            | Uid of the consumer.                                                                                                                                      |
| `email`        | `string?`            | When set, only that email may consume the link.                                                                                                           |
| `role`         | `RoleEnum`           | Role granted to the invitee.                                                                                                                              |
| `isValid`      | `boolean`            | `true` on creation; **set to `false` on consumption**. Note the field's doc-comment says the opposite of what the code does — trust `false === consumed`. |

> **⚠ `congregation` shape between write paths.** `FirebaseInvitationLinkDataSourceService.add`
> re-wraps the hydrated `Congregation` into a **`DocumentReference`** before `setDoc`, so a freshly created
> invite stores `congregation` as a reference. Consumption moved server-side: the
> `provisionUserFromInvite` Cloud Function consumes the invite with a field-level
> `transaction.update(invite, { isValid, usedAt, usedBy })`, so a consumed invite's `congregation` > **stays a `DocumentReference`** (the legacy full-doc-overwrite drift via the repository `update()`
> no longer has any callers — `InviteBO.consumeInviteLink` was removed). Reads only access
> `congregation.id`, which works for both shapes. When seeding invites raw, always write
> `congregation` as a `DocumentReference` (the creation-time shape).

### 2.7 `DesignationsHeader` — `src/models/designations-header.ts`

Groups the designations created in one working cycle on the Assign page, so an in-progress cycle can be
resumed after navigation/reload (see `../features/territories-assign.md` UC-ASSIGN-27..31).

| Field            | Type                           | Required | Meaning / test relevance                                                                                                                   |
| ---------------- | ------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`             | `string`                       | ✔        | Also stored **inside** the document (auto-id on create).                                                                                   |
| `congregationId` | `string`                       | ✔        | Plain id (matches `designations`/`territories` linking style — NOT a reference). Scope: one open header per congregation.                  |
| `status`         | `DesignationsHeaderStatusEnum` | ✔        | `'IN_PROGRESS'` \| `'DONE'` (string values, like `DesignationStatusEnum`).                                                                 |
| `createdAt`      | `Date` → `Timestamp`           | ✔        | Set on lazy creation (first designation while none is in progress). The resume query orders by it **desc**.                                |
| `createdBy`      | `string`                       | ✔        | User id of whoever initiated the cycle's first designation.                                                                                |
| `closedAt`       | `Date?` → `Timestamp?`         | ✖        | Set when `status` flips to `DONE`.                                                                                                         |
| `closedBy`       | `'USER' \| 'CRON'?`            | ✖        | Provenance of the close: manual Stop button vs the daily 12:00 `America/Sao_Paulo` scheduled function.                                     |
| `expireAt`       | `Date?` → `Timestamp?`         | ✖        | Firestore TTL — stamped `now + 180d` on create (same retention as `designations`; TTL `fieldOverrides` entry in `firestore.indexes.json`). |

Designations link back via `Designation.designationHeaderId` (§2.3); the header holds **no** designation id
array (unbounded arrays are avoided). The resume query
(`congregationId == X && status == 'IN_PROGRESS' orderBy createdAt desc limit 1`) needs the composite index
declared in `firestore.indexes.json`; `where('designationHeaderId','==',H)` and `where('status','==','IN_PROGRESS')`
are covered by automatic single-field indexes.

---

## 3. Enum wire values (get these wrong and seeds silently misbehave)

### 3.1 `TerritoryIcon`

| Enum     | Stored value | pt-BR label   |
| -------- | ------------ | ------------- |
| `MAN`    | `'m'`        | Homem         |
| `WOMAN`  | `'w'`        | Mulher        |
| `CHILD`  | `'c'`        | Criança/Jovem |
| `COUPLE` | `'cp'`       | Casal         |
| `OTHER`  | `'o'`        | Outro         |

### 3.2 `VisitOutcomeEnum` — **numeric**

| Enum                       | Stored value |
| -------------------------- | ------------ |
| `SPOKE`                    | `0`          |
| `NOT_ANSWERED`             | `1`          |
| `MOVED`                    | `2`          |
| `ASKED_TO_NOT_VISIT_AGAIN` | `3`          |
| `REVISIT`                  | `4`          |

Assertions must compare against numbers: `expect(visit.visitOutcome).toBe(2)` (or import the enum).

> The complete-visit dialog only offers **four** outcomes (`SPOKE`, `NOT_ANSWERED`, `MOVED`,
> `ASKED_TO_NOT_VISIT_AGAIN`). `REVISIT` (`4`) is **not selectable in the UI** — a revisit is recorded as the
> separate boolean `isRevisit` on top of one of the four. `REVISIT` values therefore only ever appear in
> seeded/legacy data, but statistics still count them (see `UC-STAT`).

### 3.3 `DesignationStatusEnum` — string

`'PENDING'` | `'DONE'`.

### 3.4 `RoleEnum` — string, plus `getTranslatedRole()` labels

| Enum value       | pt-BR label rendered in the UI                      |
| ---------------- | --------------------------------------------------- |
| `APP_ADMIN`      | `App Admin.`                                        |
| `ADMIN`          | `Admin`                                             |
| `ORGANIZER`      | `Organizador`                                       |
| `ELDER`          | `Ancião`                                            |
| `SUPERINTENDENT` | `Superintendente`                                   |
| `PUBLISHER`      | `Publicador` (also the fallback for unknown values) |

---

## 4. Invariants & storage contracts

### 4.1 Dual history: subcollection vs `recentHistory` vs `lastVisit`

- The **full** visit log is `territories/{id}/history/{visitId}` — one document per visit.
- The parent territory document carries a denormalised **`recentHistory`**, recomputed on every
  `TerritoryRepository.update()` as:
  `history.sort((a, b) => a.date - b.date).slice(-5)` → **last 5 visits, ascending by date**. It is only recomputed when the passed `Territory.history` is non-empty; otherwise `recentHistory`
  keeps whatever value was passed in.
- `Territory.history` is **always stripped** before writing the parent document (`add` and `update`).
- `lastVisit` is maintained by feature code (Work page write-back / seeder), not by the repository.

**Consequences for tests:**

| Read path                                                                                      | Data source                                                                                                 | Implication                                                |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `/territories` list badges & alerts, and the history lists inside the alert-resolution dialogs | `recentHistory` on the parent doc                                                                           | Visits older than the last 5 are invisible here.           |
| `/territories` "Histórico" dialog                                                              | **full `history` subcollection** (`getTerritoryVisitHistory`, one-shot, no `orderBy`, reversed client-side) | Shows every visit ever, not just 5 (`UC-TERR-28`).         |
| `/work/:id` history dialog                                                                     | the `history` array **embedded in the designation snapshot**                                                | Absent when the snapshot carries no `history` (`UC-WORK`). |
| `/territories/statistics`                                                                      | `history` subcollection (`getAllByCongregation({ getHistory: true })`)                                      | Counts every visit ever recorded.                          |

Never conflate the two: an entry that asserts a badge must assert `recentHistory`; an entry that asserts a statistic must assert the subcollection.

Deleting a visit (`deleteVisitHistory`) removes **both** the subcollection doc and the matching element of
`recentHistory` (matched by `id`), but does **not** recompute `lastVisit`.

Resolving an alert (`TerritoryAlertsBO.resolveTerritoryHistoryAlert`) marks the matching entries
`isResolved: true`, writes them back to the subcollection with `setVisitHistory`, **and** merges the updated entries back into the **full** `recentHistory` (matched by id) — so passing a filtered subset (e.g. the `Revisita` dialog's `filter(h => h.isRevisit)`) no longer drops unrelated entries, while the subcollection stays complete (`UC-TERR-31`; truncation fixed 2026-08 — see
`docs/2026-08-unit-testing-bug-fixes.md`).

### 4.2 Designation territories are frozen snapshots

`Designation.territories` embeds `Omit<Territory, 'recentHistory'> & { status }` at creation time. Editing or deleting the source territory afterwards does **not** change the designation, so `/work/:id`
can legitimately show an address that no longer exists in `territories`. The visit write-back, however, targets the **real** `territories/{id}` document by id.

Because `recentHistory` is omitted but `history` is not, an embedded designation territory may carry a
`history` array. The Work page uses it to decide whether to show the history affordance — a designation territory built without `history` entries therefore hides that button (see `UC-WORK` entries).

> **⚠ The `history` field is mandatory in practice.** `FirebaseDesignationDatasourceService`'s read
> converter runs `t.history.map(...)` on every embedded territory **without a null-guard**, so a designation
> whose embedded territory has no `history` field makes `/work/:id` throw inside the `docData$` pipeline and
> hang on its loading state (`UC-WORK-04`). Always seed `history: []` (empty array is fine) on every
> `buildDesignationTerritory`. The **default baseline `seed-designation` omits it**, so it cannot be opened
> as-is — see §5.

### 4.2.1 The visit write-back is fire-and-forget

`WorkPageComponent.handleTerritoryUpdated` builds `concat([...]).pipe(retry(2))` and **never subscribes**. The writes still reach Firestore because the repositories return `from(setDoc(...))` / `from(updateDoc(...))`
and the underlying promise is created **eagerly** when the method is called. Consequences for tests:

- the declared `retry(2)` and any error handling are dead code — a rejected write is silently swallowed (only an unhandled rejection in the console);
- the three writes (designation doc, territory parent doc, history doc) are **not ordered or atomic**, so assert each one with `expect.poll` / `toPass` rather than assuming they land together.

### 4.3 `positionIndex` is allocated per city

`getNextPositionIndexForCity(city)` queries `where('city','==',city)`, `orderBy('positionIndex','desc')`,
`limit(1)` and returns `(last.positionIndex ?? 0) + 1`, or `0` when the city has no territories.

- The query is **not** scoped by `congregationId` → in a multi-congregation emulator state the next index is influenced by _other_ congregations' territories sharing the same city name.
- It requires `positionIndex` to exist on the documents; territories seeded without it are not returned by that query (Firestore skips docs missing the `orderBy` field), so always seed `positionIndex`.
- Drag-and-drop reorder rewrites `positionIndex` for the affected territories via `batchUpdate`
  (a Firestore transaction).

### 4.4 Alerts depend on `note`

The alert badges (bible student / recently moved / unresolved "not answered") are rendered inside a block that is only shown when the territory has a non-empty `note`. **⚠ suspected defect** — seeds for badge assertions must therefore always set a `note`. Consolidated in
[`../testability-gaps.md`](../testability-gaps.md#documented-current-behaviour-vs-suspected-defects).

### 4.5 Identity

`users/{docId}` where `docId === Auth uid`. The seeder enforces it (`auth.createUser({ uid: user.id })`), and the app relies on it when resolving the signed-in user. A Firestore user document without a matching Auth user is treated as "no account".

### 4.6 Realtime vs one-shot reads

| Read                                                      | API               | UI updates without reload?                                                              |
| --------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| Territories list (`getAllByCongregation`)                 | `collectionData$` | **Yes** — live listener.                                                                |
| Territories by city (`getAllByCongregationAndCities`)     | `collectionData$` | **Yes**.                                                                                |
| Users list (`getAllByCongregation`)                       | `collectionData$` | **Yes**.                                                                                |
| Designation (`getById`)                                   | `docData$`        | **Yes**.                                                                                |
| Congregation (`getById`)                                  | `docData$`        | **Yes**.                                                                                |
| Territory by id, `getAllInIds`, visit history, statistics | `getDocs`         | **No** — snapshot at call time.                                                         |
| `UserStateService` (signal-backed)                        | in-memory         | Only when explicitly `setUser(...)`; a congregation edit made elsewhere needs a reload. |

So: a background Admin-SDK write is expected to appear on `/territories` **without** a reload, but the statistics page and the profile/configuration user state require a navigation or reload.

### 4.7 Firestore query limits worth testing

- `getAllByCongregationAndCities` uses `where('city','in',cities)` → **max 30** values per query.
- `getAllInIds` uses `where(documentId(),'in',ids)` → **max 30** ids per query; selecting more territories than that in one designation is an untested boundary (see `UC-ASSIGN` edge cases).

### 4.8 Statistics history resolution: one collection-group query

`getAllByCongregation(congregationId, { getHistory: true })` resolves every territory's visits with a **single collection-group query** — `collectionGroup('history')` where `congregationId == X` and
`date >= now - 1 year` (see the composite index in `firestore.indexes.json` and the recursive
`match /{path=**}/history/{historyId}` rule in `firestore.rules`). This replaced one subcollection query per territory, which made `/territories/statistics` crawl on congregations with history.

Consequences:

- Visit documents **must carry `congregationId`** (and `territoryId`) to appear: new visits are stamped by the work page's write-back (`WorkPageComponent.handleTerritoryUpdated`, from
  `designation.congregationId`), seeded docs are stamped by the seeder, and legacy production docs are stamped once by the `backfill:history-stamps` script.
- Visits older than **1 year** are not returned → dynamic period tiles and the `Mudaram` count only see the last year of data (the previous behaviour only saw `recentHistory`, so this is strictly broader).
- A congregation with zero territories returns `of([])` immediately (empty-snapshot guard, gap #42).

### 4.9 Designations header lifecycle

- A header is created **lazily**: only by the first designation created while no `IN_PROGRESS` header exists for the congregation (any assigner of the congregation resumes the same header — the scope is per congregation, not per user).
- Every designation write after that reuses the in-memory header id (no extra read; a known, accepted ceiling is documented in the backlog plan: a header closed by the cron while the page stayed open still receives one more designation stamp).
- The header flips to `DONE` exactly once — either manually (`closedBy: 'USER'`, Stop button, available to anyone who can open the Assign page) or by the daily scheduled function (`closedBy: 'CRON'`, 00:00 midnight `America/Sao_Paulo`, which closes **every** `IN_PROGRESS` header regardless of age).
- Stopping closes the header only; the designations and their territories are kept untouched.
- Security: `designations_header` is **not** in the public rules — a dedicated rule in `firestore.rules` restricts read/write to authenticated users belonging to the same congregation (or `APP_ADMIN`).

---

## 5. Default E2E baseline seed

Applied automatically before **every** test by the `resetAndSeed` auto fixture (the emulator starts empty). Ids come from `DEFAULT_SEED_IDS` (`seed.ids`).

| Entity         | Id                         | Key values                                                                                                                                                                                       |
| -------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Congregation   | `seed-congregation`        | `Congregação Jardim Primavera`, `São Paulo, SP`, cities `['São Paulo', 'Osasco']`, settings `{ designationAccessExpiryDays: 7, shouldDesignationBlockAfterExpired: true }`                       |
| Admin user     | `seed-user-admin`          | `Carlos Almeida`, `carlos.almeida@example.com`, `ADMIN`                                                                                                                                          |
| Publishers     | `seed-user-publisher-1..3` | `Ana Souza`, `Pedro Lima`, `Mariana Costa`, `PUBLISHER`, emails `seed-user-publisher-N@example.com`                                                                                              |
| Elder          | `seed-user-elder`          | `Marcos Oliveira`, `ELDER`, `seed-user-elder@example.com`                                                                                                                                        |
| Organizer      | `seed-user-organizer`      | `Ricardo Santos`, `ORGANIZER`, `seed-user-organizer@example.com`                                                                                                                                 |
| Superintendent | `seed-user-superintendent` | `Felipe Rodrigues`, `SUPERINTENDENT`, `seed-user-superintendent@example.com`                                                                                                                     |
| App Admin      | `seed-user-app-admin`      | `Daniel Ferreira`, `APP_ADMIN`, `seed-user-app-admin@example.com`                                                                                                                                |
| Territory 1    | `seed-territory-1`         | São Paulo · `Rua das Acácias, 45 - Pinheiros` · `COUPLE` · `positionIndex 0` · 2 visits (`REVISIT` 2024-03-10, `SPOKE` 2024-02-20)                                                               |
| Territory 2    | `seed-territory-2`         | Osasco · `Av. dos Autonomistas, 1200 - Centro` · `WOMAN` · `positionIndex 1` · 1 visit (`NOT_ANSWERED` 2024-03-05, `isResolved: false`)                                                          |
| Territory 3    | `seed-territory-3`         | São Paulo · `Rua Harmonia, 300 - Vila Madalena` · `MAN` · `positionIndex 2` · `isBibleStudent: true`, `bibleInstructor: seed-user-publisher-1` · 1 visit (`SPOKE` 2024-03-12, `isRevisit: true`) |
| Designation    | `seed-designation`         | `createdBy: seed-user-admin`, `createdAt 2024-03-01`, **`expiresAt 2024-03-08` (already expired)**, embeds a snapshot of `seed-territory-1`, `settings.shouldDesignationBlockAfterExpired: true` |

Baseline counts: `congregations 1`, `users 8`, `territories 3`, `designations 1`, history docs `2 + 1 + 1`.

> The baseline designation is **expired, blocking, and unopenable**: its embedded territory is built by
> `buildDesignationTerritory` without a `history` field, which breaks the read converter (§4.2). Any
> `/work/:id` test must seed its own designation with a future `expiresAt` **and** `history: []` (or real
> entries) on every embedded territory; do not reuse `seed.ids.designation` as-is.

Every seeded user gets an Auth emulator account with `DEFAULT_PASSWORD = 'test-password-123'`, and
`signInAs` mints custom tokens for `ROLE_UIDS` — `admin` → `seed-user-admin`,
`publisher` → `seed-user-publisher-1`, `elder` → `seed-user-elder`, `organizer` → `seed-user-organizer`,
`superintendent` → `seed-user-superintendent`, `app_admin` → `seed-user-app-admin`.

### Factory defaults (only override what a use case cares about)

| Factory                     | Notable defaults                                                                                                                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buildCongregation`         | `Congregação Central`, cities `['São Paulo', 'Guarulhos']`, `designationAccessExpiryDays: 7`, `shouldDesignationBlockAfterExpired: true`                                                                                |
| `buildUser`                 | role `PUBLISHER`, `name 'João da Silva'`, `email '{id}@example.com'`, `congregationId: ''` (**always override**)                                                                                                        |
| `buildTerritory`            | `São Paulo`, `Rua das Flores, 123 - Vila Mariana`, non-empty `note`, `mapsLink` set, `icon COUPLE`, `positionIndex 0`, `peopleQuantity 1`, `history: [buildVisitHistory()]`, `congregationId: ''` (**always override**) |
| `buildVisitHistory`         | `SPOKE`, `isRevisit false`, `isResolved true`, `name 'Maria'`, dates start at `2024-01-15T10:00Z` and decrease by one day per default build                                                                             |
| `buildDesignation`          | `createdAt 2024-02-01`, `expiresAt 2024-02-08` (**past** — override for active designations), one embedded territory, `settings.shouldDesignationBlockAfterExpired: true`                                               |
| `buildDesignationTerritory` | `Av. Paulista, 1000 - Bela Vista`, `note: ''`, `icon MAN`, `status PENDING`, **no `history`**                                                                                                                           |
| `buildDesignationsHeader`   | `status IN_PROGRESS`, `createdAt 2026-09-01T12:00Z`, `congregationId: ''` (**always override**) — no `closedAt`/`closedBy` unless you pass them with a `DONE` status                                                    |

The seeder derives the parent territory's `lastVisit` (newest history date, else `null`) and
`recentHistory` (newest 5, **descending**) from `history`. Note the ordering difference versus the app's
`update()` (ascending) — a test that asserts array order must know which writer produced the data.

---

## Sources

- `apps/ministry-maps/src/models/territory.ts`, `designation.ts`, `designations-header.ts`, `territory-visit-history.ts`, `user.ts`,
  `congregation.ts`, `invitation-link.ts`, `enums/{role,visit-outcome,designation-status,designations-header-status,designations-header-closed-by}.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-territory-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-user-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-designation-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-designations-header-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-invitation-link-datasource.service.ts`
- `apps/ministry-maps/src/app/repositories/firebase/firebase-congregation-datasource.service.ts`
- `apps/ministry-maps/src/app/state/user.state.service.ts`
- `apps/ministry-maps/e2e/seed/{collections,seeder,default.seed,types}.ts`, `e2e/seed/factories/*`,
  `e2e/config/auth.config.ts`
