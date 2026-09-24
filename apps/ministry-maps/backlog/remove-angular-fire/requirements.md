# Requirements — remove `@angular/fire`

Owner of goals, constraints, and acceptance criteria for this effort. Facts about the current
code live in [current-state-audit.md](./current-state-audit.md); target design lives in
[technical-design.md](./technical-design.md).

## 1. Motivation

- `@angular/fire` is pinned to `21.0.0-rc.0-canary.f54c0fe` — a canary release candidate, not
  a stable line — and has caused recurring integration problems in this project.
- The architecture already pays for a repository layer (`app/repositories/*` abstract classes
  bound in `REPOSITORIES_PROVIDERS`) whose entire purpose is to keep Firebase out of the
  business logic. The app's use of AngularFire is shallow: DI tokens, four RxJS wrappers,
  one guard helper (inert), and one deploy executor.

## 2. Functional requirements

### FR-1 — Identical data-read behavior

Every Firestore/Auth read keeps its current delivery semantics. The authoritative matrix is
[current-state-audit.md](./current-state-audit.md) §3; in summary:

- **Live (streaming) reads stay live.** `congregation.getById`, `designation.getById`,
  `territory.getAllByCongregation`, `territory.getAllByCongregationAndCities`, and
  `user.getAllByCongregation` are `onSnapshot` listeners today (via `docData`/`collectionData`
  wrapped in `from(...)`). After the swap they must still push new snapshots to subscribers
  without reload. The e2e journeys rely on this (a write landing in Firestore appears in an
  open `/territories` view).
- **One-shot reads stay one-shot.** `getDoc`/`getDocs`/`getDocFromServer`-backed reads
  (`user.getById`, `territory.getById`, `getAllInIds`, visit history, statistics,
  `congregation.getCongregations`, …) must not become listeners, and vice versa.
- **Cache-first chain is preserved.** `user.getByIdFromCache` tries
  `getDocFromCache` → falls back to `getById` (server) on error;
  `resolveUserCongregationReference` picks `getDocFromCache` vs `getDoc` from an option.
- `initializeFirestore` keeps `persistentLocalCache` +
  `persistentMultipleTabManager` (multi-tab offline persistence).

### FR-2 — Identical auth behavior

- `authStateChanged()` streams `boolean` from the Firebase auth listener: it must emit the
  current state immediately on subscribe and on every sign-in/out — the same contract as
  `authState` (it never errors and never completes).
- `signInWithProvider` keeps its popup flow, eager-open timing (`from(promise)` created at
  call time), new-user handling (delete uninvited auth users, `INVALID_EMAIL` guard,
  `provisionFromInvite` path) — all of which lives above the SDK call and does not change.
- `getUserFromAuthentication` keeps `authState(...).pipe(take(1), …)` shape.
- `logOut()` keeps returning `Observable<void>` from `signOut`.
- The e2e bridge `window.__E2E__ = { auth, signInWithCustomToken }` (dev-non-cloud only)
  keeps its exact members; native `Auth` instance members used by specs (`signOut()`,
  `currentUser`) continue to satisfy them.

### FR-3 — Identical callable-function behavior

- `deleteUser` and `provisionUserFromInvite` callables keep their **export names** (those are
  the callable IDs in `functions/src/index.ts`).
- They stay **cold observables**: nothing hits Functions until subscribe; re-subscription
  re-executes. `FirebaseUserDatasourceService.delete()` explicitly depends on this
  ("It is a cold observable — without a subscription it never executes at all.").
- The Functions emulator still connects on `localhost:5001` in dev-non-cloud.

### FR-4 — Identical write behavior

- Write paths keep their current laziness: `defer(() => from(updateDoc/setDoc))` wrappers
  stay; eager `from(setDoc(...))` calls (e.g. `territory.add`, `designation.add`) stay eager.
- `runTransaction` batch update, `Timestamp.fromDate` TTL stamps (designations 180 days,
  logs 180 days), `removeUndefined` payload hygiene, and converters' `toFirestore/fromFirestore`
  behavior are unchanged.

