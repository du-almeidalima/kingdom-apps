---
globs:
- '**/repositories/**'
description: The repository pattern — abstract repositories bound to Firebase datasources via providers.
---

# Repository Pattern

## Structure

```
app/repositories/
├── <entity>.repository.ts                        # abstract class — the DI token
├── repositories-providers.ts                     # { provide, useClass } bindings → app.config.ts
└── firebase/
    └── firebase-<entity>-datasource.service.ts   # implementation (+ .spec.ts)
```

## Contract

```typescript
export abstract class TerritoryRepository {
  abstract getAll(): Observable<Territory[]>;
  abstract getById(id: string): Observable<Territory | undefined>;
}

@Injectable()
export class FirebaseTerritoryDatasourceService implements TerritoryRepository, FirebaseDatasource<Territory> {
  // Observables only; from() for promises; cache-first reads — see firebase-user-datasource.service.ts
}
```

## Registration

```typescript
// repositories-providers.ts — spread into appConfig.providers
export const REPOSITORIES_PROVIDERS = [
  { provide: TerritoryRepository, useClass: FirebaseTerritoryDatasourceService },
];
```

Tests provide the mirror `MOCK_REPOSITORIES_PROVIDERS` from `src/test/mocks/providers/` (built on the `*RepositoryMock` classes in `src/test/mocks/models/`).

New entity flow: abstract repository → Firebase datasource → provider entry → mock entry — all four in the same change.
