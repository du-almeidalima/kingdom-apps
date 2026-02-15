---
applyTo:
  - "**/repositories/**"
  - "**/*datasource*.ts"
  - "**/*repository*.ts"
instruction: "Apply when working with Firestore data access."
---

# Firestore Patterns

## Frontend (Angular + @angular/fire)
```typescript
import { Firestore, collection, collectionData } from '@angular/fire/firestore';

export class MyService {
  private readonly firestore = inject(Firestore);

  getAll(): Observable<Item[]> {
    const ref = collection(this.firestore, 'items');
    return collectionData(ref, { idField: 'id' }) as Observable<Item[]>;
  }
}
```

## Repository Pattern
Place repositories in `app/repositories/`:
- `entity.repository.ts` - Interface
- `firebase/firebase-entity-datasource.service.ts` - Implementation

## Converters
Use `firebase-entity-converter.ts` for type safety.
