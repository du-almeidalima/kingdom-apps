---
applyTo:
  - "**/repositories/**"
instruction: "Apply when working with repository pattern."
---

# Repository Pattern

## Structure
```
repositories/
├── entity.repository.ts              # Interface/abstract
└── firebase/
    └── firebase-entity-datasource.service.ts  # Implementation
```

## Example
```typescript
// entity.repository.ts
export abstract class EntityRepository {
  abstract getAll(): Observable<Entity[]>;
  abstract getById(id: string): Observable<Entity>;
  abstract create(entity: Entity): Promise<void>;
}

// firebase/firebase-entity-datasource.service.ts
@Injectable()
export class FirebaseEntityDatasource extends EntityRepository {
  private readonly firestore = inject(Firestore);
  
  getAll(): Observable<Entity[]> {
    // Firestore implementation
  }
}
```

## Registration

Register in `repositories-providers.ts`:
```typescript
export const REPOSITORIES_PROVIDERS = [
  { provide: EntityRepository, useClass: FirebaseEntityDatasource }
];
```
