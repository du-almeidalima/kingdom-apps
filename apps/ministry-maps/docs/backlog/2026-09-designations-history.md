# Designations History ("Histórico de Designações") — Implementation Plan

- **Date:** 2026-09-28
- **Scope:**
  - `apps/ministry-maps`: territory and work features, home card.
  - `libs/common-ui`: progress bar.
  - `functions/ministry-maps`: backfill script only.
  - `firestore.rules` and `firestore.indexes.json`.
  - E2E harness and docs.
- **Status:** design decisions agreed in Q&A (§1). Do the tasks in order; every task must end with passing checks.

---

## 0. Context

A `designations_header` groups the designations created in one Assign cycle. See `apps/ministry-maps/docs/backlog/2026-09-designations-header.md`; its §1.7 deferred "a screen for elders to browse the history of designations". This plan builds that screen:

1. **List page** `/territories/designations`
   - Every header of the congregation (IN_PROGRESS and DONE), newest first.
   - 20 per page plus a "Carregar mais" button.
   - Status only: 1 read per row.
2. **Detail page** `/territories/designations/:headerId`
   - Live overall territory progress of the header, the outcome breakdown and closure info.
   - One card per designation with its own progress.
   - A card expands in place to list its territories (the designation doc loads the first time it is expanded) and offers a WhatsApp re-share.
3. **Cheap progress tracking**: one denormalized progress document per header, written from the client (no Cloud Function).
   - The authenticated Assign flow writes it when a designation is created (registers the designation and its territory total).
   - The anonymous `/work/:id` page sets `{designationId, territoryId, outcome, completedAt}` when a visit is completed or edited, and deletes that entry on undo.
   - Detail page cost: 1 header read + 1 progress read, plus 1 designation read per expanded card.
   - The Assign page never loads progress.

## 1. Confirmed decisions

| Decision | Choice |
|---|---|
| Progress storage | Subcollection doc **`designations_header/{headerId}/progress/summary`** (fixed id constant `DESIGNATIONS_PROGRESS_DOC_ID = 'summary'`) |
| Progress shape | One doc, two maps: `designations` (per-designation totals) and `territories` (completed entries keyed `${designationId}_${territoryId}`) |
| Writers | Client side only. One field-path `updateDoc` per key (atomic per key, no read). Undo = `deleteField()` |
| Rules | Read, create and full update: authenticated + same congregation (or APP_ADMIN). Anonymous: **update only, and only the `territories` key** |
| List page | All headers, newest first, 20 per page + `Carregar mais`, one-shot reads, **status only** (no progress per row) |
| Detail page | Live stream (header + progress doc). Shows outcome breakdown, closure info, designation dates (expired badge) and re-share |
| Drill-down | Expand in place per designation card; one-shot read of the designation doc the first time the card is expanded |
| Legacy headers | Idempotent backfill script in `functions/ministry-maps` (`npm run backfill:designations-progress`) |
| Routes / copy | Home link `Histórico de Designações`; `/territories/designations` and `/territories/designations/:headerId`; heading `Histórico de designações` |
| Roles | Reuse `TERRITORY_ALLOWED_ROLES` (ORGANIZER, ADMIN, ELDER, SUPERINTENDENT; APP_ADMIN bypasses the list in `authGuard`). No new config |

---

## 2. Data model

### 2.1 New document `designations_header/{headerId}/progress/summary`

```ts
// apps/ministry-maps/src/models/designations-progress.ts  (Create)
import { VisitOutcomeEnum } from './enums/visit-outcome';

/** Fixed id of the single progress document inside `designations_header/{headerId}/progress`. */
export const DESIGNATIONS_PROGRESS_DOC_ID = 'summary';

/** Registered by the Assign flow when a designation is created. */
export type DesignationProgressEntry = {
  territoriesTotal: number;
  createdAt: Date;
  expiresAt: Date;
};

/** Set by /work when a territory visit is completed (or edited); deleted on undo. */
export type TerritoryProgressEntry = {
  designationId: string;
  territoryId: string;
  outcome: VisitOutcomeEnum;
  completedAt: Date;
};

export type DesignationsProgress = {
  id: string;               // always DESIGNATIONS_PROGRESS_DOC_ID
  headerId: string;
  congregationId: string;   // needed by security rules (plain id, like the header)
  designations: Record<string, DesignationProgressEntry>;   // key = designationId
  territories: Record<string, TerritoryProgressEntry>;      // key = territoryProgressKey(designationId, territoryId)
  expireAt?: Date;          // Firestore TTL — subcollections are NOT deleted with their parent
};

/** Map key for {@link DesignationsProgress.territories}. */
export const territoryProgressKey = (designationId: string, territoryId: string) => `${designationId}_${territoryId}`;
```

`apps/ministry-maps/src/models/firebase/firebase-designations-progress-model.ts` (Create) holds the `Timestamp` variant:
- `expireAt?: Timestamp`
- `designations[*].createdAt` and `designations[*].expiresAt`: `Timestamp`
- `territories[*].completedAt`: `Timestamp`

Why a map rather than an array:
- `arrayRemove` needs an exact object match, and arrays can't be updated by key.
- A map key is updated or removed atomically with `updateDoc(ref, new FieldPath('territories', key), value | deleteField())`. That needs no read and never conflicts across different keys.
- The 1 MiB document cap allows thousands of territories per cycle, and cycles are daily.

### 2.2 Write paths

| Event | Writer (auth) | Operation |
|---|---|---|
| Designation created (Assign) | `DesignationsHeaderBO.createDesignation` (authenticated) | `setDoc(progressRef, { id, headerId, congregationId, expireAt, designations: { [designationId]: entry } }, { merge: true })`. Creates the doc on the first designation and deep-merges after that |
| Visit completed or edited (`/work/:id`) | `WorkBO.recordTerritoryProgress` (anonymous) | `updateDoc(progressRef, new FieldPath('territories', key), entry)`. An edit overwrites the same key with the new outcome |
| Visit undone (`/work/:id`) | `WorkBO.undoLastVisitChanges` (anonymous) | `updateDoc(progressRef, new FieldPath('territories', key), deleteField())` |
| Designation without `designationHeaderId` (legacy) | — | Skipped (no write) |
| Header has no progress doc (legacy, not yet backfilled) | — | `updateDoc` rejects with `not-found`. The error is swallowed and logged with `LoggerService.warn`; the publisher never sees an alert |

`expireAt` = `header.expireAt ?? new Date(header.createdAt.getTime() + 180d)`. This matches the header's retention. TTL deletion does not cascade to subcollections, so the progress doc needs its own TTL.

### 2.3 Derived values (client-side pure functions, no extra reads)

