---
applyTo:
  - "**/*.service.ts"
  - "**/services/**"
  - "**/state/**/*.ts"
instruction: "Apply these rules when creating or modifying Angular services and state management."
---

# Angular Services & State Management

## Service Creation

### Use `@Injectable` with `providedIn`
```typescript
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root' // or 'platform' or specific module
})
export class MyService {
  private readonly http = inject(HttpClient);
}
```

### Service Types

#### 1. Data Services (Repositories)
Handle data fetching and manipulation:

```typescript
@Injectable({
  providedIn: 'root'
})
export class TerritoryDataService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/territories';

  getAll(): Observable<Territory[]> {
    return this.http.get<Territory[]>(this.baseUrl);
  }

  getById(id: string): Observable<Territory> {
    return this.http.get<Territory>(`${this.baseUrl}/${id}`);
  }

  create(territory: Territory): Observable<Territory> {
    return this.http.post<Territory>(this.baseUrl, territory);
  }

  update(id: string, territory: Partial<Territory>): Observable<Territory> {
    return this.http.patch<Territory>(`${this.baseUrl}/${id}`, territory);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
```

#### 2. State Services
Manage application state:

```typescript
@Injectable({
  providedIn: 'root'
})
export class UserStateService {
  private readonly userSubject = new BehaviorSubject<User | null>(null);
  readonly user$ = this.userSubject.asObservable();

  setUser(user: User): void {
    this.userSubject.next(user);
  }

  clearUser(): void {
    this.userSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.userSubject.value;
  }
}
```

#### 3. Business Logic Services
Encapsulate domain logic:

```typescript
@Injectable({
  providedIn: 'root'
})
export class TerritoryCalculationService {
  calculateCoverage(territory: Territory): number {
    // Complex business logic
    return Math.round(territory.visited / territory.total * 100);
  }

  isOverdue(territory: Territory): boolean {
    const lastVisit = new Date(territory.lastVisitDate);
    const now = new Date();
    const monthsDiff = (now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsDiff > 6;
  }
}
```

## Dependency Injection with `inject()`

### Always Use `inject()` Function
```typescript
// ✅ CORRECT
export class MyService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly firestore = inject(Firestore);
}

// ❌ WRONG
export class MyService {
  constructor(
    private http: HttpClient,
    private router: Router,
    private firestore: Firestore
  ) {}
}
```

### Optional Dependencies
```typescript
export class MyService {
  private readonly logger = inject(LoggerService, { optional: true });

  log(message: string): void {
    this.logger?.log(message);
  }
}
```

## State Management

### 1. Using RxJS BehaviorSubject

#### Basic State Service
```typescript
@Injectable({
  providedIn: 'root'
})
export class ConfigurationState {
  private readonly configSubject = new BehaviorSubject<Config | null>(null);
  readonly config$ = this.configSubject.asObservable();

  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();

  setConfig(config: Config): void {
    this.configSubject.next(config);
  }

  updateConfig(partial: Partial<Config>): void {
    const current = this.configSubject.value;
    if (current) {
      this.configSubject.next({ ...current, ...partial });
    }
  }

  setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }
}
```

#### Advanced State with Derived Streams
```typescript
@Injectable({
  providedIn: 'root'
})
export class TerritoryState {
  private readonly territoriesSubject = new BehaviorSubject<Territory[]>([]);
  readonly territories$ = this.territoriesSubject.asObservable();

  readonly assignedTerritories$ = this.territories$.pipe(
    map(territories => territories.filter(t => t.assignedTo))
  );

  readonly availableTerritories$ = this.territories$.pipe(
    map(territories => territories.filter(t => !t.assignedTo))
  );

  readonly territoryCount$ = this.territories$.pipe(
    map(territories => territories.length)
  );

  setTerritories(territories: Territory[]): void {
    this.territoriesSubject.next(territories);
  }

  addTerritory(territory: Territory): void {
    const current = this.territoriesSubject.value;
    this.territoriesSubject.next([...current, territory]);
  }

  updateTerritory(id: string, update: Partial<Territory>): void {
    const current = this.territoriesSubject.value;
    const updated = current.map(t =>
      t.id === id ? { ...t, ...update } : t
    );
    this.territoriesSubject.next(updated);
  }

  removeTerritory(id: string): void {
    const current = this.territoriesSubject.value;
    this.territoriesSubject.next(current.filter(t => t.id !== id));
  }
}
```

### 2. Using Signals (Angular 16+)

