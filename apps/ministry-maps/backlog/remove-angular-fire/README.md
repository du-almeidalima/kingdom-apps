# Remove `@angular/fire` — migrate to the vanilla Firebase JS SDK

**Status: Implemented** (2026-08-30 — see [IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md))
**Scope: planning packet + the executed migration it prescribed**

This directory is the authoritative implementation packet for removing the `@angular/fire`
dependency from Ministry Maps and driving Firebase through the native (modular) Firebase JS
SDK (`firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/functions`) behind the
existing repository abstraction.

Motivation: the app currently depends on `@angular/fire@21.0.0-rc.0-canary.f54c0fe` — a
**pre-release canary** with no stable v21 — and the wrapper layer has been a recurring source
of issues. The codebase already isolates Firebase behind repository interfaces
(`app/repositories/*`), so the blast radius of swapping the SDK driver is deliberately small:
**no page, BO, or repository interface changes**.

## Start here

1. Read [requirements.md](./requirements.md). It owns goals, hard constraints, and acceptance criteria.
2. Read [current-state-audit.md](./current-state-audit.md). It inventories **every** `@angular/fire`
   usage, which imports are pure re-exports vs Angular-specific wrappers, and the exact
   streaming vs one-shot read semantics that must survive the swap.
3. Read [technical-design.md](./technical-design.md). It owns the target architecture: DI tokens,
   bootstrap, the RxJS interop helpers that replace `authState`/`docData`/`collectionData`/
   `httpsCallableData`, and the behavior-parity rules for each wrapper.
4. Execute [implementation-runbook.md](./implementation-runbook.md) in order, phase by phase.
5. Apply [testing-and-validation.md](./testing-and-validation.md) during every phase, not only at the end.

If documents appear to conflict, stop. `requirements.md` wins for behavior constraints,
`current-state-audit.md` wins for facts about the current code, `technical-design.md` wins for
target design, and `implementation-runbook.md` wins for execution order. Resolve the conflict
in this packet before changing the application.

## Frozen product decisions

- Keep the **repository abstraction untouched**: abstract repository classes
  (`AuthRepository`, `UserRepository`, `CongregationRepository`, `TerritoryRepository`,
  `DesignationRepository`, `InvitationLinkRepository`), `REPOSITORIES_PROVIDERS`, and all
  datasource public method signatures stay exactly as they are. Pages and BOs must not change.
- Use the **modular vanilla SDK** with direct subpath imports (`firebase/firestore` etc.) —
  never `firebase/compat`. The `firebase` package becomes a direct dependency pinned to the
  current transitive major (`^12.4.0`) to eliminate version drift.
- **Preserve read semantics exactly** (see the streaming matrix in
  [current-state-audit.md](./current-state-audit.md) §3): live listeners stay live listeners
  (`onSnapshot`), one-shot reads stay one-shot (`getDoc`/`getDocs`/`getDocFromCache`/
  `getDocFromServer`), cache-first reads keep their fallback chain.
- **Preserve observable laziness**: cloud-function callables remain *cold* (execute on
  subscribe, never on datasource-method call) — see `technical-design.md` §5.
- Keep the RxJS-based datasource returns (`Observable<…>`) everywhere. No signals/toPromise
  rewrites in this effort.
- Preserve the e2e auth bridge: `window.__E2E__ = { auth, signInWithCustomToken }` must keep
  its exact shape (`api.auth.signOut()`, `api.auth.currentUser`,
  `api.signInWithCustomToken(…)`), still gated to dev-non-cloud builds.
- Preserve the `deploy` **target name** on `ministry-maps` (CI discovers projects with a
  `deploy` target); replace the `@angular/fire:deploy` executor with `firebase-tools`
  (`firebase deploy --only hosting:prod`). CI already provides `FIREBASE_TOKEN`.
- Drop `@angular/fire/remote-config` outright: it is provided in `app.config.ts` but **never
  consumed** anywhere in the app.
- Remove the inert `authGuardPipe` route data and the `redirectUnauthorizedTo` import: the
  custom `authGuard` (`core/features/auth/guards/auth.guard.ts`) never reads it — it
  navigates to `login` itself (already documented in
  `docs/domain/roles-and-permissions.md`).

## Non-goals