- **Header:**
  - `territoriesTotal = Σ designations[*].territoriesTotal`
  - `territoriesDone = count(territories)`
  - `percent = total ? round(done/total*100) : 0`
  - `outcomeCounts` per `VisitOutcomeEnum`: SPOKE, NOT_ANSWERED, MOVED, ASKED_TO_NOT_VISIT_AGAIN; REVISIT only if present.
- **Per designation:**
  - `done = count(territories where designationId == id)`, `total`, `percent`
  - `isExpired = expiresAt < now`
  - `index`: 1-based, ordered by `createdAt` ascending. Labelled `Designação {n}`.
- **Expanded rows:**
  - Addresses and cities come from the loaded `Designation.territories`.
  - Status and outcome come from the progress map: key present → Concluído + outcome; otherwise Pendente. This keeps the collapsed and expanded views consistent.

### 2.4 Rules (`firestore.rules`): nested inside the existing `match /designations_header/{headerId}` block

Split the grants into explicit statements, mirroring the header block:
- `allow read, delete`: authenticated and (APP_ADMIN or `isCallerInCongregation(resource.data.congregationId)`).
- `allow create`: authenticated and (APP_ADMIN or `isCallerInCongregation(request.resource.data.congregationId)`).
- `allow update`:
  - (authenticated and (APP_ADMIN or `isCallerInCongregation(resource.data.congregationId)`)), OR
  - `request.resource.data.diff(resource.data).affectedKeys().hasOnly(['territories'])`, which is the anonymous path.

Also:
- Add a comment explaining why anonymous users may touch only `territories`.
- The catch-all already excludes `designations_header`, so this dedicated rule is the only one that grants access.
- Update the comments on the header block and the catch-all.

### 2.5 Indexes / TTL (`firestore.indexes.json`)

- **Composite index** for the list query on `designations_header`: `congregationId ASC, createdAt DESC`, with `density: SPARSE_ALL` like the existing entries.
- **TTL field override:** `{ "collectionGroup": "progress", "fieldPath": "expireAt", "ttl": true, "indexes": [] }`.

### 2.6 Read budget

| Flow | Reads |
|---|---|
| List page, 20 headers | 21 (limit 21 so the page knows whether more exist) |
| `Carregar mais` | 21 per page |
| Detail page open | 2 (header `docData$` + progress `docData$`), then 1 per changed doc while the page is open |
| Expand a designation card (first time) | 1 (one-shot, kept for the life of the page) |
| Assign page | Unchanged (never reads progress) |
| Create designation | +1 write (merge set) |
| Complete / edit / undo visit | +1 write |

---

## 3. File changes

### Create
| Path | Responsibility |
|---|---|
| `apps/ministry-maps/src/models/designations-progress.ts` | Domain types, `DESIGNATIONS_PROGRESS_DOC_ID` and `territoryProgressKey` (§2.1) |
| `apps/ministry-maps/src/models/firebase/firebase-designations-progress-model.ts` | Timestamp variant |
| `apps/ministry-maps/src/app/repositories/designations-progress.repository.ts` | Abstract repository |
| `apps/ministry-maps/src/app/repositories/firebase/firebase-designations-progress-datasource.service.ts` (+ `.spec.ts`) | Firestore implementation |
| `apps/ministry-maps/src/test/mocks/models/designations-progress.mock.ts` | `DesignationsProgressRepositoryMock` and `designationsProgressMockBuilder` |
| `apps/ministry-maps/src/app/features/territory/bo/designations-history/designations-history.bo.ts` (+ `.spec.ts`) | Stateless BO: list paging, detail stream, pure summaries |
| `apps/ministry-maps/src/app/features/territory/models/designations-history.models.ts` | View-model types |
| `apps/ministry-maps/src/app/features/territory/pages/designations-history-page/designations-history-page.component.{ts,html,scss,spec.ts}` | List page (smart component) |
| `apps/ministry-maps/src/app/features/territory/pages/designations-history-details-page/designations-history-details-page.component.{ts,html,scss,spec.ts}` | Detail page (smart component) |
| `apps/ministry-maps/src/app/features/territory/components/designations-header-list-item/designations-header-list-item.component.{ts,scss,spec.ts}` | Presentational row |
| `apps/ministry-maps/src/app/features/territory/components/designations-progress-summary/designations-progress-summary.component.{ts,scss,spec.ts}` | Presentational header summary |
| `apps/ministry-maps/src/app/features/territory/components/designation-progress-card/designation-progress-card.component.{ts,scss,spec.ts}` | Presentational expandable designation card |
| `apps/ministry-maps/src/app/features/territory/components/designations-header-status-badge/designations-header-status-badge.component.{ts,spec.ts}` | `Em andamento` / `Encerrada` badge |
| `libs/common-ui/src/lib/components/progress-bar/progress-bar.component.{ts,scss,spec.ts}` | Generic `lib-progress-bar` |
| `functions/ministry-maps/src/models/designations-progress.ts` | Admin-SDK doc type |
| `functions/ministry-maps/src/utils/designations-progress-builder.ts` (+ `test/utils/designations-progress-builder.spec.ts`) | Pure builder used by the backfill |
| `functions/ministry-maps/src/scripts/backfill-designations-progress.ts` | Idempotent backfill / reconcile script |
| `apps/ministry-maps/e2e/seed/factories/designations-progress.factory.ts` | `buildDesignationsProgress` |
| `apps/ministry-maps/e2e/page-objects/designations-history.page.ts`, `designations-history-details.page.ts` | Page objects |
| `apps/ministry-maps/e2e/tests/territories-designations-history.spec.ts` | UC-HIST specs |
| `apps/ministry-maps/docs/features/territories-designations-history.md` | New feature doc (`UC-HIST`) |
| `apps/ministry-maps/docs/backlog/2026-09-designations-history.md` | Copy of this plan (repo convention) |

