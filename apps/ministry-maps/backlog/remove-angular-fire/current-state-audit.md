# Current-state audit — every `@angular/fire` usage

Facts about the code as it stands (canary `@angular/fire@21.0.0-rc.0-canary.f54c0fe`,
`firebase@^12.4.0` transitive). Verified by grep + read on the `development` branch.
This file is the source of truth for **what exists**; [technical-design.md](./technical-design.md)
owns the target.

## 1. Key architectural fact

`@angular/fire` is a thin layer over the vanilla SDK:

- **Pure re-exports**: most of what the app imports from `@angular/fire/auth|firestore|functions|app`
  (`collection`, `doc`, `query`, `where`, `getDoc`, `getDocs`, `getDocFromCache`,
  `getDocFromServer`, `setDoc`, `updateDoc`, `deleteDoc`, `addDoc`, `runTransaction`,
  `Timestamp`, `DocumentReference`, `CollectionReference`, `FirestoreDataConverter`,
  `initializeFirestore`, `persistentLocalCache`, `persistentMultipleTabManager`,
  `connect*Emulator`, `signInWithPopup`, `signOut`, providers/credentials, `initializeApp`,
  `getApp`, types `Auth`/`Firestore`/`Functions`/`UserCredential`, …) are the **same functions
  and types the vanilla SDK exports**. For these, migration is an import-path change.
- **Angular-specific (must be replaced)**:
  1. DI providers: `provideFirebaseApp`, `provideAuth`, `provideFirestore`,
     `provideFunctions`, `provideRemoteConfig`, and the injectable tokens `Auth`,
     `Firestore`, `Functions`.
  2. RxJS wrappers: `authState(auth)`, `docData(ref, opts)`, `collectionData(q, opts)`,
     `httpsCallableData(functions, name)`.
  3. `@angular/fire/auth-guard` (`redirectUnauthorizedTo`) — inert in this app (§6).
  4. `@angular/fire:deploy` executor (§7).
- The AF wrappers **accept vanilla SDK instances**, which enables the phased migration:
  `docData(vanillaRef)` works. This is why the runbook swaps bootstrap/DI first and wrapper
  calls later, keeping every phase green.

## 2. File-by-file inventory (29 files)

### Bootstrap & routing

| File | Usage | Notes |
| --- | --- | --- |
| `src/app/app.config.ts` | `provideFirebaseApp(() => initializeApp(environment.firebase))`, `provideAuth(() => { getAuth(); HMR guard; emulator 9099; window.__E2E__ = { auth, signInWithCustomToken } })`, `provideFirestore(() => { initializeFirestore(getApp(), { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); HMR guard; emulator 8080 })`, `provideFunctions(() => { getFunctions(); emulator 5001 })`, `provideRemoteConfig(() => getRemoteConfig())` | Emulator + `__E2E__` wiring gated by `environment.env === 'development' && !environment.useCloud`. HMR guards poke private fields `auth['_isInitialized']` / `firestore['_initialized']`. `console.log('emulador')` dev artifact. |
| `src/app/app-routes.ts` | `redirectUnauthorizedTo` from `@angular/fire/auth-guard`; `redirectUnauthorizedToLogin()` stored in `authGuardPipe` route-data keys (territories, home, users) | **Inert**: the custom `authGuard` never reads `authGuardPipe` (see §6). Safe to delete key + export. |

### Repository layer (datasources)

| File | AF APIs used | Delivery semantics |
| --- | --- | --- |
| `repositories/firebase/firebase-datasource.ts` | type `DocumentReference` | interface only: `createDocumentRef(id): DocumentReference<T>` |
| `repositories/firebase/firebase-auth-datasource.service.ts` | `inject(Auth)`; `authState`; `GoogleAuthProvider`, `OAuthProvider`, `signInWithPopup`, `signOut`; type `UserCredential` | `authStateChanged()` = `authState(...)` → `map(!!user)` — **live**. `getUserFromAuthentication()` = `authState(...).pipe(take(1), …)` — first emission. `signInWithProvider` = `from(signInWithPopup(...))` — **popup opens eagerly at call time**. `logOut()` = `from(signOut(...))`. |
| `repositories/firebase/firebase-user-datasource.service.ts` | `inject(Firestore)`, `inject(Functions)`; `collection`, `collectionData`, `deleteDoc`, `doc`, `getDocFromCache`, `getDocFromServer`, `query`, `setDoc`, `where`; `httpsCallableData` | `getById` = `getDocFromServer` — one-shot server. `getByIdFromCache` = `getDocFromCache` with `catchError` fallback to `getById` — cache-first. `getAllByCongregation` = `from(collectionData(q))` — **live**. `put/update/delete/provisionFromInvite` — writes + callables; callables are **cold**. |
| `repositories/firebase/firebase-congregation-datasource.service.ts` | `inject(Firestore)`; `collection(...).withConverter(congregationConverter)`, `docData`, `getDoc`, `getDocFromCache`, `getDocs`, `orderBy`, `query`, `updateDoc`; static `resolveUserCongregationReference` | `getById` = `docData(ref, { idField: 'id' })` — **live**. `getCongregations` = `getDocs` — one-shot. `update` = `updateDoc` patch. Static resolver picks `getDocFromCache` vs `getDoc` by option. |
| `repositories/firebase/firebase-territory-datasource.service.ts` | `inject(Firestore)`; `collection`, `collectionData`, `collectionGroup`, `deleteDoc`, `doc`, `documentId`, `getDoc`, `getDocs`, `limit`, `orderBy`, `query`, `runTransaction`, `setDoc`, `Timestamp`, `updateDoc`, `where`; `.withConverter` on collections/queries | `getAllByCongregation` = `from(collectionData(q))` — **live**; optional single collection-group history query (`getDocs`, one-shot). `getAllByCongregationAndCities` = `from(collectionData(q))` — **live**. Everything else one-shot (`getDoc`, `getDocs`) or writes, several explicitly wrapped in `defer()` for re-subscribable laziness (`update`, `setVisitHistory`). |
| `repositories/firebase/firebase-designation-datasource.service.ts` | `inject(Firestore)`; `collection(...).withConverter`, `docData`, `setDoc`, `Timestamp` | `getById` = `docData(ref, { idField: 'id' })` — **live** (work page depends on it). `add` = eager `from(setDoc(...))` then `docData(...).pipe(take(1))`. `update` = `defer(() => from(setDoc(...)))`. |
| `repositories/firebase/firebase-invitation-link-datasource.service.ts` | `inject(Firestore)`; `collection(...).withConverter`, `doc`, `getDoc`, `setDoc` | All one-shot; `getById` resolves congregation reference via the congregation static resolver. |

