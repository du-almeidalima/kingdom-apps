# Technical design — vanilla Firebase JS SDK behind the existing repositories

Owner of the target design. Behavior contracts come from
[current-state-audit.md](./current-state-audit.md) §3; goals/constraints from
[requirements.md](./requirements.md).

## 1. Shape of the change

```
before:  app.config.ts ──provideFirebaseApp/Auth/Firestore/Functions──▶ @angular/fire tokens
         datasources ──inject(Auth|Firestore|Functions)──▶ AF RxJS wrappers (authState, docData,
                                                            collectionData, httpsCallableData)
                                                            over re-exported SDK functions

after:   app.config.ts ──FIREBASE_* factory providers──▶ vanilla instances (single module)
         datasources ──inject(FIREBASE_AUTH|FIRESTORE|FUNCTIONS)──▶ same SDK functions from
                                                            firebase/* + local interop helpers
                                                            (authState$, docData$, collectionData$,
                                                             httpsCallableData$)
```

Pages, BOs, guards (except the inert pipe removal), and repository interfaces are untouched.

## 2. DI: one provider module, four tokens

New file `src/app/repositories/firebase/firebase.providers.ts` (lives next to the
datasources it serves):

```typescript
import { InjectionToken, inject, provideAppInitializer } from '@angular/core';
import { FirebaseApp, getApp, initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth, signInWithCustomToken } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { connectFunctionsEmulator, Functions, getFunctions } from 'firebase/functions';
import { environment } from '../../../environments/environment';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP');
export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');
export const FIRESTORE = new InjectionToken<Firestore>('FIRESTORE');
export const FUNCTIONS = new InjectionToken<Functions>('FUNCTIONS');

/** true when running against local emulators (dev build, cloud disabled). */
const useEmulators = environment.env === 'development' && !environment.useCloud;

export const FIREBASE_PROVIDERS = [
  { provide: FIREBASE_APP, useFactory: () => initializeApp(environment.firebase) },
  {
    provide: FIREBASE_AUTH,
    useFactory: () => {
      const auth = getAuth();
      // HMR: return the already-initialized instance on hot reloads
      // @ts-expect-error private field, mirrors the previous app.config guard
      if (auth['_isInitialized']) {
        return auth;
      }

      if (useEmulators) {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        // Same dev-only e2e bridge as before — exact same shape.
        window.__E2E__ = { auth, signInWithCustomToken };
      }
      return auth;
    },
  },
  {
    provide: FIRESTORE,
    useFactory: () => {
      const firestore = initializeFirestore(getApp(), {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
      if (useEmulators) {
        // @ts-expect-error private field, mirrors the previous app.config guard
        if (firestore['_initialized']) {
          return firestore;
        }
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      }
      return firestore;
    },
  },
  {
    provide: FUNCTIONS,
    useFactory: () => {
      const functions = getFunctions();
      if (useEmulators) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
      }
      return functions;
    },
  },
  // Force eager init before the router/guards run, matching the old bootstrap timing
  // (AuthService subscribes authState from its constructor).
  provideAppInitializer(() => {
    inject(FIREBASE_APP);
    inject(FIREBASE_AUTH);
    inject(FIRESTORE);
    inject(FUNCTIONS);
  }),
];
```

`app.config.ts` replaces the five `provide*` blocks with `...FIREBASE_PROVIDERS`.

Design notes:

- **Token names** deliberately avoid `Firestore`/`Auth`/`Functions` (they'd collide with
  the SDK *types* used in signatures). `FIRESTORE` reads as the instance; type annotations
  keep importing the SDK types.
- **`provideAppInitializer`** (Angular 21 API) touches every token so the Firebase app,
  auth listener, persistence, and emulator connections exist before routing/auth guards —
  the same effective timing the `provideX` blocks had. Without it, factory providers are
  lazy (first `inject`) which would still work for datasources but delays auth emulator
  setup relative to today; keep the initializer for parity.
- The `console.log('emulador')` debug artifact is **not** ported.
- Remote config provider is dropped (unused).

## 3. Bootstrap migration (app.config.ts)

- Remove `provideFirebaseApp`, `provideAuth`, `provideFirestore`, `provideFunctions`,
  `provideRemoteConfig` and their imports; spread `FIREBASE_PROVIDERS`.
- Everything else in `appConfig` (theme, router, service worker, `REPOSITORIES_PROVIDERS`)
  is untouched.

## 4. RxJS interop helpers (replace the four AF wrappers)