### Modify
| Path | Change |
|---|---|
| `apps/ministry-maps/src/app/repositories/designations-header.repository.ts` | Add `getPageByCongregation` and `getById` |
| `apps/ministry-maps/src/app/repositories/firebase/firebase-designations-header-datasource.service.ts` (+ spec) | Implement both |
| `apps/ministry-maps/src/app/repositories/repositories-providers.ts` | Register `DesignationsProgressRepository` |
| `apps/ministry-maps/src/test/mocks/models/designations-header.mock.ts` | Mock the new methods |
| `apps/ministry-maps/src/test/mocks/providers/mock-repositories-providers.ts`, `src/test/mocks/index.ts` | Register and export the progress mock |
| `apps/ministry-maps/src/app/features/territory/bo/designations-header/designations-header.bo.ts` (+ spec) | Register the designation in the progress doc after `designationRepository.add` |
| `apps/ministry-maps/src/app/features/work/bo/work.bo.ts` (+ spec) | Add `recordTerritoryProgress`; undo removes the progress entry |
| `apps/ministry-maps/src/app/features/work/pages/work-page/work-page.component.ts` (+ spec) | Add the progress write to the write-back `concat` |
| `apps/ministry-maps/src/app/shared/utils/share-utils.ts` (+ spec) | Add `shareDesignationLink(designationId)`, moved from the Assign page |
| `apps/ministry-maps/src/app/features/territory/pages/assign-territories-page/assign-territories-page.component.ts` | Delegate `shareDesignation` to the shared helper (same behavior) |
| `apps/ministry-maps/src/app/features/territory/models/enums/territory-routes.ts` | Add `DESIGNATIONS_HISTORY = 'designations'` |
| `apps/ministry-maps/src/app/features/territory/territory.routes.ts` | Add 2 child routes |
| `apps/ministry-maps/src/app/features/home/pages/home-page/home-page.component.html` (+ spec) | Add the link |
| `libs/common-ui/src/lib/components/index.ts` | Export the progress bar |
| `firestore.rules`, `firestore.indexes.json` | §2.4, §2.5 |
| `functions/ministry-maps/package.json` | Add `"backfill:designations-progress": "node lib/scripts/backfill-designations-progress.js"` |
| `apps/ministry-maps/e2e/seed/{types,seeder,collections}.ts`, `seed/factories/index.ts` | Progress seed support |
| `apps/ministry-maps/e2e/page-objects/home.page.ts`, `e2e/tests/navigation.spec.ts` | New home link |
| `apps/ministry-maps/e2e/tests/firestore-rules.spec.ts`, `work-designation.spec.ts`, `territories-assign.spec.ts` | New cases |
| Docs (listed in Task 12) | Documentation updates |

---

## 4. Implementation steps

> **Conventions for every new Angular file** (from `.agents/rules/angular-components.md`):
> - Standalone (omit `standalone: true`) with `ChangeDetectionStrategy.OnPush`.
> - Selector prefix `kingdom-apps-`.
> - Use `inject()`, `input()`/`input.required()` and `output()`; template members are `protected readonly`.
> - Templates use `@if`, `@for (track …)` and `@let`.
> - Put a `data-testid` on every interactive or dynamic element.
> - Colors come only from `--kui-*` tokens with an SCSS fallback (`.agents/rules/styling.md`).
> - pt-BR copy exactly as written below.
> - State written in subscribe callbacks must be a signal.
> - Intra-app imports are relative; the only cross-project alias is `@kingdom-apps/common-ui`.

### Task 1 — Progress data layer

1. **Create** `src/models/designations-progress.ts` exactly as in §2.1, and `src/models/firebase/firebase-designations-progress-model.ts`:
   ```ts
   export type FirebaseDesignationProgressEntry = Omit<DesignationProgressEntry, 'createdAt' | 'expiresAt'> & { createdAt: Timestamp; expiresAt: Timestamp };
   export type FirebaseTerritoryProgressEntry = Omit<TerritoryProgressEntry, 'completedAt'> & { completedAt: Timestamp };
   export type FirebaseDesignationsProgressModel = Omit<DesignationsProgress, 'designations' | 'territories' | 'expireAt'> & {
     designations?: Record<string, FirebaseDesignationProgressEntry>;
     territories?: Record<string, FirebaseTerritoryProgressEntry>;
     expireAt?: Timestamp;
   };
   ```
2. **Create** `src/app/repositories/designations-progress.repository.ts`:
   ```ts
   export abstract class DesignationsProgressRepository {
     /** Live progress document of a header (`undefined` while it does not exist — e.g. legacy headers). */
     abstract getStreamByHeaderId(headerId: string): Observable<DesignationsProgress | undefined>;
     /** Creates the progress doc on first call (merge) and registers the designation's totals. Authenticated only. */
     abstract registerDesignation(header: DesignationsHeader, designationId: string, entry: DesignationProgressEntry): Observable<void>;
     /** Sets (or overwrites on edit) one completed territory entry. Anonymous-safe (rules allow only `territories`). */
     abstract setTerritoryProgress(headerId: string, entry: TerritoryProgressEntry): Observable<void>;
     /** Removes one completed territory entry (undo). Anonymous-safe. */
     abstract removeTerritoryProgress(headerId: string, designationId: string, territoryId: string): Observable<void>;
   }
   ```
3. **Create** `src/app/repositories/firebase/firebase-designations-progress-datasource.service.ts`. Use `@Injectable({ providedIn: 'root' })` and `implements DesignationsProgressRepository`, following `firebase-designations-header-datasource.service.ts`.
   - `static readonly SUBCOLLECTION_NAME = 'progress'`. TTL constants `TTL_DAYS = 180` and `MS_PER_DAY`, the same as the header datasource.
   - Private `progressDocRef(headerId)`:
     ```ts
     doc(this.firestore,
       FirebaseDesignationsHeaderDatasourceService.COLLECTION_NAME, headerId,
       SUBCOLLECTION_NAME, DESIGNATIONS_PROGRESS_DOC_ID,
     ).withConverter<DesignationsProgress>(
       firebaseEntityConverterFactory(convertDesignationsProgressFirebaseTimestampsToDate),
     )
     ```
   - Converter: maps `expireAt?.toDate()`, every `designations[*].createdAt`/`expiresAt`, and every `territories[*].completedAt`. Missing maps default to `{}` (`Object.fromEntries(Object.entries(map ?? {}).map(...))`).
   - `getStreamByHeaderId` → `docData$(ref)`.
   - `registerDesignation(header, designationId, entry)` → a lazy merge set:
     ```ts
     defer(() => from(setDoc(ref, {
       id: DESIGNATIONS_PROGRESS_DOC_ID,
       headerId: header.id,
       congregationId: header.congregationId,
       expireAt: header.expireAt ?? new Date(header.createdAt.getTime() + TTL_DAYS * MS_PER_DAY),
       designations: { [designationId]: entry },
     }, { merge: true })))
     ```
     Never send `territories` here: the merge must not overwrite it.
   - `setTerritoryProgress(headerId, entry)` → `defer(() => from(updateDoc(ref, new FieldPath('territories', territoryProgressKey(entry.designationId, entry.territoryId)), entry)))`.
   - `removeTerritoryProgress(headerId, designationId, territoryId)` → the same, with `deleteField()` as the value.
   - If TypeScript rejects the `FieldPath` overload on a converter-typed ref, use an untyped `doc(...)` ref (no `withConverter`) for `updateDoc`.