#### Signal-Based State
```typescript
import { signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CartState {
  // State signals
  private readonly items = signal<CartItem[]>([]);
  private readonly loading = signal(false);

  // Public readonly accessors
  readonly $items = this.items.asReadonly();
  readonly $loading = this.loading.asReadonly();

  // Computed values
  readonly totalItems = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly totalPrice = computed(() =>
    this.items().reduce((sum, item) => sum + (item.price * item.quantity), 0)
  );

  // State mutations
  addItem(item: CartItem): void {
    this.items.update(current => [...current, item]);
  }

  removeItem(id: string): void {
    this.items.update(current => current.filter(item => item.id !== id));
  }

  updateQuantity(id: string, quantity: number): void {
    this.items.update(current =>
      current.map(item => item.id === id ? { ...item, quantity } : item)
    );
  }

  clear(): void {
    this.items.set([]);
  }

  setLoading(loading: boolean): void {
    this.loading.set(loading);
  }
}
```

### When to Use RxJS vs Signals

**Use RxJS when:**
- Complex async operations
- HTTP requests
- Multiple data streams that need combining
- Need operators like `debounceTime`, `switchMap`, `combineLatest`
- WebSocket or real-time data
- Need to unsubscribe/cancel operations

**Use Signals when:**
- Simple synchronous state
- Derived/computed values
- Frequent updates
- Template bindings
- Performance is critical

## Firebase Integration

### Firestore Service
```typescript
import { inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TerritoryFirestoreService {
  private readonly firestore = inject(Firestore);
  private readonly collectionName = 'territories';

  getAll(): Observable<Territory[]> {
    const ref = collection(this.firestore, this.collectionName);
    return collectionData(ref, { idField: 'id' }) as Observable<Territory[]>;
  }

  getById(id: string): Observable<Territory> {
    const ref = doc(this.firestore, this.collectionName, id);
    return docData(ref, { idField: 'id' }) as Observable<Territory>;
  }

  async create(territory: Omit<Territory, 'id'>): Promise<void> {
    const ref = doc(collection(this.firestore, this.collectionName));
    await setDoc(ref, territory);
  }

  async update(id: string, update: Partial<Territory>): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, id);
    await updateDoc(ref, update);
  }

  async delete(id: string): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, id);
    await deleteDoc(ref);
  }
}
```

### Firebase Auth Service
```typescript
import { inject } from '@angular/core';
import { Auth, authState, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly auth = inject(Auth);
  readonly authState$ = authState(this.auth);

  async signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }
}
```

## Service Patterns

### Loading State Pattern
```typescript
@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly http = inject(HttpClient);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();

  getData(): Observable<Data[]> {
    this.loadingSubject.next(true);
    return this.http.get<Data[]>('/api/data').pipe(
      finalize(() => this.loadingSubject.next(false))
    );
  }
}
```

### Error Handling Pattern
```typescript
@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly http = inject(HttpClient);
  private readonly errorSubject = new Subject<string>();
  readonly error$ = this.errorSubject.asObservable();

  getData(): Observable<Data[]> {
    return this.http.get<Data[]>('/api/data').pipe(
      catchError(error => {
        this.errorSubject.next(error.message);
        return of([]);
      })
    );
  }
}
```

### Caching Pattern
```typescript
@Injectable({
  providedIn: 'root'
})
export class CachedDataService {
  private readonly http = inject(HttpClient);
  private cache$?: Observable<Data[]>;

  getData(forceRefresh = false): Observable<Data[]> {
    if (!this.cache$ || forceRefresh) {
      this.cache$ = this.http.get<Data[]>('/api/data').pipe(
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.cache$;
  }

  clearCache(): void {
    this.cache$ = undefined;
  }
}
```

## Testing Services

### Basic Service Test
```typescript
import { TestBed } from '@angular/core/testing';
import { MyService } from './my-service.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
```

### Testing with HTTP
```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DataService } from './data.service';

describe('DataService', () => {
  let service: DataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DataService]
    });
    service = TestBed.inject(DataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch data', () => {
    const mockData = [{ id: '1', name: 'Test' }];

    service.getData().subscribe(data => {
      expect(data).toEqual(mockData);
    });

    const req = httpMock.expectOne('/api/data');
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });
});
```

## Best Practices

1. **Single Responsibility** - One service, one purpose
2. **Use `inject()`** - Not constructor injection
3. **Immutable State** - Don't mutate state directly
4. **Type Safety** - Use proper TypeScript types
5. **Error Handling** - Handle errors appropriately
6. **Clean Up** - Complete subjects in ngOnDestroy if needed
7. **Avoid Service Logic in Components** - Keep components thin
8. **Use `providedIn: 'root'`** - For singletons

## Checklist

Before committing a service:
- ✅ Uses `@Injectable({ providedIn: 'root' })`
- ✅ Uses `inject()` for dependencies
- ✅ File name: `service-name.service.ts`
- ✅ Proper error handling
- ✅ Observable streams use proper operators
- ✅ State is immutable
- ✅ Tests exist and pass
- ✅ Located in correct folder
- ✅ Path aliases used for imports
