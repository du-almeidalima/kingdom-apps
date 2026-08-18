---
globs:
- '**/*.service.ts'
- '**/services/**'
- '**/state/**/*.ts'
description: Services, state services, business objects (BOs), and the repository/datasource data-access layer.
---

# Services & State

There is **no HTTP/REST layer** — all I/O is Firebase (Firestore, Auth, callable Functions) behind repositories. Never inject `HttpClient`; never touch Firestore outside a datasource service.

## Layering

```
pages/components → BOs (domain use cases) → abstract repositories ← Firebase datasources
                        ↘ state services (UserStateService)           ↘ httpsCallableData (Functions)
```

## Repositories — abstract class + provider binding

```typescript
// app/repositories/user.repository.ts
export abstract class UserRepository {
  abstract getById(id: string): Observable<User | undefined>;
  abstract update(user: User): Observable<User>;
}

// app/repositories/repositories-providers.ts
export const REPOSITORIES_PROVIDERS = [
  { provide: UserRepository, useClass: FirebaseUserDatasourceService },
];
// spread into appConfig.providers (app.config.ts)
```

- Consumers inject the abstract token: `inject(TerritoryRepository)`.
- Adding a repository = abstract class + `firebase/firebase-<entity>-datasource.service.ts` + provider entry + mirrored mock in `src/test/mocks/providers/`.
- Naming drift: `territories.repository.ts` is plural; new ones use singular `<entity>.repository.ts`.

## Firebase datasources

Reference implementation: `repositories/firebase/firebase-user-datasource.service.ts`.

- Return **Observables only** — wrap promises with `from()`: `from(getDocFromServer(ref))`.
- `static readonly COLLECTION_NAME`; typed `CollectionReference<Model, FirebaseModel>` built in the constructor.
- Cache-first reads where sensible: `getDocFromCache` → fall back to server.
- Callables: `httpsCallableData(functions, 'deleteUser')` — **the export name in `functions/src/index.ts` is the callable name**; renaming breaks callers.
- `implements <Entity>Repository, FirebaseDatasource<T>` (`createDocumentRef`) — used to resolve cross-collection `DocumentReference`s (user → congregation).
- Strip `undefined` before writes with `removeUndefined`; convert via `firebaseEntityConverterFactory` (the timestamp factory is `@deprecated`).

## State services

```typescript
// state/user.state.service.ts
private readonly userSubject = new BehaviorSubject<User | null>(null);
public $user = this.userSubject.asObservable();   // $-prefix (not user$ suffix)
public get currentUser() { return this.userSubject.getValue(); }
public get isLoggedIn() { return !!this.userSubject.getValue(); }
```

- Components bridge to signals: `user = toSignal(this.userState.$user)`.
- Twins kept in sync by `AuthService`: `UserStateService` (app — full domain `User`) and `AuthUserStateService` (common-ui — `{roles, name}`).
- Cross-feature state → `app/state/`; UI-only, domain-free state → `lib/state/` in common-ui.

## Business Objects (BOs)

`features/<domain>/bo/<area>/<name>.bo.ts`, class suffix `BO` (one legacy outlier: `invite-bo.service.ts`).

- Bare `@Injectable()` **provided per consumer** (`providers: [TerritoryBO]` on the page) when stateful — several BOs deliberately cache; only stateless ones use `providedIn: 'root'`.
- Inject repositories + `UserStateService` + `LoggerService`; return **cold Observables**; `structuredClone` defensive copies before mutating (see `work.bo.ts`).
- Firestore `in` queries max 10 ids — batch and `forkJoin` (see `TerritoryBO.batchGetTerritoriesInIds`, `BATCH_SIZE = 10`).

## Errors and logging — split by layer

- BOs/services: `loggerService.error(...)` (Firestore-backed `LoggerService`) and return `EMPTY` on failure paths.
- User-facing: `ToasterService` from `@kingdom-apps/common-ui`, in component subscribe callbacks — `next: () => toaster.success(...)`, `error: () => toaster.error(...)`.

## Auth specifics

- OAuth popup only (`signInWithPopup`, Google/Microsoft) — no email/password flows.
- New users are provisioned **server-side only** via the `provisionUserFromInvite` callable; client-side `users` creation is denied by security rules.
- Loading flags are signals: `isAuthenticating = signal(false)` + `finalize(() => …)`.

## Unsubscribing

`takeUntilDestroyed(this.destroyRef)` in components; `destroyRef.onDestroy` for DOM listeners. Services do **not** implement `OnDestroy` to complete subjects — not the convention here.

## Testing

ng-mocks + `MOCK_REPOSITORIES_PROVIDERS` — see `.agents/rules/unit-testing.md`.