New file `src/app/repositories/firebase/firebase-rxjs-interop.ts`. These four helpers are
the **only** new "framework" code; datasources call them exactly where they called the AF
wrappers. Semantics are specified to match `@angular/fire`'s implementations.

```typescript
import { Observable } from 'rxjs';
import { defer, from, map } from 'rxjs';
import { Auth, User } from 'firebase/auth';
import { Functions, httpsCallable } from 'firebase/functions';
import {
  collection,
  CollectionReference,
  doc,
  DocumentData,
  DocumentReference,
  Firestore,
  onSnapshot,
  Query,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

/**
 * Live Firebase auth state. Replaces @angular/fire's `authState`.
 * Emits the current user (or null) immediately on subscribe, then on every change.
 * Never errors, never completes; unsubscribing detaches the listener.
 */
export const authState$ = (auth: Auth): Observable<User | null> =>
  new Observable<User | null>((subscriber) =>
    onAuthStateChangedAdapter(auth, (user) => subscriber.next(user)),
  );

/**
 * Live document snapshots. Replaces @angular/fire's `docData`.
 * Emits `snapshot.data()` (through the reference's converter), or `undefined` when the
 * document does not exist, on every snapshot. `idField` mirrors AF's option.
 */
export const docData$ = <T>(reference: DocumentReference<T, unknown>, options?: { idField?: string }): Observable<T | undefined> =>
  new Observable<T | undefined>((subscriber) =>
    onSnapshot(reference, {
      next: (snapshot) =>
        subscriber.next(
          snapshot.exists()
            ? ({ ...snapshot.data(), ...(options?.idField ? { [options.idField]: snapshot.id } : {}) } as T)
            : undefined,
        ),
      error: (err) => subscriber.error(err),
    }),
  );

/**
 * Live query snapshots. Replaces @angular/fire's `collectionData`.
 * Emits the mapped document data of every snapshot. `from(collectionData(q))` call sites
 * switch to `collectionData$(q)` — identical observable semantics (from() of an Observable
 * is a transparent subscribe).
 */
export const collectionData$ = <T>(q: Query<T, unknown>, options?: { idField?: string }): Observable<T[]> =>
  new Observable<T[]>((subscriber) =>
    onSnapshot(q, {
      next: (snapshot) =>
        subscriber.next(snapshot.docs.map((d: QueryDocumentSnapshot<T>) => mapDoc(d, options?.idField))),
      error: (err) => subscriber.error(err),
    }),
  );

/**
 * Cold observable callables. Replaces @angular/fire's `httpsCallableData`.
 * The returned function produces an Observable that invokes the callable **on subscribe**
 * and unwraps `result.data` — matching AF's laziness contract (see §5).
 */
export const httpsCallableData$ =
  <T = unknown, R = unknown>(functions: Functions, name: string) =>
  (data: T): Observable<R> => {
    const callable = httpsCallable(functions, name);
    return defer(() => from(callable(data) as Promise<{ data: R }>).pipe(map((result) => result.data)));
  };
```