4. **Register** in `repositories-providers.ts`: `{ provide: DesignationsProgressRepository, useClass: FirebaseDesignationsProgressDatasourceService }`.
5. **Create** `src/test/mocks/models/designations-progress.mock.ts`:
   - `DesignationsProgressRepositoryMock`, with every method returning `EMPTY`.
   - `designationsProgressMockBuilder(partial)`, defaulting to `{ id: 'summary', headerId: 'DESIGNATIONS-HEADER-1', congregationId: 'CONGREGATION-1', designations: {}, territories: {} }`.
   - Add the mock to `MOCK_REPOSITORIES_PROVIDERS` and export it from `src/test/mocks/index.ts`.
6. **Spec** `firebase-designations-progress-datasource.service.spec.ts`. Copy the `jest.mock('firebase/firestore', …)` and `jest.mock('./firebase-rxjs-interop', …)` setup from `firebase-designations-header-datasource.service.spec.ts`, and also mock `deleteField`. Cases:
   - `registerDesignation` calls `setDoc` with `{ merge: true }`.
     - The payload has `headerId`, `congregationId` and `designations[designationId]`, and **no** `territories` key.
     - `expireAt` equals `header.expireAt` when present, otherwise `createdAt + 180d`.
   - `setTerritoryProgress` calls `updateDoc` with a `FieldPath` equal to `new FieldPath('territories', 'D1_T1')` (check with `.isEqual`) and the entry.
   - `removeTerritoryProgress` passes the `deleteField()` sentinel.
   - Writes are lazy: `updateDoc` is not called until something subscribes.
   - Converter: Timestamps become Dates and missing maps become `{}`.

### Task 2 — Header repository: paging and read by id

1. **Modify** `designations-header.repository.ts`:
   ```ts
   /** One-shot page of the congregation's headers, newest first. `startAfterCreatedAt` is the last item's createdAt. */
   abstract getPageByCongregation(congregationId: string, pageSize: number, startAfterCreatedAt?: Date): Observable<DesignationsHeader[]>;
   /** Live header document (`undefined` when missing, e.g. TTL-deleted). */
   abstract getById(id: string): Observable<DesignationsHeader | undefined>;
   ```
2. **Implement** both in `firebase-designations-header-datasource.service.ts`:
   - `getPageByCongregation`:
     ```ts
     query(collection,
       where('congregationId', '==', id),
       orderBy('createdAt', 'desc'),
       ...(startAfterCreatedAt ? [startAfter(Timestamp.fromDate(startAfterCreatedAt))] : []),
       limit(pageSize),
     )
     ```
     then `from(getDocs(q)).pipe(map(s => s.docs.map(d => d.data())))`.
   - `getById`: `docData$(doc(this.designationsHeaderCollection, id))`.
3. **Update** `DesignationsHeaderRepositoryMock`; both new methods return `EMPTY`.
4. **Tests** in the existing datasource spec:
   - Add `startAfter` to the `jest.mock` list.
   - Assert `where`, `orderBy('createdAt','desc')` and `limit(pageSize)`.
   - Assert `startAfter` is used only when a cursor is passed.
   - Assert `getById` delegates to `docData$`.
5. **Index:** add the composite index from §2.5.

### Task 3 — The Assign flow registers progress

1. **Modify** `DesignationsHeaderBO`. Inject `DesignationsProgressRepository`. In the `switchMap` of `createDesignation`, after `designationRepository.add(newDesignation)`:
   ```ts
   switchMap((designation) =>
     this.designationsProgressRepository
       .registerDesignation(header, designation.id, {
         territoriesTotal: designation.territories.length,
         createdAt: designation.createdAt,
         expiresAt: designation.expiresAt,
       })
       .pipe(
         defaultIfEmpty(undefined),
         // The designation is already persisted and shareable — a failed progress write must not fail the assignment.
         catchError((err) => {
           this.loggerService.error(`Failed to register Designation [${designation.id}] progress on Header [${header.id}]: ${err}`);
           return of(undefined);
         }),
         map(() => ({ designation, header })),
       ),
   ),
   ```
2. **Tests** (`designations-header.bo.spec.ts`). Add `MockProvider(DesignationsProgressRepository, { registerDesignation: jest.fn().mockReturnValue(of(void 0)) })`. New cases:
   - `{ territoriesTotal, createdAt, expiresAt }` is registered under the resolved header, both when a new header is created and when an existing header is reused.
   - When `registerDesignation` errors, the call still emits `{ designation, header }` and `loggerService.error` is called.

### Task 4 — The Work page records and reverts progress

1. **Modify** `WorkBO` (`features/work/bo/work.bo.ts`). Inject `DesignationsProgressRepository` and `LoggerService`.
   ```ts
   /** Records the territory's latest visit on its header progress doc. No-op for legacy designations without a header. Never errors. */
   recordTerritoryProgress(designation: Designation, territory: DesignationTerritory): Observable<void> {
     const lastVisit = territory.history?.[territory.history.length - 1];
     if (!designation.designationHeaderId || territory.status !== DesignationStatusEnum.DONE || !lastVisit) return of(undefined);
     return this.designationsProgressRepository
       .setTerritoryProgress(designation.designationHeaderId, { designationId: designation.id, territoryId: territory.id, outcome: lastVisit.visitOutcome, completedAt: lastVisit.date })
       .pipe(defaultIfEmpty(undefined), catchError((err) => this.swallowProgressError(err, designation, territory)));
   }
   ```
   - Private `revertTerritoryProgress(designation, territory)`:
     - Only guard: `designationHeaderId` must be set.
     - Calls `removeTerritoryProgress(headerId, designation.id, territory.id)` with the same `defaultIfEmpty` and `catchError`.
   - `swallowProgressError` calls `loggerService.warn(...)` and returns `of(undefined)`. This covers a legacy header with no progress doc (`not-found`).
   - Add `this.revertTerritoryProgress(designation, designationTerritoryCopy)` to the `forkJoin` array in `undoLastVisitChanges`.
2. **Modify** `WorkPageComponent.handleTerritoryUpdated`. Add `const progressUpdate$ = this.workBO.recordTerritoryProgress(designation, designationTerritory);` and append it: `concat(designationTerritoryUpdate$, territoryUpdate$, visitHistoryUpdate$, progressUpdate$)`. The BO handles its own errors, so the existing `retry(2)` and `alert` behavior does not change.
3. **Tests:**
   - `work.bo.spec.ts`, `recordTerritoryProgress`:
     - Calls `setTerritoryProgress` with the right entry.
     - No call when `designationHeaderId` is missing, the status is PENDING, or there is no history.
     - When the repository errors, it emits `undefined` and calls `warn`.
   - `work.bo.spec.ts`, undo:
     - Calls `removeTerritoryProgress(headerId, designationId, territoryId)`.
     - Skipped for legacy designations.
     - A failing removal does not fail the `forkJoin`.
   - `work-page.component.spec.ts`:
     - Add `recordTerritoryProgress: jest.fn().mockReturnValue(of(undefined))` to the `WorkBO` `useValue` in `overrideDependencies`.
     - Assert it is called with `(designation, designationTerritory)` in the "sequenced write-back" test.
     - The retry test must keep passing unchanged.

