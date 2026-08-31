# Implementation runbook — ordered phases

Execute in order. Every phase ends green: its focused unit tests, lint, and the named e2e
suites must pass before the next phase starts. `@angular/fire` stays installed through
Phase 5 — that is what makes each phase independently shippable (its RxJS wrappers accept
vanilla SDK instances; see [current-state-audit.md](./current-state-audit.md) §1).

Standard gate commands (from `AGENTS.md`):

```bash
npx nx test ministry-maps        # 385 tests
npx nx lint ministry-maps
npx nx build ministry-maps       # production build
npx nx typecheck-e2e ministry-maps
npx nx e2e ministry-maps -- e2e/tests/<spec>.ts   # focused, emulator-backed
```

If any focused command fails after a slice: first classify test-issue vs production
regression (mock-path drift = test issue; observable/laziness/streaming differences =
production regression). Production regressions stop the phase — do not paper over them.

---

## Phase 0 — Baseline & safety net

1. Run the full matrix on the untouched tree and record results + bundle size:
   ```bash
   npx nx run-many -t test lint -p ministry-maps common-ui
   npx nx build ministry-maps
   ls -l dist/apps/ministry-maps/browser/*.js   # record main bundle size
   ```
2. Run the **full** e2e suite once and record the green baseline
   (all 29 specs — this is the parity oracle used by every later phase).
3. Record `npm ls firebase` output (expect the transitive `^12.4.0` via `@angular/fire`).

**Gate:** everything green; baseline notes captured (bundle size, test counts).

## Phase 2 first? No — build order rationale

The interop helpers (Phase 2) are only callable once datasources hold vanilla instances
(Phase 1). But the helper *specs* only need jest-mocked SDK modules, so an alternative
order (helpers first) is acceptable if preferred — the runbook keeps providers first so the
app runs on its final DI shape as early as possible.

## Phase 1 — Firebase providers + bootstrap swap

**Files:**

- new: `src/app/repositories/firebase/firebase.providers.ts` (design §2)
- edit: `src/app/app.config.ts` — remove the five `provide*` blocks, spread `FIREBASE_PROVIDERS`
- edit (mechanical, token rename only): all `inject(Firestore)` → `inject(FIRESTORE)`
  (5 datasources + logger), `inject(Auth)` → `inject(FIREBASE_AUTH)` (auth datasource),
  `inject(Functions)` → `inject(FUNCTIONS)` (user datasource)
- edit (mechanical): the five specs' `MockProvider(Firestore|Auth|Functions)` →
  `MockProvider(FIRESTORE|FIREBASE_AUTH|FUNCTIONS)`
- `src/types/global.d.ts` already declares `window.__E2E__` as `unknown` with no
  `@angular/fire` dependency — no change needed, just update its doc comment that
  references `provideAuth` in `app.config.ts` to the new provider module.

Everything else in the datasources stays byte-identical — AF wrapper calls
(`docData`, `collectionData`, `authState`, `httpsCallableData`) now receive vanilla
instances and keep working.

**Verify manually (emulator session):** `npm start`, sign in, confirm console has **no
double-initialization or emulator double-connect warnings** (the HMR guards must keep
working), and that the emulator UI shows the client connected.

**Focused gates:**

```bash
npx nx test ministry-maps
npx nx lint ministry-maps
npx nx e2e ministry-maps -- e2e/tests/smoke.spec.ts e2e/tests/auth.spec.ts
```

**Stop conditions:** auth timing changes (login redirect flashes), emulator connection
errors, HMR reload failures.

## Phase 2 — RxJS interop helpers + unit tests

**Files:**

- new: `src/app/repositories/firebase/firebase-rxjs-interop.ts` (design §4:
  `authState$`, `docData$`, `collectionData$`, `httpsCallableData$`)
- new: `src/app/repositories/firebase/firebase-rxjs-interop.spec.ts` — assert the full
  semantics checklist (immediate first emission; `undefined` on missing doc; empty array
  for empty query; `idField` merge; teardown calls the SDK unsubscribe; callables only run
  on subscribe and re-run on re-subscribe; `.data` unwrap).

No production consumer changes in this phase.

**Focused gates:**

```bash
npx nx test ministry-maps
npx nx lint ministry-maps
```

## Phase 3 — Datasource migrations (one slice per service)

Each slice: swap `@angular/fire/*` imports → `firebase/*`, replace AF wrapper calls with
the helpers, retarget that datasource's spec mocks (`jest.mock('firebase/firestore', …)`),
keep converters/queries byte-identical. Run the slice's unit tests + focused e2e before
moving on.

Slices ordered by risk (lowest first):

### 3a. `firebase-invitation-link-datasource` (no wrappers — pure import swap)
e2e: `users-invites.spec.ts invite-sign-in.spec.ts`

### 3b. `firebase-congregation-datasource` (one `docData` in `getById`)
- `docData(ref, { idField: 'id' })` → `docData$(ref, { idField: 'id' })` (drop the cast or
  keep an equivalent one).
- e2e: `configuration.spec.ts profile.spec.ts journey-city-rename.spec.ts`

### 3c. `firebase-designation-datasource` (two `docData` uses: `getById`, `add`'s re-read)
- `add` keeps its `take(1)` over the live helper — same semantics.
- e2e: `work-designation.spec.ts work-not-found.spec.ts journey-expired-designation.spec.ts
  firestore-ttl.spec.ts journey-admin-assign-work.spec.ts`

