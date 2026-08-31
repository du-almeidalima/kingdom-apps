# Implementation notes — removing `@angular/fire`

Companion to the planning packet in this directory. Records what was executed, every
non-obvious decision (with context), problems hit along the way, and the final verification
results. Written after implementation; nothing here was planned ex-ante.

---

## 1. Outcome summary

- `@angular/fire` is fully removed; the app drives the vanilla Firebase JS SDK
  (`firebase@^12.18.0`, direct dependency) behind the unchanged repository abstraction.
- Bootstrap: `provideFirebase()` (`repositories/firebase/firebase-providers.ts`) exposes four
  DI tokens — `FIREBASE_APP`, `FIREBASE_AUTH`, `FIRESTORE`, `FUNCTIONS` — replacing the five
  AngularFire `provide*` blocks (remote-config provider dropped, unused).
- RxJS wrappers replaced by `repositories/firebase/firebase-rxjs-interop.ts`
  (`authState$`, `docData$`, `collectionData$`, `httpsCallableData$`) + a dedicated spec.
- New unit tests: 21 (13 interop-helper + 8 `firebase-user-datasource` — previously untested).
  Suite grew 385 → 406.
- Production main bundle: **1557 KB → 1474 KB (−5.3%)**; zero AngularFire/rxfire code in
  `dist/apps/ministry-maps`.
- Deploy target swapped to `nx:run-commands` + firebase-tools; dry-run against
  `hosting:prod` (`du-ministry-maps`) verified.
- Repository interfaces, `REPOSITORIES_PROVIDERS`, pages, BOs, guards' behavior, Firestore
  schema/rules/indexes, `functions/ministry-maps`: untouched.

## 2. Decisions taken (the ones worth reviewing)

### D1 — `provideFirebase()` function, not a flat provider array
**Context.** `technical-design.md` §2 specified a raw `FIREBASE_PROVIDERS: Provider[]`;
`PLAN_REVIEW.md` Finding 1 flagged the name collision with the `FIREBASE_PROVIDERS` enum in
`firebase-auth-datasource.service.ts` (~50 usages) and Finding 2 recommended a functional
wrapper. My verification pass confirmed both findings.
**Decision.** Adopted Option A: `provideFirebase(): EnvironmentProviders` via
`makeEnvironmentProviders`, resolving the collision and matching the `provideTheme` /
`provideRouter` / `provideServiceWorker` style already in `app.config.ts`. The enum was **not**
renamed (touching 15+ files for a name would violate smallest-change scope).

### D2 — File names `firebase-providers.ts` / `firebase-rxjs-interop.ts`
**Context.** The design doc named them `firebase.providers.ts` / `firebase-rxjs-interop.ts`;
`AGENTS.md` mandates kebab-case, and the folder's existing convention is `firebase-datasource.ts`.
**Decision.** Kebab-case throughout (`firebase-providers.ts`). Deviation from the packet noted
here.

### D3 — `congregation.getById` now uses the typed, converted reference
**Context.** `PLAN_REVIEW.md` Finding 7: `getById` built a raw `doc(this.firestore, path)`
(no converter) and relied on `docData(..., { idField })` + an `as` cast. The plan marked the
typed-ref refactor as "allowed, not required"; the working principles for this implementation
("no workarounds, prefer refactors") pointed to doing it.
**Decision.** `getById` now does `doc(this.congregationCollection, id)` + `docData$(ref)` — no
cast, no `idField` (the attached `congregationConverter` already merges `snapshot.id`).
Output shape is identical (`{ ...data, id }`), confirmed by the passing
`configuration/profile/journey-city-rename` e2e suites and the model's converter code.

### D4 — `designation.add()` re-read keeps its non-optional type via `map(as Designation)`
**Context.** The old code cast `docData(...) as Observable<Designation>`; `docData$` types the
stream `Designation | undefined`, which broke the method's declared return type.
**Decision.** `map((d) => d as Designation)` with a comment stating the invariant (the doc was
just written, first snapshot always carries it). Same guarantee, no blind cast of the whole
observable.

### D5 — `httpsCallableData$`: options + generics adopted; factory invoked even later
**Context.** `PLAN_REVIEW.md` Finding 10 recommended the `HttpsCallableOptions` parameter and
SDK-generic propagation. Verified against the installed SDK typings.
**Decision.** Adopted: `httpsCallableData$<TData, TResult>(functions, name, options?)`. One
nuance beyond the review: in the implementation `httpsCallable(...)` runs **when the data
function is invoked** (inside `(data) => { const callable = httpsCallable(...); return defer(...) }`),
not when `httpsCallableData$()` is called. That is even lazier than rxfire/AngularFire and
matched the datasources' construction shape unchanged; the interop spec asserts this timing
explicitly.