### Task 5 — Security rules and TTL

1. Add the rules from §2.4 to `firestore.rules` and update the comments.
2. Add the TTL override from §2.5 to `firestore.indexes.json`.

### Task 6 — Shared share helper

1. Add `export const shareDesignationLink = (designationId: string) => { … }` to `shared/utils/share-utils.ts`. Move the body verbatim from `AssignTerritoriesPageComponent.shareDesignation`, importing `FeatureRoutesEnum` from `../../app-routes` and `isMobileDevice` from `./user-agent`.
2. Keep `AssignTerritoriesPageComponent.shareDesignation(id)`, but make it call `shareDesignationLink(id)`. The template and specs stay unchanged.
3. **Spec** `share-utils.spec.ts`:
   - Desktop → `window.open` is called with `whatsapp://send?text=…/work/<id>`.
   - Mobile (mock `isMobileDevice`) → the `window.location.href` assignment.

### Task 7 — `lib-progress-bar` in common-ui

1. **Create** `libs/common-ui/src/lib/components/progress-bar/progress-bar.component.ts`:
   - Selector `lib-progress-bar`.
   - Inputs: `value = input.required<number>()`, `max = input.required<number>()`, `label = input<string>('')`.
   - `percent = computed(() => max() > 0 ? clamp(round(value()/max()*100), 0, 100) : 0)`.
   - Host attributes: `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax`, `aria-label`.
   - Template: `<div class="progress-bar__fill" [style.width.%]="percent()" data-testid="progress-bar-fill"></div>`.
2. **SCSS:**
   - Track: `height: 0.8rem`, fully rounded corners, background `var(--kui-color-surface-muted, #{variables.$light-grey-100})`.
   - Fill: `var(--kui-color-action-primary, #{variables.$primary-green})`, with a width transition.
   - No hex values.
3. Export it from `libs/common-ui/src/lib/components/index.ts`.
4. **Spec:** rounding, clamping, `max = 0` → 0%, ARIA attributes.

### Task 8 — History BO (stateless) and view models

1. **Create** `features/territory/models/designations-history.models.ts`:
   ```ts
   export type DesignationsHeaderPage = { headers: DesignationsHeader[]; hasMore: boolean };
   export type OutcomeCount = { outcome: VisitOutcomeEnum; count: number };
   export type DesignationProgressSummary = { designationId: string; index: number; territoriesTotal: number; territoriesDone: number; percent: number; createdAt: Date; expiresAt: Date; isExpired: boolean };
   export type HeaderProgressSummary = { territoriesTotal: number; territoriesDone: number; percent: number; outcomeCounts: OutcomeCount[]; designations: DesignationProgressSummary[] };
   export type DesignationsHeaderDetail = {
     header: DesignationsHeader;
     progress: HeaderProgressSummary | null; // null = no progress doc (legacy)
     rawTerritories: DesignationsProgress['territories']; // {} when no progress doc; used by buildTerritoryRows
   };
   export type DesignationTerritoryRow = { territoryId: string; address: string; city: string; isDone: boolean; outcome?: VisitOutcomeEnum; completedAt?: Date };
   ```
2. **Create** `features/territory/bo/designations-history/designations-history.bo.ts`. Use `@Injectable({ providedIn: 'root' })` and inject `DesignationsHeaderRepository`, `DesignationsProgressRepository` and `DesignationRepository`.
   - `static readonly PAGE_SIZE = 20`.
   - `getHeadersPage(congregationId, startAfterCreatedAt?)`: calls the repository with `PAGE_SIZE + 1`; `hasMore = result.length > PAGE_SIZE`; `headers = result.slice(0, PAGE_SIZE)`.
   - `getHeaderDetailStream(headerId)`: `combineLatest([headerRepo.getById(id), progressRepo.getStreamByHeaderId(id)])`, mapped to:
     - `undefined` when the header is missing;
     - otherwise `{ header, progress: p ? summarize(p) : null, rawTerritories: p?.territories ?? {} }`.
   - `getDesignation(designationId)`: `designationRepository.getById(id).pipe(take(1))`. One-shot, so expanded cards don't each hold a listener.
   - `static summarize(progress, now = new Date()): HeaderProgressSummary`:
     - Applies the §2.3 rules.
     - Designations are sorted by `createdAt` ascending, with a 1-based `index`.
     - Outcome counts follow enum order and include only counts above 0.
   - `static buildTerritoryRows(designation: Designation, territories: DesignationsProgress['territories']): DesignationTerritoryRow[]`:
     - Keeps the order of `designation.territories`.
     - `isDone`, `outcome` and `completedAt` come from `territories[territoryProgressKey(designation.id, t.id)]`.
3. **Spec** (TestBed + `MockProvider`s, like `designations-header.bo.spec.ts`):
   - **Paging:** requests `PAGE_SIZE + 1` and forwards the cursor. `hasMore` is true for 21 results and false for 20 or fewer; at most 20 headers are returned.
   - **Detail stream:** `undefined` when the header is missing; `progress: null` when the progress doc is missing; re-emits when the progress doc emits again.
   - **`summarize`:** totals, percent rounding, a total of 0 → 0%, per-designation done counts, index ordering, `isExpired` against the injected `now`, zero-count outcomes omitted.
   - **`buildTerritoryRows`:** done/pending matched by key, order preserved, entries from other designations ignored.
   - **`getDesignation`:** completes after the first emission.

### Task 9 — UI: routes, pages, components, home link

**Copy (pt-BR, verbatim; tests select on these strings):**

