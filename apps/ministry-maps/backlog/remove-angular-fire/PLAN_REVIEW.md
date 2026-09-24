# Plan Review: Removal of `@angular/fire` in Favor of Vanilla Firebase JS SDK

This document provides a thorough review and architectural assessment of the migration plan
located in `apps/ministry-maps/backlog/remove-angular-fire/`.

---

## Executive Summary

The backlog packet (`README.md`, `requirements.md`, `current-state-audit.md`,
`technical-design.md`, `implementation-runbook.md`, `testing-and-validation.md`) is
**exceptionally well-crafted, accurate, and ready for execution**.

Key strengths of the existing plan:
1. **Accurate inventory:** Exactly identifies all files touching `@angular/fire` and
   classifies them accurately (pure re-exports vs. Angular DI / RxJS wrappers).
2. **Preservation of semantics:** Explicitly safeguards critical delivery contracts (live
   Firestore listeners, one-shot reads, cache-first fallbacks, cold callables, and eager
   popup authentication).
3. **Low blast radius:** Keeps domain models, Business Objects (BOs), Pages, Guards, and
   abstract Repository interfaces 100% untouched.
4. **Phased risk mitigation:** Leverages `@angular/fire`'s ability to accept vanilla SDK
   instances during Phases 1–5 so that every phase remains green on unit tests and
   emulator-backed E2E tests before uninstalling the dependency in Phase 6.

Below are **confirmed findings, points of attention, and architectural improvements**
identified during the second-pass review. Each item has been verified against the actual
source code and confirmed not to be already covered by the existing documents.

---

## Finding 1 — `FIREBASE_PROVIDERS` Name Collision (Confirmed, High Priority)

### Context

`technical-design.md` §2 exports a provider array named `FIREBASE_PROVIDERS`:

```typescript
export const FIREBASE_PROVIDERS = [
  { provide: FIREBASE_APP, useFactory: () => initializeApp(environment.firebase) },
  // ...
];
```

### Problem

`firebase-auth-datasource.service.ts` already exports an **enum** named `FIREBASE_PROVIDERS`:

```typescript
export enum FIREBASE_PROVIDERS {
  GOOGLE = 'GOOGLE',
  MICROSOFT = 'MICROSOFT',
}
```

This enum is used **extensively** (30+ references) across pages, components, templates,
and specs:
- `provider-login-button.component.ts`
- `sign-in-page.component.ts` / `sign-in-page.component.html`
- `login-page.component.ts` / `login-page.component.html` (`FIREBASE_PROVIDERS.GOOGLE`)
- `auth.service.ts`
- Multiple spec files

While TypeScript wouldn't error (they are different types from different modules), the
name collision will cause developer confusion when auto-importing, and both symbols appear
in template contexts (the enum via `protected readonly FIREBASE_PROVIDERS = FIREBASE_PROVIDERS`
pattern in components).

### Recommendation

Rename the provider array to avoid collision. Two clean options:

**Option A** — If adopting the `provideFirebase()` function (Finding 2), the export becomes a
function and the name conflict disappears entirely:
```typescript
export function provideFirebase(): EnvironmentProviders { ... }
// app.config.ts: provideFirebase(),
```

**Option B** — If keeping a flat array, rename to something unambiguous:
```typescript
export const FIREBASE_CORE_PROVIDERS = [ ... ];
// app.config.ts: ...FIREBASE_CORE_PROVIDERS,
```

---

## Finding 2 — Encapsulate DI Providers with `provideFirebase()` (Confirmed)

### Context

`technical-design.md` §2 defines a raw `Provider[]` array. Modern Angular (v15+)
convention is to encapsulate environment providers within a functional helper returning
`EnvironmentProviders` via `makeEnvironmentProviders`.

### Recommendation

Wrap the providers in a `provideFirebase()` function. This:
- Matches the existing `provideTheme(...)`, `provideRouter(...)`, and
  `provideServiceWorker(...)` in `app.config.ts`.
- Makes DI ordering explicit: each downstream factory `inject(FIREBASE_APP)` instead
  of relying on global `getApp()`.
