# Designations Header — Resumable Designations (Implementation Plan)

- **Date:** 2026-09-02 (reviewed & refined)
- **Status:** planned, reviewed, ready for implementation
- **Scope:** `apps/ministry-maps` (assign-territories feature), `functions/ministry-maps`, `firestore.rules`/`firestore.indexes.json`, docs, E2E seed harness
- **Original requester prompt is preserved in §1; all confirmed decisions in §2.**

---

## 1. Original request (preserved ask)

The Assign Territories page (`assign-territories-page.component.ts`) keeps all designation state inside the component, so it is ephemeral: if the user starts creating designations, navigates away, and comes back, the record of already-assigned territories is lost.

Goals:

1. **Refactor/simplification:** move that state into a state service (selection, assigned designations, and any other state that belongs there).
2. **New feature:** a new Firestore collection acting as a _header_ over the designations created in one working cycle, so the user can **resume in-progress designations** after navigating away or reloading.
3. A **cron job** (Firebase) runs daily at **12:00 Brasília time** and closes any unfinished header, so users don't have to.
4. A **Stop button** lets the user close the current header manually.
5. A header is created when the **first designation is created while none is in progress**.
6. Model must balance **design ergonomics vs API calls** (cost/performance).
7. Future (NOT now): a screen for elders to browse the history of designations, their territories and statuses. The model must not block it.
8. Leverage existing patterns: BOs (business objects), repositories, state services. Split business logic into a new BO.
9. Deliverable: this plan, plus documentation and test updates.

## 2. Confirmed decisions (from Q&A with requester)