### FR-5 — Bootstrap parity

- App initialization order and emulator wiring (auth 9099, firestore 8080, functions 5001 —
  matching `firebase.json`), gated by `environment.env === 'development' && !environment.useCloud`,
  are preserved, including the HMR re-initialization guards.
- Firebase config still comes from `environment.firebase` (build-time `NX_FIREBASE_*`).
- The remote-config provider is dropped (unused — verified by grep; see audit §6).

### FR-6 — Deployment parity

- The `deploy` target on `ministry-maps` keeps its name and `production` default
  configuration (CI enumerates projects with a `deploy` target and runs
  `npx nx run <proj>:deploy --configuration=production`).
- Hosting deploys to the `prod` target (`du-ministry-maps`) from
  `dist/apps/ministry-maps`, via firebase-tools with the existing `FIREBASE_TOKEN` secret.
  The `beta` channel config remains available.

## 3. Non-functional requirements

- **NFR-1 Type support.** The vanilla SDK ships first-party types. Domain typing keeps using
  `withConverter` + the existing `firebaseEntityConverterFactory`; `Timestamp`,
  `DocumentReference`, `CollectionReference` types import from `firebase/firestore`.
  No new `any` boundaries.
- **NFR-2 Tree-shaking.** Subpath imports only (`firebase/firestore`, never `firebase`
  root-import in app code beyond `firebase/app` for `initializeApp/getApp`).
- **NFR-3 Zoneless safety.** No `NgZone` introduction. Streams keep reaching templates via
  `AsyncPipe`/signals exactly as today; vanilla SDK listeners are zone-agnostic.
- **NFR-4 Bundle size.** Removing the AF wrapper layer should not increase the production
  main bundle; record before/after sizes (acceptance gate: no regression beyond ±2%).
- **NFR-5 Testability.** Datasource unit specs keep the `jest.mock('<module>', …)` partial-mock
  pattern, retargeted to `firebase/*` modules and the new DI tokens.

## 4. Constraints

- Repository interfaces (`*.repository.ts`), `REPOSITORIES_PROVIDERS`, BOs, pages, and their
  unit tests are **out of scope and must not change** (they mock abstract repositories).
- The Firestore emulator seed, security rules, and indexes do not change.
- No `firebase/compat` imports. No AngularFire shims installed as dependencies.
- Keep `Observable` returns; this effort does not migrate datasources to signals.

## 5. Acceptance criteria

1. `rg -n "@angular/fire" apps libs --glob '!**/backlog/**'` → zero hits;
   `@angular/fire` removed from `package.json`.
2. `npx nx run-many -t test lint -p ministry-maps common-ui` green (385 + 145 tests).
3. `npx nx build ministry-maps` green; zoneless OnPush build unchanged; no AF code in
   `dist/apps/ministry-maps` (verify by grepping the emitted chunks for AngularFire markers).
4. `npx nx typecheck-e2e ministry-maps` green.
5. All 29 e2e specs green against the emulators (`npx nx e2e ministry-maps`), including:
   - `auth.spec.ts` (UC-AUTH-22 exercises `window.__E2E__` sign-out),
   - `journey-invite-onboarding.spec.ts` / `journey-admin-assign-work.spec.ts` (custom-token
     sign-in + `provisionUserFromInvite` callable),
   - `users-invites.spec.ts` (invite CRUD + `deleteUser` callable path),
   - `territories*.spec.ts` + `journey-moved-alert.spec.ts` (streaming territory lists),
   - `work-designation.spec.ts` + `journey-expired-designation.spec.ts` (streaming
     designation `docData` reads),
   - `firestore-ttl.spec.ts` (`Timestamp` writes) and `firestore-rules.spec.ts`.
6. A manual emulator session demonstrates streaming parity: with `/territories` open, write a
   territory via the emulator (or the `db` fixture) and see it appear without reload.
7. `deploy` target deploys `prod` successfully from CI (or is explicitly verified with a
   dry-run locally: `firebase deploy --only hosting:prod --dry-run` after a production build).