| Where | Text |
|---|---|
| Home link | `Histórico de Designações` |
| List heading (`data-testid="designations-history-heading"`) | `Histórico de designações` |
| Row title / subtitle | `Sessão de {createdAt \| date:'dd/MM/yyyy'}` / `Iniciada às {createdAt \| date:'HH:mm'}` |
| Status badge | `Em andamento` (`badge badge--sm badge--info`), `Encerrada` (`badge badge--sm badge--muted`) |
| Closure line | `Encerrada manualmente em {closedAt \| date:'dd/MM/yyyy HH:mm'}` (USER) / `Encerrada automaticamente em …` (CRON) |
| Load more | `Carregar mais` |
| List empty | `Nenhuma sessão de designações encontrada.` |
| List error toast | `Não foi possível carregar o histórico. Tente novamente.` |
| Detail summary | `{done} de {total} territórios concluídos` + `{percent}%` |
| Outcome labels | SPOKE `Contatados`, NOT_ANSWERED `Ninguém atendeu`, MOVED `Mudaram`, ASKED_TO_NOT_VISIT_AGAIN `Não visitar`, REVISIT `Revisita` (icon from the existing `visitOutcomeToIcon` pipe) |
| Designations section heading | `Designações` |
| Card | Title `Designação {index}`; meta `Criada em {createdAt \| date:'dd/MM/yyyy HH:mm'}`; progress `{done}/{total}` |
| Expired badge | `Expirada` (`badge badge--sm badge--danger`) |
| Territory status | `Concluído` (`badge--success`) + outcome label; `Pendente` (`badge--warning`) |
| Re-share button | `Reenviar` (icon `paper-plane-2`) |
| Detail not found | `Sessão de designações não encontrada.` |
| No progress (legacy) | `Progresso indisponível para esta sessão.` |
| Expanded designation missing (TTL-deleted) | `Designação não encontrada.` |

1. **Routes:**
   - Add `DESIGNATIONS_HISTORY = 'designations'` to `territory-routes.ts`.
   - Add two children in `territory.routes.ts`:
     - `{ path: TerritoryRoutesEnum.DESIGNATIONS_HISTORY, component: DesignationsHistoryPageComponent }`
     - `{ path: \`${TerritoryRoutesEnum.DESIGNATIONS_HISTORY}/:headerId\`, component: DesignationsHistoryDetailsPageComponent }`
   - The guard is inherited from the parent route.
2. **Home:** add a 4th `<li class="card-body__link-list-item">` after `Estatísticas Territórios`, containing:
   ```html
   <a class="card-body__link" routerLink="/{{ FeatureRoutes.TERRITORIES }}/{{ TerritoryRoutes.DESIGNATIONS_HISTORY }}">Histórico de Designações</a>
   ```
   Spec: the link renders with the correct `href`.
3. **`DesignationsHeaderStatusBadgeComponent`**
   - Input `status = input.required<DesignationsHeaderStatusEnum>()`.
   - Renders a span with `data-testid="designations-header-status-badge"`.
   - Spec: both labels and classes.
4. **`DesignationsHeaderListItemComponent`**
   - Input `header = input.required<DesignationsHeader>()`.
   - The row is an `<a [routerLink]="[header().id]" data-testid="designations-header-list-item">` containing the title, subtitle, status badge, closure line (`@if (header().closedAt)`) and a CSS-only chevron (`::after` border triangle; no new icon).
   - The surface uses the same tokens as `.statistics-item`: `--kui-color-surface`, `--kui-color-border`, `--kui-shadow-surface`, radius 6px.
   - Imports `RouterLink` and `DatePipe`.
   - Spec: the USER, CRON and not-closed variants, and the link target.
5. **`DesignationsHistoryPageComponent`** (smart). Injects `DesignationsHistoryBO`, `UserStateService`, `ToasterService`, `DestroyRef`.
   - **Signals:** `headers`, `hasMore`, `isLoading`, `isLoadingMore`.
   - **Loading:**
     - `ngOnInit` → `loadPage()`.
     - `handleLoadMore()` → `loadPage(lastHeader.createdAt)`, appending the results.
     - Use `takeUntilDestroyed` and `finalize` to reset the loading flags.
     - On error, show the error toast.
   - **Congregation id:** read it from `userState.currentUser?.congregation?.id`. Throw if it's missing, like `AssignTerritoriesPageComponent.currentCongregation` does.
   - **Template:**
     - `.container` with an `h2.t-headline2.mb-8` heading.
     - `lib-spinner` (`data-testid="designations-history-loading"`) while loading.
     - A list `@for (header of headers(); track header.id)` (`data-testid="designations-history-list"`, `flex flex-col gap-4`), with `@empty` showing the empty text (`data-testid="designations-history-empty"`).
     - `@if (hasMore())` → `<button lib-button btnType="secondary" data-testid="designations-history-load-more" [disabled]="isLoadingMore()">Carregar mais</button>`.
   - **Spec** (MockBuilder + `.mock(DesignationsHistoryBO, …)`): rows render, empty state, load more passes the last `createdAt` and appends, button hidden when `hasMore` is false, error → toast.
6. **`DesignationsProgressSummaryComponent`** (presentational)
   - Inputs: `header` and `progress: HeaderProgressSummary | null`.
   - Renders inside `lib-card` (`data-testid="designations-progress-summary"`): reuses `DesignationsHeaderOverviewComponent` for the title, status badge, start time and closure line.
   - `@if (progress(); as p)`:
     - Summary text (`data-testid="designations-progress-summary-text"`) and the percent.
     - `<lib-progress-bar [value]="p.territoriesDone" [max]="p.territoriesTotal" label="Progresso dos territórios" />`.
     - Outcome chips (`data-testid="designations-outcome-count"`), each with its icon, label and count.
   - `@else` → the unavailable text (`data-testid="designations-progress-unavailable"`).
   - The outcome-to-label map is a `const OUTCOME_LABELS` in the component file.
   - Spec: text, percent, chips, unavailable state.
7. **`DesignationProgressCardComponent`** (presentational)
   - Inputs: `summary` (required), `expanded = input(false)`, `isLoading = input(false)`, `rows = input<DesignationTerritoryRow[] | null>(null)`.
   - Outputs: `toggle = output<string>()` and `share = output<string>()`.
   - Header: `<button type="button" data-testid="designation-progress-card-toggle" [attr.aria-expanded]="expanded()" (click)="toggle.emit(id)">`, containing:
     - the title and meta;
     - the `Expirada` badge (`data-testid="designation-expired-badge"`) when `isExpired`;
     - `done/total` (`data-testid="designation-progress-count"`);
     - a `lib-progress-bar` and the chevron.
   - Body when `expanded()`:
     - Spinner while `isLoading()`.
     - Otherwise, if rows exist: a list `ul[data-testid="designation-territory-list"] > li[data-testid="designation-territory-row"]` showing address (`t-body2`), city (`t-caption`), and a status badge (`data-testid="designation-territory-status"`) plus the outcome when done. Then a `Reenviar` button (`data-testid="designation-share-button"`).
     - Otherwise: `Designação não encontrada.`
   - Spec: toggle emits the id, `aria-expanded`, expired badge, done/pending rows, share emits the id, not-found text.
