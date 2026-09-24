---
globs:
  - '**/repositories/**'
  - '**/*datasource*.ts'
  - '**/*repository*.ts'
description: Firestore — the datasource-only access rule, dual models, converters, and security rules.
---

# Firestore Patterns

## Only datasources touch Firestore

No component, page, or BO calls `collection()`/`collectionData$()` directly. All reads/writes go through Firebase datasource services implementing abstract repositories (`.agents/rules/angular-services.md`, `.agents/rules/repositories.md`). Ids come from converters (`snapshot.id`) — `{ idField: 'id' }` is not used. The vanilla SDK is driven through the DI tokens and RxJS interop helpers in `repositories/firebase/firebase-providers.ts` / `firebase-rxjs-interop.ts`.

## Dual models

- Domain model (`User`) in `src/models/`; Firestore variant (`FirebaseUserModel`) in `src/models/firebase/` — relations stored as `DocumentReference` (user → congregation), resolved inside datasources (missing congregations become `EMPTY_CONGREGATION`).
- Converters: `firebaseEntityConverterFactory<T>` + `removeUndefined` (`shared/utils/firebase-entity-converter.ts`). The timestamp converter factory is `@deprecated` — not for new code.
- Dates are Firestore `Timestamp`s; converters expose `Date`s.

## Registration

`repositories-providers.ts` binds abstract → datasource; tests use the mirror `MOCK_REPOSITORIES_PROVIDERS` (`src/test/mocks/providers/`). The `NoteRepository` / `repositories/db/` datasource is WIP and commented out of the providers.

## Security rules (`firestore.rules`)

- `users` **create is denied** — `provisionUserFromInvite` (Admin SDK, bypasses rules) is the only creation path, so roles can't be forged client-side.
- Helpers: `callerRoleIn()`, `sameCongregationAsCaller()`, `isProtectedRole()`, `unchanged()`.
- Deliberately public: `designations`, `territories` (+ `history` subcollection read/update), `invitation_links` (read), `congregations` (read). Catch-all: auth-only, excluding `logs`/`users`.
- Deploy rules **after** functions; indexes live in `firestore.indexes.json`.

## Query limits

`in` queries max 10 items — batch and `forkJoin` (`TerritoryBO.batchGetTerritoriesInIds`).

## Emulators

Auth `9099`, Firestore `8080`, Functions `5001`, UI `4000`, projectId `du-ministry-maps`. Dev seed auto-imports/exports via `npm start`; E2E starts **empty** emulators and seeds via Admin SDK (`.agents/rules/e2e-testing.md`).