- Resolves Finding 1's name collision.
- Prevents accidental use in component-level providers (environment providers can only be
  registered at the root).

```typescript
import { EnvironmentProviders, inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';

export function provideFirebase(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: FIREBASE_APP,
      useFactory: () => initializeApp(environment.firebase),
    },
    {
      provide: FIREBASE_AUTH,
      useFactory: () => {
        const app = inject(FIREBASE_APP);
        const auth = getAuth(app);    // explicit DI dependency, not global getApp()
        // ...
      },
    },
    // ... remaining tokens
  ]);
}
```

---

## Finding 3 — Robust HMR Handling for `initializeFirestore` (Confirmed)

### Context

The current `app.config.ts` (L50-68) calls `initializeFirestore(getApp(), settings)` and
uses a private-field guard (`firestore['_initialized']`) **only** inside the emulator
block. The HMR guard's position means:

```typescript
// current code (simplified)
const firestore = initializeFirestore(getApp(), { localCache: ... });   // ← crashes on HMR
if (environment.dev && !useCloud) {
  if (firestore['_initialized']) return firestore;                       // ← guard is here, too late
  connectFirestoreEmulator(firestore, 'localhost', 8080);
}
return firestore;
```

In **production** HMR scenarios (or non-emulator dev), the `initializeFirestore` call will
throw `"Firestore has already been initialized!"` before the guard runs.

The `technical-design.md` §2 replicates this same fragile ordering.

### Fix

Use a `try/catch` pattern at the `initializeFirestore` call site:

```typescript
let firestore: Firestore;
try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch {
  // HMR: Firebase JS SDK throws if already initialized; fall back to existing instance
  firestore = getFirestore(app);
}
```

This is unconditionally safe regardless of emulator mode.

---

## Finding 4 — `httpsCallableData$` Eagerness Semantics Divergence (Confirmed, Point of Attention)

### Context

`technical-design.md` §4 specifies the callable wrapper with `defer`:

```typescript
return defer(() => from(callable(data) as Promise<{ data: R }>).pipe(map((result) => result.data)));
```

The current Angular Fire `httpsCallableData` (which wraps `rxfire/functions`'s
`httpsCallable`) does **not** use `defer`:

```javascript
// node_modules/rxfire/functions/index.esm.js — actual implementation
function httpsCallable(functions, name, options) {
    var callable = httpsCallable$1(functions, name, options);
    return function (data) {
        return from(callable(data)).pipe(map(function (r) { return r.data; }));
    };
}
```

The rxfire version uses `from(callable(data))` — the promise starts executing at
**call time** (when `this.deleteUserFn(userId)` is invoked), not at subscribe time. The
proposed `defer(() => from(...))` makes the observable **truly cold**: the HTTP request
doesn't start until subscription.

### Impact Assessment

In practice this difference is benign because all call sites subscribe immediately after
calling the function:
- `delete()` (L180-191): `return this.deleteUserFn(userId).pipe(...)` — returned and
  subscribed by the caller.
- `provisionFromInvite()` (L136-138): same pattern.