(`onAuthStateChangedAdapter` and `mapDoc` are trivial: import `onAuthStateChanged` from
`firebase/auth` and return the unsubscribe function as the Observable teardown;
`mapDoc` spreads `idField` when provided. The snippets above are the contract — the
implementer finalizes typing details against the SDK's generic signatures.)

### Semantics checklist (must hold in helper unit tests)

| Helper | Contract |
| --- | --- |
| `authState$` | synchronous-ish first emission with current state; subsequent emissions on sign-in/out; teardown unsubscribes (assert the `onAuthStateChanged` unsubscribe was called); no error/completion paths. |
| `docData$` | emits data on initial snapshot and every subsequent one; `undefined` when `exists()` is false; `idField` merge; teardown unsubscribes the listener. |
| `collectionData$` | emits arrays on every snapshot; empty array for empty results (this is what the assign-page "empty congregation" path relies on); teardown unsubscribes. |
| `httpsCallableData$` | not executed until subscribe; re-subscription re-invokes; unwraps `.data`. |
| converters | untouched — refs keep `.withConverter(...)`, so `snapshot.data()` returns domain objects with `Timestamp` fields that the existing converters map to `Date`. |

### What is explicitly *not* wrapped

- One-shot reads: call sites keep `from(getDoc(...))`, `from(getDocs(...))`, etc. — those
  SDK functions are already imported today and return promises.
- `onSnapshot` options: AF wrappers use default `includeMetadataChanges: false`; the
  helpers must not enable metadata changes.

## 5. Laziness/eagerness rules (do not "fix" these)

- Callables (`deleteUser`, `provisionUserFromInvite`): **cold** — `defer` is mandatory.
  `FirebaseUserDatasourceService.delete()` logs before the callable and documents the
  cold-observable dependency; the users-page flow relies on subscribe-time execution.
- Write paths already wrapped in `defer(...)`: keep the wrapper, only swap the import.
- Eager paths stay eager: `from(signInWithPopup(...))` (popup opens at call time),
  `from(setDoc(...))` in `add` methods. Do not introduce `defer` where there is none.

## 6. API mapping table (datasource edits are mechanical after the helpers)

| `@angular/fire/...` import | Replacement |
| --- | --- |
| `app`: `initializeApp`, `getApp` | `firebase/app` (same names) |
| `auth`: `Auth`, `getAuth`, `connectAuthEmulator`, `signInWithPopup`, `signInWithCustomToken`, `signOut`, `GoogleAuthProvider`, `OAuthProvider`, `UserCredential` | `firebase/auth` (same names) |
| `auth`: `authState(auth)` | `authState$(auth)` helper |
| `firestore`: every function/type currently imported except the two wrappers | `firebase/firestore` (same names — pure re-export swap) |
| `firestore`: `docData(ref, {idField})` | `docData$(ref, {idField})` helper |
| `firestore`: `collectionData(q)` (always inside `from(...)`) | `collectionData$(q)` (drop the `from`) |
| `functions`: `Functions`, `getFunctions`, `connectFunctionsEmulator` | `firebase/functions` (same names) |
| `functions`: `httpsCallableData(fn, name)` | `httpsCallableData$(fn, name)` helper — **same call shape** (`this.deleteUserFn(userId)` returns the cold Observable) |
| `auth-guard`: `redirectUnauthorizedTo` | delete (inert — audit §6) |
| `remote-config` | delete (unused — audit §5) |
| `inject(Auth)`, `inject(Firestore)`, `inject(Functions)` | `inject(FIREBASE_AUTH)`, `inject(FIRESTORE)`, `inject(FUNCTIONS)` |

Type support: no new `any`. Where casts exist today (e.g.
`collection(...) as CollectionReference<User, FirebaseUserModel>`, `docData(...) as
Observable<Congregation | undefined>`), keep equivalent casts at the same sites. Optional
improvement (allowed, not required): use Firebase 12's typed collection helpers where they
remove a cast — never at the cost of signature changes.

## 7. Zoneless note

Nothing changes for change detection: listeners still push into RxJS streams consumed via
`AsyncPipe` (which marks views for check) and signals fed from subscribe callbacks. The
vanilla SDK never touches `NgZone`; do not introduce it.

## 8. Test design

- Helper specs (new): `firebase-rxjs-interop.spec.ts` asserts the §4 semantics checklist
  with jest-mocked `firebase/auth`/`firebase/firestore`/`firebase/functions` (fake
  `onSnapshot`/`onAuthStateChanged` capturing the teardown functions, fake `httpsCallable`).
- Datasource specs: same structure as today, with two changes —
  `jest.mock('@angular/fire/firestore')` → `jest.mock('firebase/firestore')` (same partial
  mock list) and `MockProvider(Firestore)` → `MockProvider(FIRESTORE)` (likewise
  `Auth`/`Functions`). Where a spec mocks `docData`/`collectionData` directly, it instead
  mocks the interop helper module or provides the listener behavior — prefer spying on the
  helper module so the datasource path under test stays real.
- No page/BO/guard spec changes (they never see Firebase).

## 9. Deploy target design

```jsonc
// apps/ministry-maps/project.json
"deploy": {
  "executor": "nx:run-commands",
  "options": {
    "command": "npx nx build ministry-maps --configuration=production && npx firebase deploy --only hosting:prod"
  },
  "configurations": {
    "production": {}
  },
  "defaultConfiguration": "production"
}
```

- Keeps the target name (`deploy`) so CI discovery (`select(.targets.deploy != null)`)
  still finds it, and keeps a `production` default configuration.
- firebase-tools authenticates with the existing `FIREBASE_TOKEN` env/secret; hosting
  targets/headers/rewrites already live in `firebase.json` + `.firebaserc`.
- Local verification: `firebase deploy --only hosting:prod --dry-run` after a production
  build. Update `.agents/rules/deployment.md` wording (`npx nx deploy ministry-maps` keeps
  working — the rule's `@angular/fire:deploy` annotation is what changes).