### D6 — Callables are now *truly* cold (deliberate behavior improvement)
**Context.** `PLAN_REVIEW.md` Finding 4 (verified): rxfire/AngularFire's callable wrapper fires
the HTTP request at **method-call** time (`from(callable(data))` without `defer`); the new
`defer(...)` moves it to subscribe time. All call sites subscribe immediately, so no
observable behavior change in flows — but it now *actually* satisfies the documented contract
in `FirebaseUserDatasourceService.delete()` ("It is a cold observable — without a subscription
it never executes at all"), which the old code violated.
**Decision.** Kept `defer` (the plan's `technical-design.md` §5 mandates it). New unit tests
prove subscribe-time execution (`firebase-user-datasource.service.spec.ts` › delete). This is
the one intentional semantic delta of the migration.

### D7 — HMR guards kept exactly at parity; rejected the try/catch "fix"
**Context.** `PLAN_REVIEW.md` Finding 3 claimed `initializeFirestore` throws on HMR
re-evaluation before the guard runs. My verification (recorded in `PLAN_REVIEW.md`'s
verification pass) showed the premise is wrong: the SDK returns the existing instance when
options are `deepEqual`, throws only on *different* options, and `connectFirestoreEmulator`
with matching config is a documented no-op. The proposed `try/catch → getFirestore(app)` would
even *mask* a genuine misconfiguration.
**Decision.** `firebase-providers.ts` mirrors the original guards verbatim (`auth['_isInitialized']`,
`firestore['_initialized']`, same positions). No try/catch.

### D8 — Deploy target uses `dependsOn` **without** `params: "forward"`
**Context.** `PLAN_REVIEW.md` Finding 6 recommended `dependsOn: [{ target: "build",
params: "forward" }]` plus a `beta` configuration. My verification found the flaw:
`--configuration=beta` would be forwarded to `build`, which has no `beta` configuration
(`project.json` defines only production/development) — the run would fail.
**Decision.** Corrected form: `"dependsOn": [{ "target": "build" }]` (default
`params: "ignore"`) — `build` always resolves its `defaultConfiguration: production`, which is
correct for both channels (same artifact, different hosting target). `beta` configuration kept
for the `firebase deploy --only hosting:beta` command. CI's existing
`nx run <proj>:deploy --configuration=production` invocation is unaffected; `npx nx show
project` confirms the `deploy` target is discoverable; `firebase deploy --only hosting:prod
--dry-run` succeeds.

### D9 — `firebase` pinned to `^12.18.0` (resolved 12.18.0; prior transitive was 12.17.1)
**Context.** The plan said "`^12.4.0` or the latest 12.x consistent with the lockfile".
**Decision.** Installed `^12.17.1` (matching the previously resolved transitive version); npm
resolved and recorded `^12.18.0` (12.18.0). Minor-version drift within the same major; the
full unit + e2e suites below ran against 12.18.0. If strict lockstep with the old transitive
version is preferred, downgrade to `firebase@12.17.1` — no code change needed.

### D10 — Root `firebase-functions` dependency removed
**Context.** `PLAN_REVIEW.md` Finding 8 (verified): root `package.json` carried
`firebase-functions@^7.0.3` (the *server* SDK) while nothing in `apps/`, `libs/`, `e2e/`,
`tools/` imports it; `functions/ministry-maps` has its own isolated manifest (`^7.3.2`).
**Decision.** `npm uninstall firebase-functions` at the root. Functions suite untouched;
post-removal test + lint matrix green.

### D11 — Ephemeral test simplifications in `firebase-auth-datasource.service.spec.ts`
The spec's `jest.mock('@angular/fire/firestore')` (a `doc` mock) and `MockProvider(Firestore)`
were dead weight after the migration — nothing in that spec's module graph touches Firestore
anymore (the user datasource is `MockProvider`-ed). Removed rather than retargeted. All
remaining tests in the file pass unchanged.

## 3. Problems encountered and resolutions

| Problem | Resolution |
| --- | --- |
| `MockProvider(<InjectionToken>)` (ng-mocks) injects `undefined` — specs asserting `expect.anything()` on the first SDK arg failed (`collectionGroup` received `undefined`). | Specs provide plain values: `{ provide: FIRESTORE, useValue: {} }` (likewise `FIREBASE_AUTH`/`FUNCTIONS`). `MockProvider` remains for classes (`LoggerService`, `FirebaseCongregationDatasourceService`). |
| Real `collectionData$` never completes → `lastValueFrom` hangs in the new user-datasource spec. | Partial-mock the interop module (`jest.mock('./firebase-rxjs-interop', …)`) and drive it with `of([...])` — the same pattern the territory/designation specs already use for live reads. The *real* helper behavior is covered by `firebase-rxjs-interop.spec.ts` via a mocked `onSnapshot` that captures the observer. |
| Mocked snapshots missing `exists()` — `resolveUserCongregationReference` calls `snapshot.exists()` before `.data()`. | Added `exists: () => true` to snapshot stubs. |
| Design-doc helper signature `<T, unknown>` does not satisfy the SDK constraint (second generic must extend `DocumentData`). | Helpers typed `<T>(ref: DocumentReference<T, DocumentData>)` / `<T>(q: Query<T, DocumentData>)`. |
| `@ts-expect-error`/unused-import lint errors after the import swaps. | Type-only imports trimmed (`Firestore`, `Auth`, `Functions` no longer referenced once tokens carry the types). |

## 4. E2E failures: classified as pre-existing — root cause since found and fixed

Full emulator-backed suite (`npx nx e2e ministry-maps`): **204 passed, 6 failed, 1 skipped**.
All 6 failures (5 × `territories-crud.spec.ts` UC-TERR-14/15/16/17/19 + 1 ×
`journey-admin-assign-work.spec.ts` J-01) shared one signature: the territory-manage-dialog
submit button stays **disabled** after the form is filled.

**Proof it was pre-existing:** the working tree was stashed and UC-TERR-14 was re-run on the
untouched baseline (with `@angular/fire` reinstalled) — identical failure. No test was
weakened, skipped, or deleted.

**Root cause (diagnosed afterwards via browser probes):** the zoneless migration commit
(`3785e8f`, since amended to `030554e`) converted the dialog's `isSubmitting` field to a
signal but left the submit binding as `[disabled]="!this.form.valid || isSubmitting"` —
reading the **signal object** instead of calling it. A signal object is always truthy, so
once the form became valid the binding still evaluated truthy and the button stayed disabled.
A property-setter spy on the button captured the smoking gun:
`SET disabled=[Signal (isSubmitting): false] at TerritoryManageDialogComponent_Template`.

**Fix:** one character — `isSubmitting()` in the binding — amended into the zoneless commit
(verified green on both the pristine zoneless tree and the migrated tree: 10/10 for the two
affected specs). A sweep for the same missing-call pattern across all templates found no
other instances.

Every Firebase-behavior oracle named in `requirements.md` §5 passed, including:
`auth.spec` (UC-AUTH-22 exercises `window.__E2E__`), `journey-invite-onboarding`
(custom-token + `provisionUserFromInvite` callable), `users-invites` (invite CRUD +
`deleteUser`), `territories.spec`/`territories-filters`/`territories-statistics`/
`territories-assign` (streaming territory lists), `work-designation` +
`journey-expired-designation` (streaming `docData` reads), `firestore-ttl`, `firestore-rules`.

## 5. Runbook deviations

- **Phases 1–4 were executed as one code checkpoint** rather than four separately-gated
  phases. Rationale: single atomic delivery (no intermediate shippable commits were needed),
  and the prescribed order would have forced every spec file to be edited twice (token rename
  in Phase 1, then module-path retarget in Phase 3/4). The *content* of every phase was
  executed; the unit/lint/build gates ran on the final state.
- **Phase 0's full e2e baseline was not recorded up front**; the baseline comparison was done
  retrospectively (stash → run → restore) when the 6 failures appeared. That classification
  cost one extra e2e cycle — running the baseline first would have saved it.

## 6. Verification matrix (final state)

| Gate | Result |
| --- | --- |
| `npx nx test ministry-maps` | 406/406 passed (66 → 68 suites) |
| `npx nx test common-ui` | 145/145 passed |
| `npx nx lint ministry-maps` / `common-ui` | green |
| `npx nx build ministry-maps` | green; main 1474 KB (baseline 1557 KB) |
| `npx nx typecheck-e2e ministry-maps` | green |
| `npx nx e2e ministry-maps` | 204 passed / 6 pre-existing failures (§4) / 1 skipped — the 6 failed specs pass (10/10) after the §4 zoneless fix, on both the baseline and migrated trees |
| `rg "@angular/fire" apps libs --glob '!**/backlog/**'` | zero hits (source, specs, docs, project.json) |
| `npm ls firebase @angular/fire` | `firebase@12.18.0` direct; `@angular/fire` absent |
| AngularFire markers in `dist/apps/ministry-maps` | none (also no rxfire) |
| `firebase deploy --only hosting:prod --dry-run` | dry run complete (`du-ministry-maps`) |
| `git diff --check` | clean |

## 7. Documentation updated

- `.agents/rules/deployment.md` — deploy executor wording (firebase-tools + `dependsOn`).
- `.agents/rules/angular-services.md`, `firebase-functions.md`, `firestore.md` — callable
  helper renamed to `httpsCallableData$`; pointer to the new provider/interop modules.
- `apps/ministry-maps/docs/domain/data-model.md` §4.6 — API column `docData`/`collectionData`
  → `docData$`/`collectionData$`.
- `apps/ministry-maps/docs/domain/roles-and-permissions.md` — dead `authGuardPipe` note
  removed (config itself was deleted from `app-routes.ts`).
- `src/types/global.d.ts` — `window.__E2E__` comment points at `provideFirebase()`.
- `e2e/seed/collections.ts` — header comment no longer references AngularFire.
- This packet's `README.md` phase checklist marked done.

`docs/testability-gaps.md` (gap #39) and `docs/developer-follow-up.md` still mention the now-
removed `authGuardPipe` as an open item; left untouched as historical trackers — close #39 at
your convenience.