| Decision                     | Choice                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Collection name              | **`designations_header`** (requester's pick, kept verbatim)                                                          |
| Link strategy                | **`designationHeaderId` field on each `designations` doc** (child points to parent; header holds no unbounded array) |
| Header scope                 | **Per congregation** (one IN_PROGRESS header per congregation; any assigner resumes it)                              |
| Status model                 | **`IN_PROGRESS` / `DONE`** + `closedAt` + `closedBy: 'USER' \| 'CRON'`                                               |
| Unsubmitted cart persistence | **Navigation only** (in-memory signal state service; not written to Firestore)                                       |
| Cron semantics               | **Closes every IN_PROGRESS header, any age**, daily 12:00 `America/Sao_Paulo`                                        |
| Backlog location             | `apps/ministry-maps/docs/backlog/` (this file)                                                                       |
| Stop permissions             | Anyone who can open the Assign page (no extra role gating)                                                           |

---

## 3. Data model

### 3.1 New collection `designations_header`

| Field            | Type                      | Notes                                                                           |
| ---------------- | ------------------------- | ------------------------------------------------------------------------------- |
| `id`             | `string`                  | auto-id (`doc(collection)`), written inside the doc like other models           |
| `congregationId` | `string`                  | plain id (matches `designations`/`territories` linking style — NOT a reference) |
| `status`         | `'IN_PROGRESS' \| 'DONE'` | new `DesignationsHeaderStatusEnum`, string values like `DesignationStatusEnum`  |
| `createdAt`      | `Date` → `Timestamp`      | creation timestamp                                                              |
| `createdBy`      | `string`                  | user id of whoever initiated the first designation of this session              |
| `closedAt`       | `Date?` → `Timestamp?`    | set when status flips to `DONE`                                                 |
| `closedBy`       | `'USER' \| 'CRON'?`       | new `DesignationsHeaderClosedByEnum`; provenance for the future history screen  |
| `expireAt`       | `Timestamp?`              | Firestore TTL (see §3.3)                                                        |

New files (mirror existing conventions):

- `apps/ministry-maps/src/models/designations-header.ts` — `DesignationsHeader` type
- `apps/ministry-maps/src/models/enums/designations-header-status.ts`
- `apps/ministry-maps/src/models/enums/designations-header-closed-by.ts`
- `apps/ministry-maps/src/models/firebase/firebase-designations-header-model.ts` — `Timestamp` variants + converter (using `firebaseEntityConverterFactory`)

### 3.2 `designations` gains `designationHeaderId`

- `Designation` type: add **optional** `designationHeaderId?: string` (optional because pre-existing docs lack it; all new writes set it).
- `DesignationSeed`/e2e factories: optional passthrough.

### 3.3 TTL retention

- `FirebaseDesignationsHeaderDatasourceService` stamps `expireAt = now + 180d` on create (same constants as `FirebaseDesignationDatasourceService`).
- Add a TTL `fieldOverrides` entry to `firestore.indexes.json` for `collectionGroup: "designations_header"`, `fieldPath: "expireAt"`, `ttl: true`.

### 3.4 Queries & composite indexes

| Query                                                                                                         | Used by                                        | Index Requirement                                                               |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `where('congregationId', '==', X).where('status', '==', 'IN_PROGRESS').orderBy('createdAt', 'desc').limit(1)` | Resume session (`getInProgressByCongregation`) | **Composite index required** (`congregationId ASC, status ASC, createdAt DESC`) |
| `where('designationHeaderId', '==', H)`                                                                       | Resume hydration / future history              | Automatic single-field index                                                    |
| `where('status', '==', 'IN_PROGRESS')`                                                                        | Daily Cron                                     | Automatic single-field index                                                    |

> [!IMPORTANT]
> To guarantee picking the newest active header deterministically (protecting against potential orphaned headers or millisecond race conditions), the resume query specifies `orderBy('createdAt', 'desc')`. Firestore requires a composite index in `firestore.indexes.json`:
>
> ```json
> {
>   "collectionGroup": "designations_header",
>   "queryScope": "COLLECTION",
>   "fields": [
>     { "fieldPath": "congregationId", "order": "ASCENDING" },
>     { "fieldPath": "status", "order": "ASCENDING" },
>     { "fieldPath": "createdAt", "order": "DESCENDING" }
>   ]
> }
> ```

### 3.5 Security rules

`firestore.rules`' catch-all already grants **authenticated** read/write on `designations_header` (`§86-88`), which matches "anyone who can assign". Unlike `designations` (public for anonymous `/work/:id` WhatsApp links), the header is internal congregational data and must **not** get a public grant. Document the collection in `firestore.rules` comments.

### 3.6 API-call budget

| Flow                                                | Reads         | Writes                     | Notes                                                                         |
| --------------------------------------------------- | ------------- | -------------------------- | ----------------------------------------------------------------------------- |
| Page open with open header (resume)                 | 2             | 0                          | 1 header query + 1 designations by `designationHeaderId`                      |
| Page open, nothing in progress                      | 1             | 0                          | 1 header query returning null                                                 |
| Create designation (header already active in state) | Same as today | 1                          | **0 extra reads!** Reuses in-memory `header.id`; 1 designation write as today |
| Create first designation of a cycle                 | Same as today | 2                          | 1 header write + 1 designation write                                          |
| Stop button                                         | 0             | 1                          | Field update (`updateDoc`)                                                    |
| Cron (daily)                                        | 1 query       | 1 batched update per chunk | Runs once a day at 12:00 BRT                                                  |

---

## 4. Client architecture & Clean Layering

```
┌────────────────────────────────────────────────────────┐
│         AssignTerritoriesPageComponent (View)          │
│  - Injects AssignTerritoriesStateService & BO          │
│  - Subscribes to bo.getActiveSessionStream()           │
│  - Binds submit → bo.createDesignation()               │
│  - Binds stop   → opens confirm dialog → closeHeader() │
└─────────────────────────┬──────────────────────────────┘
              ┌───────────┴───────────┐
              ▼                       ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│ AssignTerritoriesState    │ │   DesignationsHeaderBO    │
│ (providedIn: root)        │ │   (providedIn: root)      │
│ - Pure signals store      │ │ - Pure business logic     │
│ - header, assigned, cart  │ │ - createDesignation()     │
│ - setSession(), setHeader │ │ - closeHeader(), streams  │
└───────────────────────────┘ └─────────────┬─────────────┘
                                            │ calls
                              ┌─────────────▼─────────────┐
                              │ Repositories & Datasources│
                              └───────────────────────────┘
└────────────────────────────────────────────────────────┘
```

### 4.1 Repository layer (new + extended)

```
apps/ministry-maps/src/app/repositories/
  designations-header.repository.ts        (abstract class)
  firebase/firebase-designations-header-datasource.service.ts
```

```ts
export abstract class DesignationsHeaderRepository {
  abstract getInProgressByCongregation(congregationId: string): Observable<DesignationsHeader | undefined>;
  abstract getInProgressStreamByCongregation(congregationId: string): Observable<DesignationsHeader | undefined>;
  abstract add(header: Omit<DesignationsHeader, 'id'>): Observable<DesignationsHeader>;
  abstract close(id: string, closedBy?: DesignationsHeaderClosedByEnum): Observable<void>;
}
```

- `DesignationRepository` gains:
  `abstract getStreamByHeaderId(headerId: string): Observable<Designation[]>;` (live real-time streaming via `collectionData$`, `where('designationHeaderId', '==', headerId)`).
- Register `DesignationsHeaderRepository` in `repositories-providers.ts` (`{ provide: DesignationsHeaderRepository, useClass: FirebaseDesignationsHeaderDatasourceService }`).

### 4.2 New BO — `DesignationsHeaderBO`

Location: `apps/ministry-maps/src/app/features/territory/bo/designations-header/designations-header.bo.ts`  
**`@Injectable({ providedIn: 'root' })`** (Stateless domain orchestrator).

Responsibilities:

1. **`createDesignation(territoriesIds: string[], activeHeader: DesignationsHeader | null): Observable<{ designation: Designation; header: DesignationsHeader }>`**
   - Moved from `TerritoryBO` and decomposed into clean private helper methods (`resolveActiveHeader`, `buildDesignationTerritories`, `buildNewDesignation`, `calculateExpirationDate`).
   - If `activeHeader` is provided, reuse it directly (avoids an unnecessary Firestore read).
   - If `activeHeader` is `null`, check `headerRepo.getInProgressByCongregation(congregationId)`. If still none, create a new header doc via `headerRepo.add`.
   - Build designation doc, setting `designationHeaderId: header.id`.
   - Returns **both** the designation and the header (`{ designation, header }`) so caller state is immediately synchronized.
   - Logs creation with `LoggerService`.
2. **`closeHeader(headerId: string): Observable<void>`**
   - Calls `headerRepo.close(headerId, DesignationsHeaderClosedByEnum.USER)`.
   - Logs audit trail with `LoggerService`.
3. **`getActiveSessionStream(congregationId: string): Observable<{ header: DesignationsHeader | null; designations: Designation[] }>`**
   - Listens to `headerRepo.getInProgressStreamByCongregation(congregationId)`.
   - If none found, emits `{ header: null, designations: [] }`.
   - If found, streams `designationRepo.getStreamByHeaderId(header.id)` and emits `{ header, designations }` in real time.

_Refactor note:_ `TerritoryBO` keeps territory CRUD; remove `createDesignationForTerritories` and its designation-related dependencies from `TerritoryBO`, updating `territory.bo.spec.ts`.

### 4.3 State service — `AssignTerritoriesStateService`

Location: `apps/ministry-maps/src/app/features/territory/state/assign-territories.state.service.ts`  
**`@Injectable({ providedIn: 'root' })`** (Survives Angular route navigation across the app; singleton lifecycle).

Signals:

```ts
// Session state
header = signal<DesignationsHeader | null>(null);
assignedDesignations = signal<ReadonlyMap<string, ReadonlySet<string>>>(new Map()); // designationId -> territoryIds
assignedTerritoryIndex = computed(() => {
  const map = new Map<string, string>();
  for (const [dId, tIds] of this.assignedDesignations()) {
    for (const tId of tIds) map.set(tId, dId);
  }
  return map;
});
assignedTerritoryCount = computed(() => this.assignedTerritoryIndex().size);
hasActiveSession = computed(() => this.header() !== null);

// Unsubmitted selection cart (survives route navigation, in-memory)
selectedTerritoryIds = signal<ReadonlySet<string>>(new Set());
selectedCount = computed(() => this.selectedTerritoryIds().size);

// Loading indicators
isLoadingSession = signal(false);
isCreatingAssignment = signal(false);
isStoppingSession = signal(false);
```

Methods (Pure state mutations):

- **`setSession(header: DesignationsHeader | null, designations: Designation[])`**:
  - Updates `header.set(header)`.
  - Hydrates `assignedDesignations`.
  - **Reconciliation/Pruning:** Automatically prunes from `selectedTerritoryIds` any territory ID that is now present in `assignedTerritoryIndex` (guards against double-selection if another user assigned it while this user was on another page).
- **`setHeader(header: DesignationsHeader | null)`**: Updates `header` signal.
- **`addAssignedDesignation(designationId: string, territoryIds: string[])`**: Appends the designation and prunes territory IDs from `selectedTerritoryIds`.
- **`setTerritorySelection(territoryId: string, selected: boolean)`**: Toggles ID in `selectedTerritoryIds`.
- **`removeFromSelection(territoryIds: string[])`**: Prunes IDs from `selectedTerritoryIds`.
- **`clearSession()`**: Clears `header.set(null)` and `assignedDesignations.set(new Map())`.
- **`reset()`**: Resets all signals to initial empty state (called if user changes congregation or logs out).

Deliberately **not** moved: `selectedCity`, `searchTerm`, sort/filter state, `territories$` fetching, WhatsApp share, alert-confirm dialog flow. Those remain component view state.

### 4.4 Component changes (`assign-territories-page`)

The component becomes a thin delegate:

- Injects `AssignTerritoriesStateService`, `UserStateService`, `Dialog`, `ToasterService`.
- Deletes local signals `selectedTerritoriesModel`, `assignedDesignations`, `assignedTerritoryIndex`, `isCreatingAssignment`.
- Forwards checkbox and selection events to `state.setTerritorySelection` and `state.submitSelection()`.
- `ngOnInit` invokes `state.loadSession(currentCongregation.id)` alongside the existing city/territory init.

Template additions (`assign-territories-page.component.html`):
Replaces the floating action button and top resume banner with a unified bottom dock:

1. **Assign Territories Dock (`AssignTerritoriesDockComponent`, `data-testid="assign-dock"`)**:
   - Fixed at bottom center, elevated surface with theme-aware tokens.
   - Selected count badge (`data-testid="assign-dock-selected-badge"`): circular counter with active green highlight when >0.
   - Selected label (`data-testid="assign-dock-selected-text"`): `Selecionado` (when count <= 1, including 0) vs `Selecionados` (when count > 1), avoiding number repetition alongside the circular badge.
   - Assigned session label (`data-testid="assign-dock-assigned-text"`): `{N} já designado(s)` when `hasActiveSession()`, `Nenhuma designação em andamento` otherwise.
   - Stop button (`data-testid="assign-dock-stop-button"`): `Encerrar`, stop square icon (`media-control-50`). Disabled when `!hasActiveSession() || isStoppingSession()`.
   - Submit button (`data-testid="assign-dock-submit-button"`): `Enviar`, paper-plane icon (`paper-plane-2`). Disabled when `selectedCount() === 0 || isCreatingAssignment()`.

2. **Stop Flow & Confirmation Dialog**:
   - `handleStopClick()` opens `ConfirmDialogComponent`:
     - `title`: `Encerrar designações?`
     - `bodyText`: `<p>Os territórios já designados continuarão salvos com seus respectivos publicadores.</p><p class="mt-4 t-caption"><strong>Nota:</strong> As sessões de designação são encerradas automaticamente todos os dias à meia-noite.</p>`
   - On confirmation, calls `designationsHeaderBO.closeHeader(headerId)`.
   - On success: `toaster.success('Designações em andamento encerradas com sucesso.')`.

### 4.5 Tests

- `assign-territories-dock.component.spec.ts` — isolated unit tests verifying all badge and button states (disabled, active, loading spinners, outputs).
- `assign-territories-page.component.spec.ts` — test dock binding, stream hydration, submit delegation, Stop confirmation dialog and toaster invocation.
- `territories-assign.spec.ts` — Playwright E2E tests covering UC-ASSIGN-12 (dock badge counter), UC-ASSIGN-27 (session resume & re-share), UC-ASSIGN-28 (multi-submission cycle with single header), UC-ASSIGN-29 (manual Stop flow, dialog confirmation & new cycle), and UC-ASSIGN-30 (cart navigation survival and concurrent assignment pruning).
- `territory.bo.spec.ts` — drop moved `createDesignationForTerritories` tests into `designations-header.bo.spec.ts`.
- `designations-header.bo.spec.ts` — test `createDesignation` (both header-creation and header-reuse cases), `closeHeader`, and `getActiveSessionStream`.
- `assign-territories.state.service.spec.ts` — zoneless tests verifying cart accumulation, pruning of newly assigned territories on load, and session stop lifecycle.

---

## 5. Scheduled function (cron)

### 5.1 Function: `close-designations-headers.ts`

`functions/ministry-maps/src/functions/close-designations-headers.ts`, exported from `src/index.ts`:

```ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue } from 'firebase-admin/firestore';
import logger from 'firebase-functions/logger';
import { db } from '../config/firebase';

export const closeDesignationsHeaders = onSchedule({ schedule: '0 0 * * *', timeZone: 'America/Sao_Paulo' }, async () => {
  logger.info('Starting daily scheduled closing of open designations headers.');

  const openSnapshot = await db.collection('designations_header').where('status', '==', 'IN_PROGRESS').get();

  if (openSnapshot.empty) {
    logger.info('No open designations headers to close.');
    return;
  }

  // Chunk in batches of 400 (comfortably under Firestore 500-operation batch cap)
  const BATCH_LIMIT = 400;
  const docs = openSnapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const chunk = docs.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();

    for (const doc of chunk) {
      batch.update(doc.ref, {
        status: 'DONE',
        closedAt: FieldValue.serverTimestamp(),
        closedBy: 'CRON',
      });
    }

    await batch.commit();
  }

  logger.info(`Successfully closed ${docs.length} designations header(s).`);
});
```

- v2 `onSchedule` unix-cron `'0 0 * * *'` + `timeZone: 'America/Sao_Paulo'` (00:00 midnight Brasília time).
- Idempotent by construction: consecutive executions find no `IN_PROGRESS` docs.
- Add Admin model `functions/ministry-maps/src/models/designations-header.ts`.

### 5.2 Emulator triggering & verification

> **⚠ Correction (2026-09-03, empirically verified during PR 3):** the original claim below — that
> publishing to the Pub/Sub emulator topic triggers a **v2** scheduled function — is **wrong** for
> firebase-tools 14.x. Source + runtime verification on 14.27.0: `getSignatureType()` classifies
> `gcfv2 && schedule` triggers as signature `http` (production wiring: Cloud Scheduler → authenticated
> HTTP), and `pubsubEmulator.onMessage` only delivers `event`/`cloudevent` signatures — topic publishes
> are acked without executing (`FirebaseError: Unsupported trigger signature: http`). The Pub/Sub
> emulator entry was therefore **removed** from `firebase.json`.

- **Actual local trigger mechanism (verified):** the Functions emulator serves the scheduled function at
  its trigger-key route —
  `POST http://127.0.0.1:5001/<projectId>/us-central1/closeDesignationsHeaders-0`
  with an empty JSON body (note the `-0` suffix; the plain function name 404s). This mirrors the
  production Cloud Scheduler → HTTP invocation. No Pub/Sub emulator needed.
- Original (partially correct) research, kept for the record: scheduled functions _do register_ the
  Pub/Sub topic `firebase-schedule-<functionName>` via `addPubsubTrigger` (and that registration is
  skipped when the Pub/Sub emulator is not running) — but delivery to v2 scheduled triggers never
  succeeds as explained above.
- Unit tests in `functions/ministry-maps/test/functions/close-designations-headers.spec.ts` cover query, chunking, and batch update logic directly with a mocked `db`.

### 5.3 Deploy notes

- Deploy command: `firebase deploy --only functions` (functions deployed first per repo guidelines).
- Flag to requester: Cloud Scheduler job creation in GCP project.

---

## 6. E2E / seed harness updates

- `e2e/seed/collections.ts`: add `designations_header: 'designations_header'`.
- `e2e/seed/types.ts`: add `DesignationsHeaderSeed` to `SeedDefinition`/`SeedResult`.
- `e2e/seed/factories/designations-header.factory.ts`: `buildDesignationsHeader`.
- New test cases in `docs/features/territories-assign.md`:
  1. **UC-ASSIGN-27 — Resume after reload/navigation:** Active header loads; previously assigned territories render checked-and-disabled; tapping re-shares WhatsApp link.
  2. **UC-ASSIGN-28 — Multi-submission cycle:** Subsequent submissions attach to the same `designationHeaderId` without creating redundant headers.
  3. **UC-ASSIGN-29 — Manual Stop:** Clicking Stop closes the header in Firestore (`DONE`, `closedBy: 'USER'`); banner and Stop button disappear; next submission opens a fresh header.
  4. **UC-ASSIGN-30 — Selection cart pruning:** Unsubmitted selections survive route navigation, but prune territories assigned by another user in the active header.
  5. **UC-ASSIGN-31 (optional) — Cron close:** with the Functions emulator running, invoke the trigger-key
     route `POST …:5001/<project>/us-central1/closeDesignationsHeaders-0` → every open header flips to
     `DONE` / `closedBy: 'CRON'` (see the §5.2 correction for why the Pub/Sub route does not work).
- Re-export emulator seed snapshot when harness updates (`npx firebase emulators:export tools/executors/firebase-emulator/seed --force`).

---

## 7. Documentation updates

| Doc                                   | Change                                                                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/domain/data-model.md`           | §1 collection table: `designations_header`; §2 `DesignationsHeader` model; `Designation.designationHeaderId`; §4 lifecycle invariants; TTL note |
| `docs/features/territories-assign.md` | Document resume banner, Stop button, confirm dialog (pt-BR verbatim copy), new UC-ASSIGN-27–30                                                  |
| `docs/test-catalog.md`                | Reference new UCs                                                                                                                               |
| `ARCHITECTURE.md`                     | Firestore topology update + scheduled function entry                                                                                            |

---

## 8. Explicitly out of scope

- Elder history browsing screen (future task).
- Backfilling legacy `designations` docs (they remain without `designationHeaderId`).
- Persisting unsubmitted cart selections to Firestore (navigation-only in memory per Decision #5).
- WebSockets / real-time Firestore listeners (one-shot reads by design to minimize read costs).

---

## 9. Task breakdown & verification

Suggested PR sequence:

1. **PR 1 — Data layer & BO:**
   - Models & enums (`designations-header.ts`, status/closed-by enums).
   - `Designation.designationHeaderId` extension.
   - `DesignationsHeaderRepository` + Firebase datasource.
   - Composite index in `firestore.indexes.json` + TTL override.
   - `DesignationsHeaderBO` (`createDesignation`, `closeHeader`, `getActiveSessionStream`) + unit tests.
   - Seed harness extensions.
2. **PR 2 — State service & UI:**
   - `AssignTerritoriesStateService` (signals, cart pruning, submit/stop).
   - `AssignTerritoriesPageComponent` refactor + banner + Stop button + confirmation dialog.
   - Unit tests (`assign-territories.state.service.spec.ts`, `assign-territories-page.component.spec.ts`).
   - Documentation updates (`data-model.md`, `territories-assign.md`).
3. **PR 3 — Scheduled function (cron):**
   - `closeDesignationsHeaders` scheduled function + unit tests.
   - ~~`"pubsub": { "port": 8085 }` emulator entry in `firebase.json`~~ (removed — see the §5.2 correction; trigger via the Functions emulator HTTP route instead).
   - Deploy notes & architecture documentation update.

Verification per change class:

- App: `npx nx test ministry-maps && npx nx lint ministry-maps && npx nx build ministry-maps`
- E2E: `npx nx typecheck-e2e ministry-maps`, then the relevant `npx nx e2e ministry-maps` scope
- Functions: `npm --prefix functions/ministry-maps run lint && npm --prefix functions/ministry-maps test && npm --prefix functions/ministry-maps run build`