The `defer` is actually an improvement (making callables truly cold matches the documented
contract and the `delete()` comment "It is a cold observable — without a subscription it
never executes at all"). However, the implementer should be aware this is a **deliberate
behavioral enhancement**, not a 1:1 port.

### Action

Keep `defer` (it's safer and matches the documented intent). Note this in the phase log
as intentional, and verify with the callable laziness unit test in
`firebase-rxjs-interop.spec.ts`.

---

## Finding 5 — `authState$` Implementation: Use `onAuthStateChanged` Directly (Confirmed)

### Context

`technical-design.md` §4 references an undefined `onAuthStateChangedAdapter`:

```typescript
export const authState$ = (auth: Auth): Observable<User | null> =>
  new Observable<User | null>((subscriber) =>
    onAuthStateChangedAdapter(auth, (user) => subscriber.next(user)),
  );
```

The document notes this is "trivial" and defers to the implementer, but the incomplete
snippet could cause confusion during execution.

### Complete Implementation

Use `onAuthStateChanged` directly — it returns the `Unsubscribe` function that RxJS uses
as teardown:

```typescript
import { onAuthStateChanged } from 'firebase/auth';

export const authState$ = (auth: Auth): Observable<User | null> =>
  new Observable<User | null>((subscriber) => {
    return onAuthStateChanged(
      auth,
      (user) => subscriber.next(user),
      (error) => subscriber.error(error),
      () => subscriber.complete(),
    );
  });
```

**Note:** The Angular Fire `authState` explicitly **never** errors and **never** completes
(it catches errors internally). The vanilla `onAuthStateChanged` accepts error/complete
callbacks but Firebase itself never invokes them under normal operation. Providing them
here is defensive and safe — but the helper spec should assert that the observable
never completes (matching current behavior) by verifying the subscriber receives `next`
emissions without `complete` or `error`.

---

## Finding 6 — Nx Deploy Target: Use `dependsOn` (Confirmed)

### Context

`technical-design.md` §9 chains `npx nx build` inside the deploy command:

```json
"command": "npx nx build ministry-maps --configuration=production && npx firebase deploy --only hosting:prod"
```

### Improvement

In Nx workspaces, chaining `npx nx build` inside a command executor spawns a child Nx
process and bypasses Nx's native target graph orchestration (caching, dependency tracking).
Use Nx's `dependsOn`:

```jsonc
"deploy": {
  "executor": "nx:run-commands",
  "dependsOn": [
    { "target": "build", "params": "forward" }
  ],
  "options": {
    "command": "npx firebase deploy --only hosting:prod"
  },
  "configurations": {
    "production": {},
    "beta": {
      "command": "npx firebase deploy --only hosting:beta"
    }
  },
  "defaultConfiguration": "production"
}
```

Benefits:
- Nx manages build caching and the dependency tree natively.
- `beta` configuration is available without hardcoding a second build command.
- `npx nx run ministry-maps:deploy --configuration=production` works seamlessly in CI.

---

## Finding 7 — `congregation.getById` Uses Untyped `doc()` Without Converter (Point of Attention)

### Context

`firebase-congregation-datasource.service.ts` L66-71:

```typescript
getById(id: string): Observable<Congregation | undefined> {
  const congregationReference = doc(this.firestore, `${COLLECTION_NAME}/${id}`);
  //    ^ raw doc reference — no withConverter
  return docData(congregationReference, { idField: 'id' }) as Observable<Congregation | undefined>;
  //     ^ Angular Fire's docData handles the snapshot-to-data conversion
}
```

This method creates a **raw** `DocumentReference` (using `doc(firestore, path)` instead of
`doc(this.congregationCollection, id)`), bypassing the `congregationConverter` applied to
`this.congregationCollection`. The `{ idField: 'id' }` option in Angular Fire's `docData`
handles merging the document ID.

When migrating to `docData$`, the helper will receive a `DocumentReference<DocumentData>`
(untyped) rather than `DocumentReference<Congregation>`. This works because:
1. The congregation model has no Timestamps to convert (it's a 1:1 shape).
2. `idField: 'id'` handles the ID merge.

### Action

During migration, either:
- Keep the cast `as Observable<Congregation | undefined>` (parity), or
- Optionally refactor to use `doc(this.congregationCollection, id)` which already has
  `withConverter(congregationConverter)` — getting proper type inference. This is a minor
  improvement allowed by the plan but not required.

The implementer should be aware this is the only `docData` call site using an untyped
reference — the designation datasource's `docData` calls both use typed references
(via `doc(this.designationCollection, id)`).

---

## Finding 8 — Dependency Clean-up: Root `firebase-functions` (Confirmed)

### Observation

The root `package.json` lists `"firebase-functions": "^7.0.3"` in its `dependencies`.
This is the **server-side** Cloud Functions SDK:
- `apps/ministry-maps` only uses `firebase/functions` (the **client** SDK).
- The actual backend Cloud Functions live in `functions/ministry-maps`, which has its own
  isolated `package.json` with `"firebase-functions": "^7.3.2"`.

### Action

During Phase 6 (dependency cleanup), remove `"firebase-functions"` from the root
`package.json` alongside `@angular/fire`. Verify `functions/ministry-maps` continues to
build independently.

---

## Finding 9 — Missing Unit Test Coverage: `firebase-user-datasource.service.ts` (Confirmed)

### Observation

The runbook (Phase 3e) involves migrating `firebase-user-datasource.service.ts`,
which contains the most complex Firebase interactions:
- Two `httpsCallableData` callables (cold semantics)
- `getDocFromServer` + `getDocFromCache` (cache-first chain)
- `collectionData` (live streaming)
- Cross-datasource dependency resolution (`resolveUser` → congregation)

There is **no** dedicated `firebase-user-datasource.service.spec.ts` in the repository.
The behavior is covered by higher-level BO specs (via mocked repositories) and E2E tests,
but the datasource's internal plumbing is untested at the unit level.

### Recommendation

1. Ensure `firebase-rxjs-interop.spec.ts` thoroughly tests the callable cold-observable
   contract (`defer` execution timing, re-invocation on re-subscribe).
2. Consider creating `firebase-user-datasource.service.spec.ts` during Phase 3e. This
   datasource has the most complex logic (cache fallback, congregation resolution,
   callable error handling with `catchError`) and would benefit from direct unit coverage,
   especially since the callable wrapper semantics are changing (Finding 4).

---

## Finding 10 — `httpsCallableData$` Should Support Options (Confirmed)

### Context

The rxfire `httpsCallable` (which Angular Fire wraps as `httpsCallableData`) accepts an
optional third `options` parameter (`HttpsCallableOptions`, e.g. for timeout):

```javascript
// rxfire source
function httpsCallable(functions, name, options) {
    var callable = httpsCallable$1(functions, name, options);
    ...
}
```

The `technical-design.md` §4 helper omits this parameter.

### Recommendation

Accept optional `HttpsCallableOptions` for forward compatibility:

```typescript
import { HttpsCallableOptions } from 'firebase/functions';

export const httpsCallableData$ =
  <TData = unknown, TResult = unknown>(
    functions: Functions,
    name: string,
    options?: HttpsCallableOptions,
  ) =>
  (data: TData): Observable<TResult> => {
    const callable = httpsCallable<TData, TResult>(functions, name, options);
    return defer(() => from(callable(data)).pipe(map((result) => result.data)));
  };
```

This also improves the generic typing: `httpsCallable<TData, TResult>` propagates the
types through the SDK function, avoiding the `as Promise<{ data: R }>` cast.

---

## Summary Matrix

| # | Finding | Priority | Status |
|:--|:--------|:---------|:-------|
| 1 | `FIREBASE_PROVIDERS` name collision with existing enum | 🔴 High | Must fix before execution |
| 2 | Wrap providers in `provideFirebase()` function | 🟡 Recommended | Idiomatic Angular, resolves #1 |
| 3 | HMR `initializeFirestore` try/catch positioning | 🟡 Recommended | Prevents prod-HMR crash |
| 4 | `httpsCallableData$` `defer` vs `from` semantics change | 🟢 Info | Improvement over current; document |
| 5 | `authState$` incomplete snippet in design doc | 🟡 Recommended | Provide complete implementation |
| 6 | Deploy target: use Nx `dependsOn` | 🟢 Recommended | Better Nx integration |
| 7 | `congregation.getById` untyped doc reference | 🟢 Info | Be aware during migration |
| 8 | Root `firebase-functions` cleanup | 🟢 Recommended | Phase 6 housekeeping |
| 9 | Missing `firebase-user-datasource.service.spec.ts` | 🟡 Recommended | Test gap for complex datasource |
| 10 | `httpsCallableData$` options + generic typing | 🟢 Recommended | Forward compat + type safety |

---

## Conclusion

The plan is sound and safe to execute. The only blocking finding is the **`FIREBASE_PROVIDERS`
name collision** (#1), which is straightforward to resolve — adopting the `provideFirebase()`
function pattern (#2) eliminates it entirely while aligning with Angular conventions.

The remaining findings are improvements that make the migration cleaner, more resilient
(HMR handling), and better typed. None require structural changes to the phased approach.

---

## Verification Pass — Findings Audited Against Source (2026-08-30)

Every finding above was re-verified against the actual source code, the installed SDK
runtime (`node_modules/@firebase/firestore`, `node_modules/rxfire`, `node_modules/@angular/fire/fesm2022`),
`apps/ministry-maps/project.json`, the CI workflow, and `.firebaserc`.

**Result: 8 of 10 findings are correct as written. Finding 3's core premise is factually
wrong and should be dropped. Findings 5 and 6 have inaccurate rationale/snippets but
salvageable recommendations.**

### Confirmed correct (facts and recommendations)

| # | Finding | Evidence |
|---|---------|----------|
| 1 | `FIREBASE_PROVIDERS` name collision | Enum at `firebase-auth-datasource.service.ts:17`; ~50 usages incl. `login-page.component.html:6`, `sign-in-page.component.html:31`, `auth.service.ts:50`, `provider-login-button.component.ts:46-57`, and 4 spec files. Design doc exports the colliding array at `technical-design.md:51`. **Caveat:** no single file ever imports both symbols, so there is no compile error — this is a DX/auto-import hazard, not a hard blocker. Rename recommendation stands. |
| 2 | `provideFirebase()` wrapper | Design doc §2 is a raw `Provider[]`. `app.config.ts:22-28,80` already uses `provideTheme`/`provideRouter`/`provideServiceWorker`; `makeEnvironmentProviders` is the idiomatic enclosure. Correct. |
| 4 | `defer` semantics divergence | Confirmed in `node_modules/rxfire/functions/index.esm.js` (L21-26): `from(callable(data))`, no `defer`. AF's `httpsCallableData` is `_zoneWrap(rxfire httpsCallable)` — no `defer` anywhere. Call sites confirmed (`delete()` L180-191, `provisionFromInvite()` L136-138); the "cold observable" comment exists at L181-182. Assessment (benign, deliberate improvement) is right. |
| 7 | Untyped doc ref in `congregation.getById` | Confirmed at `firebase-congregation-datasource.service.ts:66-71`. `congregationConverter` is pass-through with no Timestamp handling (`firebase-congregation-model.ts:13-25`). Designation datasource's both `docData` calls use typed refs (L61-63, L82). Correct. |
| 8 | Root `firebase-functions` cleanup | Root `package.json:25` has `^7.0.3`; zero imports anywhere in `apps/`, `libs/`, `e2e`, `tools/` (e2e uses `firebase-admin`, which is a root devDependency). `functions/ministry-maps` has its own isolated `^7.3.2` — exact match to the claim. Correct. |
| 9 | Missing user-datasource spec | Only 3 datasource specs exist (auth/territory/designation). The complexity claim matches the source (2 callables, cache-first chain, `resolveUser`, `catchError` paths). Correct. |
| 10 | Options param + generics | rxfire accepts a 3rd `options` param; `HttpsCallableOptions` is exported (`@firebase/functions/dist/functions.d.ts:156`) and `httpsCallable<RequestData, ResponseData, ...>` propagates types (`:143`). Correct. (Nit: the SDK now has a third generic, `StreamData` — immaterial to the recommendation.) |

### Finding 3 — REJECTED: the premise is factually incorrect

The claim that `initializeFirestore` will throw `"Firestore has already been initialized!"`
on re-evaluation (HMR, non-emulator dev) is wrong for the installed Firebase 12 SDK:

1. **The quoted error message does not exist** in `node_modules/@firebase/firestore`.
2. Actual behavior (verified in `dist/common-*.js`): when a Firestore instance is already
   registered for the app, `initializeFirestore` compares the saved options to the new ones
   with `deepEqual` (from `@firebase/util`) and:
   - **same options → returns the existing instance** (no throw);
   - **different options → throws `FAILED_PRECONDITION`** with the message
     `"initializeFirestore() has already been called with different options. … call
     getFirestore() to return the already initialized instance."`
3. On HMR re-evaluation the options are structurally identical (same `environment.firebase`,
   same `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` literal) → the
   SDK returns the existing instance. This is exactly how the **current** app survives HMR
   today, including non-emulator dev (`useCloud`). "Production HMR" is not a real scenario —
   HMR is a dev-server feature.
4. Even the thing the existing guard actually protects — a second
   `connectFirestoreEmulator` call — is a documented no-op in this SDK version when the
   configuration matches ("No-op if the new configuration matches the current configuration.
   This supports SSR environments…").

**Verdict:** `technical-design.md`'s snippet mirrors `app.config.ts` and is correct
behavior-parity; no fix is needed. The proposed `try/catch` fallback to `getFirestore(app)`
would silently swallow the genuine "different options" misconfiguration error that today
fails loudly. Drop this finding; if any guard is kept, keep the design doc's parity guard
as-is.

### Finding 5 — recommendation correct; rationale inaccurate

The proposed `authState$` implementation (all three callbacks + returning the unsubscribe
function) matches rxfire verbatim — it **is** the faithful port. Keep it.

However, the note that "Angular Fire's `authState` explicitly never errors and never
completes (it catches errors internally)" is wrong about the mechanism: AF's
`authState = _zoneWrap(rxfire.authState)` and rxfire **binds `subscriber.error` and
`subscriber.complete` straight through** to `onAuthStateChanged`
(`rxfire/auth/index.esm.js:26-31`) — there is no internal catch. The observable never
errors/completes in practice only because Firebase never invokes those callbacks. The
behavioral assertion in the helper spec is still worth keeping.

### Finding 6 — direction correct; proposed snippet has a bug

Using `dependsOn` instead of chaining `npx nx build &&` inside `run-commands` is right.
But the proposed `"dependsOn": [{ "target": "build", "params": "forward" }]` combined with a
`beta` configuration is broken: `params: "forward"` forwards the CLI flags — including
`--configuration=beta` — to `build`, and the **`build` target has no `beta` configuration**
(`project.json:45-69` defines only `production`/`development`).
`npx nx deploy ministry-maps --configuration=beta` would fail at the build step.

**Corrected form:**

```jsonc
"deploy": {
  "executor": "nx:run-commands",
  "dependsOn": [{ "target": "build" }],
  "options": {
    "command": "npx firebase deploy --only hosting:prod"
  },
  "configurations": {
    "production": {},
    "beta": {
      "command": "npx firebase deploy --only hosting:beta"
    }
  },
  "defaultConfiguration": "production"
}
```

Default `params: "ignore"` means `build` always runs its `defaultConfiguration: production`,
which is what both channels want (same production artifact, different hosting target per
`.firebaserc`). CI's `--configuration=production` invocation works either way.

### Revised verdict matrix

| # | Verdict | Implementer action |
|---|---------|---------------------|
| 1 | Confirmed (advisory, not blocking) | Rename, or eliminate via Finding 2 |
| 2 | Confirmed | Adopt `provideFirebase()` |
| 3 | **Rejected** — premise incorrect | Keep `technical-design.md` parity guard; no try/catch |
| 4 | Confirmed | Keep `defer`; log as intentional change |
| 5 | Recommendation confirmed, rationale corrected | Use the rxfire-style port as written |
| 6 | Direction confirmed, snippet corrected | `dependsOn` without `params: "forward"` (see above) |
| 7 | Confirmed | Keep the cast for parity |
| 8 | Confirmed | Remove root `firebase-functions` in Phase 6 |
| 9 | Confirmed | Optional: add user-datasource spec in Phase 3e |
| 10 | Confirmed | Add options param + generic typing |

### Revised conclusion

The plan remains sound and executable. The only naming item to resolve before execution is
Finding 1 (cleanest via Finding 2's `provideFirebase()`). Finding 3 should be **removed**
from the action list — the design doc's HMR handling is already correct parity. Finding 6
should be applied in the corrected form above. Everything else stands as written.