### Services & utilities

| File | Usage | Notes |
| --- | --- | --- |
| `shared/services/logger/logger.service.ts` | `inject(Firestore)`; `addDoc`, `collection`, `Timestamp` | Promise-based (not RxJS); TTL `expireAt` stamp. No streaming. |
| `shared/utils/firebase-entity-converter.ts` | types `DocumentData`, `DocumentReference`, `FirestoreDataConverter`, `QueryDocumentSnapshot`, `SnapshotOptions`, `WithFieldValue` | `removeUndefined` + `firebaseEntityConverterFactory` — unchanged by migration (pure type import swap). |

### Models (types only — pure import-path changes)

`models/firebase/firebase-user-model.ts` (`DocumentReference`),
`firebase-congregation-model.ts` (converter + Firestore types),
`firebase-territory-model.ts` (`Timestamp` ×2 models),
`firebase-designation-territory-model.ts` (`Timestamp`),
`firebase-invitation-link-model.ts` (`DocumentReference`, `Timestamp`).

### Project config

`apps/ministry-maps/project.json` — `deploy` executor `@angular/fire:deploy`
(`version: 2`, production `buildTarget`/`serveTarget`); see §7.

### Tests

| File | Pattern |
| --- | --- |
| `repositories/firebase/firebase-territory-datasource.service.spec.ts` | `jest.mock('@angular/fire/firestore', …)` partial mock of `collection/collectionData/collectionGroup/doc/getDocs/query` + `MockProvider(Firestore)`. |
| `repositories/firebase/firebase-auth-datasource.service.spec.ts` | `MockProvider(Auth)`, `MockProvider(Firestore)`; drives `signInWithPopup` result shape. |
| `repositories/firebase/firebase-designation-datasource.service.spec.ts` | `jest.mock('@angular/fire/firestore', …)` (`collection/doc/docData/setDoc/Timestamp`) + `MockProvider(Firestore)`. |
| `shared/services/logger/logger.service.spec.ts` | mocks `@angular/fire/firestore` (`addDoc/collection/Timestamp`). |
| `shared/utils/firebase-entity-converter.spec.ts` | type-only import (`DocumentReference`). |

All **other** unit tests (pages, BOs, guards, state) mock the abstract repositories and never
touch Firebase — the repository abstraction is what makes this migration cheap to validate.

## 3. Streaming vs one-shot matrix (behavior contract to preserve)

Authoritative semantics, cross-checked with `docs/domain/data-model.md` §4.6:

| Call | Today | Semantics that must survive |
| --- | --- | --- |
| `CongregationRepository.getById` | `docData(ref, {idField})` | **Live doc listener**; emits `undefined` when missing; used by change-congregation + config pages. |
| `DesignationRepository.getById` | `docData(ref, {idField})` | **Live doc listener**; work page live-updates on writes (visit save) and TTL deletions resolve to `undefined`. |
| `TerritoryRepository.getAllByCongregation` | `from(collectionData(q))` | **Live query listener** (`from()` of an Observable is a transparent subscribe). |
| `TerritoryRepository.getAllByCongregationAndCities` | `from(collectionData(q))` | **Live query listener** (assign page). |
| `UserRepository.getAllByCongregation` | `from(collectionData(q))` | **Live query listener** (users page). |
| `AuthRepository.authStateChanged` | `authState(auth)` | **Live auth listener**; immediate current-state emission; never completes. |
| `UserRepository.getById` | `getDocFromServer` | One-shot, server-forced. |
| `UserRepository.getByIdFromCache` | `getDocFromCache` → fallback server | Cache-first with error fallback. |
| `resolveUserCongregationReference` | `getDocFromCache` \| `getDoc` | One-shot; cache variant only when `useCache`. |
| `TerritoryRepository.getById/getAllInIds/getTerritoryVisitHistory/getNextPositionIndexForCity` | `getDoc`/`getDocs` | One-shot. |
| `CongregationRepository.getCongregations` | `getDocs` | One-shot. |
| `InvitationLinkRepository.*` | `getDoc`/`setDoc` | One-shot. |
| `LoggerService.*` | `addDoc` (Promise) | Fire-and-forget write. |
| Callables `deleteUser`, `provisionUserFromInvite` | `httpsCallableData` | **Cold observable** per call; executes on subscribe. |
| `TerritoryRepository.update/setVisitHistory`, `DesignationRepository.update` | `defer(() => from(write))` | Cold, re-subscribable (retry paths depend on it). |
| `TerritoryRepository.add`, `DesignationRepository.add`, `InvitationLinkRepository.add/update` | `from(setDoc(...))` | **Eager** — write starts at method call; preserve as-is. |
| `AuthRepository.signInWithProvider` | `from(signInWithPopup(...))` | **Eager popup** at method call. |

## 4. DI surface (what `inject(...)` needs after the swap)

- `inject(Auth)` — 1 site (auth datasource) + test `MockProvider(Auth)`.
- `inject(Firestore)` — 6 sites (5 datasources + logger) + test `MockProvider(Firestore)`.
- `inject(Functions)` — 1 site (user datasource).
- No component/page/BO injects AF tokens directly — the swap is contained in
  `app/repositories/firebase/**`, `logger.service.ts`, and `app.config.ts`.

## 5. Bootstrap details that must be replicated (app.config.ts)

1. `initializeApp(environment.firebase)` — config injected at build time (`NX_FIREBASE_*`
   via webpack DefinePlugin from `.env.development`/`.env.production`).
2. Firestore settings: `initializeFirestore(getApp(), { localCache:
   persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })` — offline
   persistence, multi-tab.
3. Emulator wiring (dev && !useCloud): auth `http://localhost:9099` (warnings disabled),
   firestore `localhost:8080`, functions `localhost:5001` — mirrors `firebase.json`.
4. `window.__E2E__ = { auth, signInWithCustomToken }` in the same dev gate — e2e specs call
   `api.auth.signOut()`, read `api.auth.currentUser`, and the fixture uses
   `signInWithCustomToken`; shape must survive verbatim.
5. HMR guards: `auth['_isInitialized']`, `firestore['_initialized']` private-field checks
   that return the existing instance on hot reloads.
6. Remote config: provided, **never consumed** (grep: zero usages outside app.config.ts) —
   dropped, not ported.

## 6. The inert auth-guard usage

- `app-routes.ts` stores `authGuardPipe: redirectUnauthorizedToLogin` in route `data` for
  territories/home/users, importing `redirectUnauthorizedTo` from `@angular/fire/auth-guard`.
- The custom `authGuard` (`core/features/auth/guards/auth.guard.ts`) reads only
  `route.data.roles`; it redirects to `login` itself. `authGuardPipe` is never read anywhere
  (grep verified). `docs/domain/roles-and-permissions.md` already documents that AF's
  AuthGuard "is not used".
- Removal is behavior-neutral; delete the import, the `redirectUnauthorizedToLogin` export,
  and the three `authGuardPipe` data keys. Check nothing else imports `redirectUnauthorizedToLogin`
  (only app-routes.ts defines/uses it today).

## 7. Deploy executor

- `project.json` `deploy` target: executor `@angular/fire:deploy` (`version: 2`,
  `buildTarget: ministry-maps:build:production`), defaultConfiguration `production`.
- CI (`.github/workflows/ci.yml`, `deploy` job): enumerates projects with a `deploy` target,
  runs `npx nx run "$proj":deploy --configuration=production`, env `FIREBASE_TOKEN:
  ${{ secrets.FIREBASE_TOKEN }}`, caches `~/.cache/firebase/emulators`. Merges to `main`
  trigger it.
- Replacement: `nx:run-commands` that production-builds then
  `npx firebase deploy --only hosting:prod` (firebase-tools `^14.27.0` is already a root
  devDependency; `.firebaserc` maps hosting targets `prod` → `du-ministry-maps`,
  `beta` → `du-ministry-maps-beta`; `firebase.json` hosting public dir is
  `dist/apps/ministry-maps`). `FIREBASE_TOKEN` is how firebase-tools authenticates in CI —
  the secret already exists.

## 8. Dependency state

- Root `package.json` dependencies: `@angular/fire: ^21.0.0-rc.0-canary.f54c0fe`.
  `firebase` is **not** a direct dependency — it resolves transitively (`^12.4.0` in the
  lockfile). After removal, add `"firebase": "^12.4.0"` (or the latest 12.x consistent with
  the lockfile) as a direct dependency.
- `functions/ministry-maps` (separate manifest): firebase-admin/functions — unaffected.
- e2e seeder (`e2e/seed/`) runs in Node with the Admin SDK and deliberately does not import
  app datasources — unaffected.
