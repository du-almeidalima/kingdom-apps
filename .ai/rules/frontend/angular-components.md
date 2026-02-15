---
applyTo:
  - "**/*.component.ts"
  - "**/*.component.html"
  - "**/*.component.scss"
  - "**/components/**"
instruction: "Apply these rules when creating or modifying Angular components."
---

# Angular Component Guidelines

## Component Creation Rules

### 1. Always Create Standalone Components
All new components MUST be standalone. No NgModules.

```typescript
// ✅ CORRECT
@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  templateUrl: './my-component.component.html',
  styleUrls: ['./my-component.component.scss']
})
export class MyComponent {}
```

```typescript
// ❌ WRONG - No NgModule declarations
@NgModule({
  declarations: [MyComponent],
  imports: [CommonModule]
})
export class MyModule {}
```

### 2. Use `inject()` for Dependency Injection
**NEVER** use constructor injection. Always use the `inject()` function.

```typescript
// ✅ CORRECT
import { inject } from '@angular/core';

export class MyComponent {
  private readonly myService = inject(MyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
}
```

```typescript
// ❌ WRONG
export class MyComponent {
  constructor(
    private myService: MyService,
    private route: ActivatedRoute,
    private router: Router
  ) {}
}
```

### 3. File Naming Convention
Use `kebab-case` for all component files:

- Component: `my-component.component.ts`
- Template: `my-component.component.html`
- Styles: `my-component.component.scss`
- Tests: `my-component.component.spec.ts`

### 4. Component Selectors
Use consistent prefixes:
- App components: `app-` prefix
- Common-UI components: `kui-` prefix

```typescript
// App component
@Component({
  selector: 'app-territory-card'
})

// Common-UI component
@Component({
  selector: 'kui-button'
})
```

## Component Structure

### Recommended Component Organization

```typescript
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush // Prefer OnPush
})
export class ExampleComponent implements OnInit, OnDestroy {
  // 1. Inputs
  @Input() data: string = '';
  @Input() config?: Config;

  // 2. Outputs
  @Output() itemClicked = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  // 3. Injected Dependencies
  private readonly myService = inject(MyService);
  private readonly destroyRef = inject(DestroyRef);

  // 4. Public Properties
  items: Item[] = [];
  isLoading = false;

  // 5. Private Properties
  private cache = new Map<string, any>();

  // 6. Lifecycle Hooks
  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  // 7. Public Methods
  onItemClick(item: Item): void {
    this.itemClicked.emit(item.id);
  }

  // 8. Private Methods
  private loadData(): void {
    this.myService.getData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        this.items = data;
      });
  }
}
```

## Change Detection

### Use OnPush Strategy
Prefer `OnPush` change detection for better performance:

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyComponent {}
```

### When to use Default
- Component has complex internal state changes
- Working with third-party libraries that mutate data
- Rapid prototyping (but refactor to OnPush later)

## Lifecycle Hooks

### Implement Interfaces
Always implement lifecycle hook interfaces:

```typescript
import { OnInit, OnDestroy, AfterViewInit } from '@angular/core';

export class MyComponent implements OnInit, OnDestroy, AfterViewInit {
  ngOnInit(): void {}
  ngOnDestroy(): void {}
  ngAfterViewInit(): void {}
}
```

### Common Lifecycle Hooks
- `OnInit` - Component initialization logic
- `OnDestroy` - Cleanup (unsubscribe, clear timers)
- `AfterViewInit` - DOM-dependent logic
- `OnChanges` - React to @Input() changes

## Unsubscribing from Observables

### Use `takeUntilDestroyed()`
Modern Angular approach (Angular 16+):

```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export class MyComponent {
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.myService.data$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        // Handle data
      });
  }
}
```

### Alternative: Manual Cleanup
If not using `takeUntilDestroyed`:

```typescript
private subscription = new Subscription();

ngOnInit(): void {
  this.subscription.add(
    this.myService.data$.subscribe(data => {
      // Handle data
    })
  );
}

ngOnDestroy(): void {
  this.subscription.unsubscribe();
}
```

## Template Best Practices

### Use Async Pipe
Prefer async pipe for observables:

```html
<!-- ✅ CORRECT -->
<div *ngIf="data$ | async as data">
  {{ data.name }}
</div>

<!-- ❌ AVOID -->
<div *ngIf="data">
  {{ data.name }}
</div>
```

### Use trackBy for *ngFor
Always provide trackBy function for lists:

```html
<div *ngFor="let item of items; trackBy: trackById">
  {{ item.name }}