### 3d. `firebase-territory-datasource` (two `from(collectionData(...))` sites)
- `from(collectionData(q))` → `collectionData$(q)` — do **not** leave a `from()` wrapper
  (it would still work, but the helper already returns an Observable).
- e2e: `territories.spec.ts territories-crud.spec.ts territories-filters.spec.ts
  territories-statistics.spec.ts territories-assign.spec.ts territories-alerts.spec.ts
  journey-moved-alert.spec.ts journey-visit-feedback.spec.ts territories-export.spec.ts
  journey-statistics-reconciliation.spec.ts`

### 3e. `firebase-user-datasource` (collectionData + two callables)
- `from(collectionData(q))` → `collectionData$(q)` in `getAllByCongregation`.
- `httpsCallableData(functions, 'deleteUser'|'provisionUserFromInvite')` →
  `httpsCallableData$(functions, …)` — construction shape identical; **verify laziness**:
  the spec suite must keep proving `delete()` runs the callable only on subscribe.
- e2e: `users.spec.ts users-invites.spec.ts provision-user.spec.ts
  journey-invite-onboarding.spec.ts auth.spec.ts`

**Focused gates per slice:** that slice's spec file (`npx nx test ministry-maps -- -t` or
full suite if simpler), `npx nx lint ministry-maps`, the slice's e2e list.

**Stop conditions:** any change in emission timing visible in e2e (e.g. assign page FAB
enable/disable), callable executed eagerly (unit evidence), live reads becoming one-shot
(`/territories` stops updating on background writes).

## Phase 4 — Auth, guard cleanup, logger, models, converter

1. `firebase-auth-datasource.service.ts`:
   - imports → `firebase/auth`; `authState(this.auth)` → `authState$(this.auth)` in
     `authStateChanged()` and `getUserFromAuthentication()`;
   - `from(signInWithPopup(...))` / `from(signOut(...))` unchanged besides imports.
2. `app-routes.ts`: delete `redirectUnauthorizedTo` import, `redirectUnauthorizedToLogin`
   export, and the three `authGuardPipe` data keys (inert — audit §6). Confirm no other
   importer (grep).
3. `logger.service.ts`, `firebase-entity-converter.ts`, `firebase-datasource.ts`,
   `models/firebase/*.ts` (6 files): type/function import swaps only.
4. Specs: logger + converter retarget mocks.

**Focused gates:**

```bash
npx nx test ministry-maps
npx nx lint ministry-maps
npx nx e2e ministry-maps -- e2e/tests/auth.spec.ts e2e/tests/invite-sign-in.spec.ts e2e/tests/navigation.spec.ts e2e/tests/smoke.spec.ts
```

**Stop conditions:** login/logout regressions, guard redirect differences (`UC-AUTH-*`),
`window.__E2E__` failures (UC-AUTH-22 exercises it directly).

## Phase 5 — Deploy target swap

1. Replace the `deploy` executor in `apps/ministry-maps/project.json` with the
   `nx:run-commands` form (design §9). Keep target name + `production` default.
2. Local dry-run:
   ```bash
   npx nx build ministry-maps && npx firebase deploy --only hosting:prod --dry-run
   ```
3. Confirm `.github/workflows/ci.yml` needs **no** change (it already runs
   `nx run <proj>:deploy --configuration=production` with `FIREBASE_TOKEN`; emulator cache
   path stays valid).

**Gate:** dry-run succeeds; `npx nx show projects --json | jq` still lists `ministry-maps`
as having a `deploy` target. Coordinate a real `prod` deploy verification with the owner
(merge to `main` will trigger it — this is the one phase with production effect).

## Phase 6 — Remove `@angular/fire`, pin `firebase`

```bash
npm uninstall @angular/fire
npm install firebase@^12.4.0
npm ls firebase            # single resolved version, no more transitive-only
npx nx run-many -t test lint -p ministry-maps common-ui
npx nx build ministry-maps
```

Zero-reference sweep (must be empty):

```bash
rg -n "@angular/fire" apps libs --glob '!**/backlog/**'
```

Record the new main-bundle size vs Phase 0.

**Gate:** sweep empty; everything green; bundle size within the NFR-4 budget.

## Phase 7 — Full validation + durable documentation

1. Full matrix:
   ```bash
   npx nx run-many -t test lint -p ministry-maps common-ui
   npx nx build ministry-maps
   npx nx typecheck-e2e ministry-maps
   npx nx e2e ministry-maps          # all 29 specs
   ```
2. Manual streaming-parity check (acceptance #6): app + emulators open, `/territories`
   mounted; add a territory via the emulator UI/firestore; confirm it appears without reload.
3. Documentation updates:
   - `.agents/rules/deployment.md` — deploy executor wording.
   - `.agents/rules/repositories.md` / `firestore.md` — any `@angular/fire` API mentions →
     vanilla equivalents + the new DI tokens/helpers.
   - `docs/domain/data-model.md` §4.6 — API column names (`docData` → live listener helper,
     `collectionData` → live query helper).
   - `docs/domain/roles-and-permissions.md` — drop the "belongs to @angular/fire's
     AuthGuard" note after the inert pipe removal.
   - `ARCHITECTURE.md` / root `README.md` — only if they mention AngularFire.
4. `git diff --check` (docs hygiene).

**Gate:** every requirements.md acceptance criterion met; definition of done
([README.md](./README.md)) satisfied.