8. **`DesignationsHistoryDetailsPageComponent`** (smart). Injects `ActivatedRoute` and `DesignationsHistoryBO`.
   - **Header id:** `headerId = route.snapshot.paramMap.get('headerId') ?? ''`. This is the existing pattern; `withComponentInputBinding` is not enabled.
   - **Detail state:**
     ```ts
     state = toSignal(
       bo.getHeaderDetailStream(headerId).pipe(map(detail => ({ loaded: true, detail }))),
       { initialValue: { loaded: false, detail: undefined } },
     )
     ```
   - **Expansion state:** signals `expandedIds: ReadonlySet<string>`, `designations: ReadonlyMap<string, Designation | null>` and `loadingIds: ReadonlySet<string>`.
   - **`handleToggle(id)`:**
     - Flip the id in `expandedIds`.
     - If expanding and the designation isn't cached: add the id to `loadingIds`, subscribe to `bo.getDesignation(id)` with `takeUntilDestroyed`, store the result (`?? null`), then remove the id from `loadingIds`.
   - **`rowsById`:** a `computed` map of `buildTerritoryRows(designation, detail.rawTerritories)` for each loaded designation.
   - **`handleShare(id)`** → `shareDesignationLink(id)`.
   - **Template:**
     - Heading (`data-testid="designations-history-details-heading"`).
     - Loading spinner (`data-testid="designations-history-details-loading"`).
     - Not-found text (`data-testid="designations-history-details-not-found"`).
     - Otherwise the summary, then an `h3` reading `Designações`, then the cards.
   - **Spec:**
     - Loading → content.
     - Not found.
     - Expanding loads the designation only once (toggling twice calls the BO once).
     - Share calls the helper (jest.mock `share-utils`).
     - A new stream emission re-renders the counts.

### Task 10 — Functions backfill (legacy headers)

1. **Create** `functions/ministry-maps/src/models/designations-progress.ts`: Admin-SDK types (`Timestamp`) mirroring §2.1.
2. **Create** `functions/ministry-maps/src/utils/designations-progress-builder.ts` with a pure `buildDesignationsProgress(header, designations)`:
   - For each designation, `designations[id] = { territoriesTotal, createdAt, expiresAt }`.
   - For each territory with status `DONE` and at least one history entry, `territories['<d>_<t>'] = { designationId, territoryId, outcome: lastHistory.visitOutcome, completedAt: lastHistory.date }`.
   - DONE territories with no history are skipped and returned in `skipped` so they can be logged.
   - `expireAt = header.expireAt ?? header.createdAt + 180d`.
3. **Create** `functions/ministry-maps/src/scripts/backfill-designations-progress.ts`, following `backfill-territory-history-stamps.ts`:
   - Same environment guard, `--dry-run` flag and `PAGE_SIZE = 100`.
   - Page through `designations_header` by `FieldPath.documentId()`.
   - For each header, run `db.collection('designations').where('designationHeaderId','==',id).get()`, build the doc, and `set()` it at `designations_header/{id}/progress/summary`. `set()` fully overwrites, so reruns are idempotent and correct any drift.
   - Print stats: `headersScanned`, `progressWritten`, `territoriesSkipped`.
4. Add `backfill:designations-progress` to the scripts in `functions/ministry-maps/package.json`.
5. **Test** `functions/ministry-maps/test/utils/designations-progress-builder.spec.ts`: totals, DONE-only entries with the last outcome and date, key format, the skipped list, the `expireAt` fallback.

### Task 11 — E2E harness and specs

1. **Seed:**
   - `collections.ts`: add `DESIGNATIONS_PROGRESS_SUBCOLLECTION = 'progress'` and `DESIGNATIONS_PROGRESS_DOC_ID = 'summary'`, re-declared with the usual sync comment.
   - `types.ts`: add `DesignationsProgressSeed = DesignationsProgress` and `designationsProgress?: DesignationsProgressSeed[]` in `SeedDefinition`.
   - `seeder.ts`: `batch.set(firestore.collection(Collections.designations_header).doc(p.headerId).collection('progress').doc('summary'), p)`.
   - `factories/designations-progress.factory.ts`: `buildDesignationsProgress(over)`. Callers must always override `headerId` and `congregationId`. Export it from `factories/index.ts`.
2. **Page objects** (`readonly` locators assigned in the constructor):
   - `DesignationsHistoryPage`: `goto`, `heading`, `rows`, `emptyState`, `loadMore`.
   - `DesignationsHeaderDetailPage`: `goto(headerId)`, `summaryText`, `outcomeCounts`, `unavailable`, `notFound`, `cards`, `cardByIndex(n)`, `toggle(n)`, `territoryRows(n)`, `shareButton(n)`.
   - `home.page.ts`: add `linkHistoricoDesignacoes`.
3. **`territories-designations-history.spec.ts`**. Import `test`/`expect` from `../fixtures`, use `test.use({ role: 'admin' })`, put the UC id in every title, and never use `waitForTimeout`.
   - **UC-HIST-01:** the home link leads to the list.
   - **UC-HIST-02:** order, badges and closure lines. Seed one IN_PROGRESS header, one DONE/USER, one DONE/CRON, and one header from another congregation that must not appear.
   - **UC-HIST-03:** pagination. With 21 headers the page shows 20 rows; `Carregar mais` brings it to 21 and the button disappears.
   - **UC-HIST-04:** empty state.
   - **UC-HIST-05:** detail summary. Seed 2 designations with totals 3 and 2, and 3 entries (SPOKE, SPOKE, NOT_ANSWERED). Expect:
     - `3 de 5 territórios concluídos` and `60%`;
     - chips `Contatados 2` and `Ninguém atendeu 1`;
     - cards `Designação 1` at `2/3` and `Designação 2` at `1/2`.
   - **UC-HIST-06:** expanding a card shows `Concluído` / `Pendente` rows and the `Expirada` badge. `Reenviar`, captured with `captureWhatsAppPopup` from `../utils/whatsapp-link.util`, shares a URL containing `/work/<designationId>`.
   - **UC-HIST-07:** a legacy header shows `Progresso indisponível para esta sessão.`; an unknown id shows `Sessão de designações não encontrada.`
   - **UC-HIST-08:** role matrix, in the same style as UC-ASSIGN-22.
   - **UC-HIST-09 (integration, live):**
     1. Seed a header, a progress doc (1 designation, total 1, no entries) and the designation (future `expiresAt`, `history: []`).
     2. The admin opens the detail page and sees `0 de 1`.
     3. In an anonymous page, complete the visit on `/work/<id>` (via `WorkItemCompleteDialogPage`).
     4. The detail page shows `1 de 1` without a reload.