</div>
```

```typescript
trackById(index: number, item: Item): string {
  return item.id;
}
```

### Avoid Logic in Templates
Move complex logic to component:

```typescript
// ✅ CORRECT
get displayName(): string {
  return this.user?.firstName + ' ' + this.user?.lastName || 'Guest';
}
```

```html
<p>{{ displayName }}</p>
```

## Signals (Angular 16+)

### When to Use Signals
Use signals for simple reactive state:

```typescript
import { signal, computed } from '@angular/core';

export class MyComponent {
  // Simple state
  count = signal(0);
  name = signal('');

  // Computed values
  doubleCount = computed(() => this.count() * 2);

  increment(): void {
    this.count.update(c => c + 1);
  }
}
```

### Template Usage
```html
<p>Count: {{ count() }}</p>
<p>Double: {{ doubleCount() }}</p>
<button (click)="increment()">Increment</button>
```

### When to Use RxJS Instead
- Complex async operations
- HTTP requests
- Multiple data streams
- Need operators like `debounceTime`, `switchMap`, etc.

## Component Location

### Apps (`apps/ministry-maps/src/app/`)
Place component in appropriate folder:

```
app/
├── core/features/          # Core feature components (auth, etc.)
├── features/               # Feature-specific components
│   ├── territory/
│   │   ├── components/    # Feature components
│   │   └── pages/         # Page components
├── shared/components/      # App-wide shared components
```

### Common-UI (`libs/common-ui/`)
Only if component is:
- ✅ Generic and reusable
- ✅ UI-focused (no business logic)
- ✅ Configurable via inputs
- ❌ NOT app-specific
- ❌ NOT tied to domain models

## Component Types

### Smart (Container) Components
- Manage data and state
- Communicate with services
- Pass data to presentation components
- Located in `pages/` or feature root

```typescript
@Component({
  selector: 'app-territory-page',
  template: `
    <app-territory-list
      [territories]="territories$ | async"
      (territorySelected)="onSelect($event)">
    </app-territory-list>
  `
})
export class TerritoryPageComponent {
  private readonly territoryService = inject(TerritoryService);
  territories$ = this.territoryService.getAll();

  onSelect(territory: Territory): void {
    // Handle selection
  }
}
```

### Dumb (Presentation) Components
- Receive data via @Input()
- Emit events via @Output()
- No service dependencies
- Located in `components/`

```typescript
@Component({
  selector: 'app-territory-list',
  template: `
    <div *ngFor="let territory of territories; trackBy: trackById"
         (click)="territorySelected.emit(territory)">
      {{ territory.name }}
    </div>
  `
})
export class TerritoryListComponent {
  @Input() territories: Territory[] = [];
  @Output() territorySelected = new EventEmitter<Territory>();

  trackById(index: number, territory: Territory): string {
    return territory.id;
  }
}
```

## Testing Components

### Basic Test Structure
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyComponent } from './my-component.component';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent], // Standalone component
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit event when clicked', () => {
    spyOn(component.itemClicked, 'emit');
    component.onItemClick({ id: '1', name: 'Test' });
    expect(component.itemClicked.emit).toHaveBeenCalledWith('1');
  });
});
```

## Common Patterns

### Form Handling
```typescript
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule]
})
export class MyFormComponent {
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]]
  });

  onSubmit(): void {
    if (this.form.valid) {
      console.log(this.form.value);
    }
  }
}
```

### Route Parameters
```typescript
export class DetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = params['id'];
        // Load data
      });
  }
}
```

### Dialog/Modal
```typescript
import { Dialog } from '@angular/cdk/dialog';

export class MyComponent {
  private readonly dialog = inject(Dialog);

  openDialog(): void {
    const dialogRef = this.dialog.open(MyDialogComponent, {
      data: { /* data */ }
    });

    dialogRef.closed.subscribe(result => {
      // Handle result
    });
  }
}
```

## Performance Tips

1. **Use OnPush change detection**
2. **Use trackBy in *ngFor**
3. **Avoid function calls in templates**
4. **Use async pipe for observables**
5. **Lazy load features**
6. **Unsubscribe from observables**
7. **Use pure pipes**
8. **Avoid deep object changes detection**

## Checklist

Before committing a component:
- ✅ Standalone component
- ✅ Uses `inject()` for DI
- ✅ File names in `kebab-case`
- ✅ Proper selector prefix (`app-` or `kui-`)
- ✅ OnPush change detection (if possible)
- ✅ Lifecycle interfaces implemented
- ✅ Observables properly unsubscribed
- ✅ Template uses trackBy for lists
- ✅ Component test exists and passes
- ✅ Located in correct folder
- ✅ Path aliases used for imports