- Do not change Firestore schema, security rules, indexes, Cloud Functions, or the emulator
  topology (ports come from `firebase.json`: firestore 8080, auth 9099, functions 5001).
- Do not refactor pages, BOs, or repository interfaces onto new APIs.
- Do not migrate template-driven forms, NgModules, or any other pre-existing debt.
- Do not switch one-shot reads to streaming or vice versa; do not "improve" cache behavior.
- Do not touch `functions/ministry-maps` (firebase-admin, separate manifest) or the e2e
  seeder (`e2e/seed/collections.ts` uses the Admin SDK in Node and never imports the app's
  datasources).
- Do not introduce AngularFire-compatible shims beyond the interop helpers specified in
  `technical-design.md` §4–§5.

## Execution protocol

- Complete one phase, its focused tests, and its gates before starting the next phase.
  Every phase must leave `main`-bound work green: unit tests, lint, build, and the focused
  e2e suites named in the runbook.
- `@angular/fire` stays installed until Phase 6. Its RxJS wrappers are designed to accept
  vanilla SDK instances, which is what makes the phased swap safe (see
  `implementation-runbook.md` Phase 1 for why this matters).
- Record baseline failures separately. Never weaken, skip, or delete tests to make a phase
  pass. If a test fails after an SDK-swap slice, first determine whether it is a test issue
  (mock targeting the old module path) or a production regression — production regressions
  stop the phase.
- Stop and do not proceed when a phase stop condition or focused command fails.
- Avoid opportunistic refactors. Keep new code standalone-first, `inject()`-based, kebab-case,
  zoneless-safe (no `NgZone`).
- Keep UI copy and `data-testid`s untouched — e2e selectors depend on them.

## Phase checklist

- [x] Phase 0 — Baselines and safety net (all unit + e2e green on the canary dependency).
- [x] Phase 1 — Firebase providers (DI tokens) + bootstrap swap; datasources keep working via
      AF wrappers on vanilla instances.
- [x] Phase 2 — RxJS interop helpers (`authState$`, `docData$`, `collectionData$`, callable
      wrapper) + helper unit tests; no consumers yet.
- [x] Phase 3 — Datasource migrations, one slice per service (Firestore → helpers → import
      paths), with focused unit + e2e per slice.
- [x] Phase 4 — Auth, guard/routes cleanup, logger, models, converter, `FirebaseDatasource`.
- [x] Phase 5 — Deploy target swap (`firebase-tools`) and CI deploy verification.
- [x] Phase 6 — Uninstall `@angular/fire`, add `firebase` direct dep, zero-reference sweep.
- [x] Phase 7 — Full validation gates and durable documentation updates.

Executed 2026-08-30. Deviations, decisions, and the pre-existing e2e failure classification
are recorded in [IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md).

## Definition of done

The later implementation is done only when all of the following are true:

- `rg "@angular/fire" apps libs` (excluding `node_modules`, lockfiles, and this packet)
  returns zero references; `@angular/fire` is absent from `package.json`.
- `firebase` is a direct dependency (`^12.4.0`) and `npm ls firebase` shows a single resolved
  version.
- Every read/write in [current-state-audit.md](./current-state-audit.md) §3 keeps its exact
  semantics (live vs one-shot vs cache-first, cold callables, eager popup open), verified by
  the full unit suite and the full emulator-backed e2e suite.
- `npx nx test ministry-maps`, `npx nx test common-ui`, `npx nx lint ministry-maps`,
  `npx nx lint common-ui`, `npx nx build ministry-maps`, `npx nx typecheck-e2e ministry-maps`
  pass, and all 29 e2e specs pass against the Firebase emulators.
- The production bundle contains no `@angular/fire` code; main-bundle size does not regress
  beyond noise (record before/after in the phase log).
- `window.__E2E__` keeps working (UC-AUTH-22 and the journey specs prove it).
- The `deploy` target still exists with the same name and deploys `prod` via firebase-tools
  using the existing `FIREBASE_TOKEN` secret.
- Documentation updated: `.agents/rules/deployment.md`, `.agents/rules/repositories.md` /
  `firestore.md` (if they reference AngularFire APIs), `docs/domain/data-model.md` §4.6 API
  column, `docs/domain/roles-and-permissions.md` (authGuardPipe note), and any
  `ARCHITECTURE.md`/`README.md` mention.