4. **`territories-assign.spec.ts` — UC-ASSIGN-32:** after a submission, `expect.poll` the progress doc until `designations[<id>].territoriesTotal`, `congregationId`, `headerId` and `expireAt` are set. A second submission adds a second key to the same doc.
5. **`work-designation.spec.ts`**, new UC-WORK ids (use the next free numbers):
   - (a) Completing a visit writes `territories['<d>_<t>'].outcome = 0`.
   - (b) Editing the visit changes `outcome`.
   - (c) Undo deletes the key.
   - (d) A legacy designation without `designationHeaderId` completes normally, and no progress doc is created.
   - (e) A header with no progress doc completes normally, with no alert.
6. **`firestore-rules.spec.ts`**, UC-RULES-13..15, on `designations_header/<id>/progress/summary`:
   - Anonymous: read 403, create 403, update of `territories` 200, update of `designations` 403, delete 403.
   - Same-congregation admin: read, create and update all 200.
   - User from another congregation: read 403, update 403.
7. **`navigation.spec.ts`:** the new home link is visible and navigates to `/territories/designations`.

### Task 12 — Documentation

| Doc | Change |
|---|---|
| `docs/features/territories-designations-history.md` (**new**) | Route and actors header, screen descriptions, the verbatim copy table, the read budget, and UC-HIST-01..09 in the repo's UC format |
| `docs/domain/data-model.md` | §1 table and tree get the `progress/summary` doc. New §2.8 `DesignationsProgress` (fields, key format, writers). New §4.10 progress invariants (client-side writers, anonymous may touch only `territories`, edit overwrites, undo deletes, legacy skip/swallow, independent TTL, backfill). Add a §5 factory row. Update Sources |
| `docs/features/work-designations.md` | New UC-WORK entries and a note about the 4th write-back write |
| `docs/features/territories-assign.md` | UC-ASSIGN-32 |
| `docs/features/navigation-shell.md` | The home card links list gains `Histórico de Designações`, plus a navigation step |
| `docs/domain/glossary.md` | `Histórico de Designações`, `Sessão de designações` (= `designations_header`), the outcome short labels |
| `docs/domain/roles-and-permissions.md` | Route rows for the two new routes, and a rules note for `progress` |
| `docs/test-catalog.md` | New `UC-HIST` section and new UC-ASSIGN, UC-WORK and UC-RULES rows. Update the summary counts row and the coverage arithmetic |
| `docs/README.md` | Feature documents table row for `UC-HIST` |
| `ARCHITECTURE.md` | Firestore topology (progress subcollection, client-side writes) and the backfill script |
| `docs/backlog/2026-09-designations-history.md` | This plan |

---

## 5. Acceptance criteria

1. **Home link and access:**
   - The home Territories card shows `Histórico de Designações` and links to `/territories/designations`.
   - ADMIN, ELDER, ORGANIZER, SUPERINTENDENT and APP_ADMIN can open it; a PUBLISHER is redirected to `/welcome`.
2. **List content:**
   - Only the current congregation's headers appear, ordered by `createdAt` descending, 20 per page.
   - `Carregar mais` appears only when more headers exist, and appends them.
   - Each row shows `Sessão de dd/MM/yyyy`, the status badge, and the closure line for its `closedBy`.
3. **List reads:** the list issues one `getDocs` per page (limit 21) and makes no progress reads.
4. **Detail content:**
   - The page shows `{done} de {total} territórios concluídos`, the percent, the outcome counts and one card per designation (`Designação n`, `done/total`, `Expirada` when past `expiresAt`).
   - All of it comes from one progress doc read.
   - It updates live when `/work` completes or undoes a visit.
5. **Expanding a card:**
   - It performs one designation read; collapsing and expanding again does not re-read.
   - It lists every territory as `Concluído` + outcome or `Pendente`.
   - `Reenviar` opens the WhatsApp share for `/work/<designationId>`.
6. **Assign writes:**
   - Creating a designation writes `designations.<id> = { territoriesTotal, createdAt, expiresAt }` to `designations_header/<header>/progress/summary`.
   - If that write fails, the designation is still shared.
7. **Work page writes:**
   - Completing or editing a visit on `/work/:id` sets `territories.<designationId>_<territoryId>` with the outcome; undo removes it.
   - Legacy designations, and headers without a progress doc, never trigger the publisher alert.
8. **Rules:**
   - Anonymous users can only update `territories`; read, create, delete and updates to `designations` return 403.
   - Authenticated users of the same congregation can read, create and update.
   - Users from another congregation get 403.
9. **Backfill:**
   - With `--dry-run`, the script prints stats without writing.
   - Without it, the written docs equal the builder output.
   - Re-running produces identical docs.
10. **Checks:** all commands in §6 pass, and no existing test is weakened or removed.

## 6. Verification

```bash
npx nx test common-ui && npx nx lint common-ui
npx nx test ministry-maps && npx nx lint ministry-maps && npx nx build ministry-maps
npm --prefix functions/ministry-maps run lint && npm --prefix functions/ministry-maps test && npm --prefix functions/ministry-maps run build
npx nx typecheck-e2e ministry-maps
npx nx e2e ministry-maps   # focused specs first (check filter syntax in apps/ministry-maps/e2e/README.md), then full suite
git diff --check
```

**Manual check** (emulators via `npm start`):
1. Assign 2 designations.
2. Open the detail page; it shows 0 of N.
3. Complete a visit in an anonymous window; the progress bar moves live.
4. Undo the visit; the bar goes back.
5. Run the backfill against the emulator, with and without `--dry-run`.

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| The progress write fails after the designation is created, so the header total undercounts | Logged with `LoggerService.error`. The backfill script also works as a reconcile tool (full overwrite from designations) |
| Anonymous link holders write arbitrary `territories` entries | Same trust model as `designations`, which is already publicly writable. Rules block reads, deletes and totals, and outcomes are already public on designations |
| Legacy header without a progress doc → `updateDoc` returns `not-found` | Swallowed in `WorkBO` (warn log, no alert). The detail page shows "Progresso indisponível"; the backfill fixes it |
| The subcollection is not TTL-deleted with its parent | Its own `expireAt` plus the `progress` TTL override |
| `startAfter(createdAt)` could skip headers created in the same millisecond | Practically impossible per congregation (headers are created lazily, one per cycle); documented in the data model |
| Special characters in map keys | Keys are always written through `new FieldPath('territories', key)` |
| Document size (1 MiB) | About 150 B per entry, so thousands of territories per daily cycle; ceiling documented |
| Flaky live-update E2E | Web-first `toHaveText` / `expect.poll`; no fixed waits |
