# Testing & validation strategy

How the existing suites prove behavior parity. Apply during every phase (see
[implementation-runbook.md](./implementation-runbook.md)), not only at the end.

## 1. Why the existing suites are sufficient

- **Unit layer**: pages, BOs, guards, and state services mock the *abstract repositories*
  (`MOCK_REPOSITORIES_PROVIDERS`). They never see Firebase, so the SDK swap is invisible to
  ~60 of the 66 spec files. The 385-test suite keeps guarding against accidental
  repository-interface drift (a hard constraint).
- **Datasource layer**: five spec files unit-test the Firebase datasources directly with
  partial `jest.mock` of the SDK module — these get retargeted and *kept* (not weakened).
- **E2E layer**: 29 Playwright specs run the real app against the real Firebase emulators
  (Auth 9099, Firestore 8080, Functions 5001, seeded data, custom-token sign-in). This is
  the primary parity oracle: every Firebase call in the app is exercised end-to-end with
  the actual SDK stack.

## 2. Unit-test changes (mechanical, no weakening)

| Spec | Change |
| --- | --- |
| `firebase-territory-datasource.service.spec.ts` | `jest.mock('@angular/fire/firestore', …)` → `jest.mock('firebase/firestore', …)` (same mock list); after slice 3d, the `collectionData` mock moves to the interop helper (`collectionData$`) or stays on `firebase/firestore`'s `onSnapshot` — prefer mocking the helper module to keep testing the datasource's own logic. `MockProvider(Firestore)` → `MockProvider(FIRESTORE)`. |
| `firebase-designation-datasource.service.spec.ts` | Same pattern (`docData` → `docData$` retarget). |
| `firebase-auth-datasource.service.spec.ts` | `MockProvider(Auth)` → `MockProvider(FIREBASE_AUTH)`; `MockProvider(Firestore)` → `MockProvider(FIRESTORE)`; `authState` mocks → `authState$` helper spies. |
| `logger.service.spec.ts` | module mock path swap only. |
| `firebase-entity-converter.spec.ts` | type-import swap only. |
| new `firebase-rxjs-interop.spec.ts` | contracts from [technical-design.md](./technical-design.md) §4 checklist — first emission, missing-doc → `undefined`, empty query → `[]`, `idField`, teardown unsubscribe, callable laziness + `.data` unwrap. |

Rules: keep assertions intact; never delete/skip a failing test to proceed; retargeting a
mock path is a *test issue*, anything observable-behavioral is a *production issue* — stop
and fix the code, not the test.

## 3. E2E parity matrix — which specs prove which SDK path

| Firebase path exercised | Spec(s) |
| --- | --- |
| `authState$` live listener (sign-out state propagation, `window.__E2E__` bridge) | `auth.spec.ts` (UC-AUTH-22), `smoke.spec.ts` |
| `signInWithCustomToken` bridge + user resolution (cache-first `getByIdFromCache` → server `getById`) | `auth.spec.ts`, `journey-invite-onboarding.spec.ts`, `provision-user.spec.ts` |
| `provisionUserFromInvite` callable (cold, subscribe-driven) | `journey-invite-onboarding.spec.ts`, `users-invites.spec.ts` |
| `deleteUser` callable + user doc delete ordering | `users-invites.spec.ts`, `users.spec.ts` |
| Live `collectionData$` — territories list updates without reload | `territories.spec.ts`, `territories-crud.spec.ts`, `journey-moved-alert.spec.ts`, `journey-visit-feedback.spec.ts` |
| Live `collectionData$` — users list | `users.spec.ts` |
| Live `collectionData$` — territory city filter (`in` query) | `territories-filters.spec.ts`, `territories-assign.spec.ts` |
| Live `docData$` — designation (work page updates, TTL deletion → not-found) | `work-designation.spec.ts`, `journey-expired-designation.spec.ts`, `work-not-found.spec.ts`, `firestore-ttl.spec.ts` |
| Live `docData$` — congregation | `configuration.spec.ts`, `journey-city-rename.spec.ts`, `profile.spec.ts` |
| One-shot `getDoc`/`getDocs` (statistics, history, invite links) | `territories-statistics.spec.ts`, `journey-statistics-reconciliation.spec.ts`, `users-invites.spec.ts` |
| Collection-group history query + composite index | `territories-statistics.spec.ts`, `journey-statistics-reconciliation.spec.ts` |
| `runTransaction` batch write | `configuration.spec.ts` (city rename repositioning) |
| `Timestamp` writes (TTL `expireAt`) | `firestore-ttl.spec.ts` |
| Security rules (deny client-side user creation etc.) | `firestore-rules.spec.ts`, `users-invites.spec.ts` |
| Routing/guards after `authGuardPipe` removal | `navigation.spec.ts`, `auth.spec.ts` (UC-AUTH-13), `profile.spec.ts` |

The full-suite run (`npx nx e2e ministry-maps`) is the Phase 0 baseline, the Phase 3/4
per-slice oracle, and the Phase 7 release gate.

## 4. Streaming-parity checks (explicit, not incidental)

1. Background-write propagation: with `/territories` open, write a doc through the
   emulator (or the e2e `db` fixture) — it must appear without reload. This is also
   documented in `docs/domain/data-model.md` §4.6 ("a background Admin-SDK write is
   expected to appear on `/territories` without a reload").
2. Designation live updates: `work-designation.spec.ts` flows that save a visit and expect
   the work page state to move territory between "Territórios"/"Concluídos" sections rely on
   the live designation listener — they fail loudly if `docData$` degrades to one-shot.
3. Empty-collection behavior: `territories-assign.spec.ts` UC-ASSIGN-04 (city-less
   congregation) depends on the query emitting an empty array (not hanging, not erroring)
   — guards the helper's empty-snapshot mapping.
4. Unsubscribe hygiene (unit level): helper specs assert `onSnapshot`/`onAuthStateChanged`
   teardown runs on unsubscribe — prevents listener leaks on route changes (the old AF
   wrappers did this; parity requires it).

## 5. Laziness checks (callables)

- `users.spec.ts` / datasource unit specs cover `delete()` semantics; after the swap, add
  (or keep) an assertion that the callable function is **not** invoked until subscription
  and **is** re-invoked on re-subscription — this is the documented contract
  (`firebase-user-datasource.service.ts` comment).

## 6. Bundle & dependency verification

- Phase 0 and Phase 6: record `dist/apps/ministry-maps/browser` main-bundle sizes; delta
  within ±2% (NFR-4).
- Phase 6: `rg "@angular/fire" apps libs` empty; `npm ls firebase` single resolved version;
  production build greps clean for AngularFire markers (e.g. search emitted chunks for
  `angular/fire` string literals).

## 7. Command cheat-sheet

```bash
# unit + lint
npx nx run-many -t test lint -p ministry-maps common-ui

# build + e2e typecheck
npx nx build ministry-maps
npx nx typecheck-e2e ministry-maps

# focused e2e
npx nx e2e ministry-maps -- e2e/tests/<spec>.ts

# full e2e (release gate)
npx nx e2e ministry-maps

# emulator-backed manual parity session
npm start
```

Emulator notes (unchanged by this effort): Java 21 required; `npm start` imports the seed
on start and exports it back on graceful exit; emulators must be fully up before e2e
(the executor handles booting them).
