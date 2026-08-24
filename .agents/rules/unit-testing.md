---
globs:
  - '**/*.spec.ts'
  - '**/test/**'
  - '**/jest.config.ts'
description: Apply these rules when writing unit tests. The project uses Jest + jest-preset-angular
  + ng-mocks.
---

# Unit Testing Guidelines

## Testing Framework

- **Framework:** Jest
- **Preset:** `jest-preset-angular`
- **Mocking:** `ng-mocks` (primary), `MockProvider` for services/BOs
- **Location:** `*.spec.ts` files next to implementation

## Test File Naming

```
component-name.component.spec.ts
service-name.service.spec.ts
entity-name.bo.spec.ts
pipe-name.pipe.spec.ts
```

## Global Test Setup

`apps/ministry-maps/src/test-setup.ts` configures the Zone env with strict template checking. `apps/ministry-maps/src/test/setup-test-mocks.ts` globally configures:

- `ngMocks.autoSpy('jest')` — all mocked methods become jest spies
- `ngMocks.defaultMock(Token, factory)` — global default mocks for app-wide repositories/services

Shared factory helpers like `mockBuilderFn<T>(base, partial)` and mock objects (`userMockBuilder`, `territoryMockBuilder`, etc.) live in `src/test/mocks/`.

## Component Tests — Use `MockBuilder` + `MockRender`

```typescript
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

describe('MyComponent', () => {
  // Simple: no dependencies
  beforeEach(() => MockBuilder(MyComponent));

  // With module: keep module declarations, mock dependencies
  beforeEach(() => MockBuilder(MyComponent, [MyModule]));

  it('creates', () => {
    const fixture = MockRender(MyComponent);
    expect(fixture.point.componentInstance).toBeTruthy();
  });

  it('with inputs', () => {
    const fixture = MockRender(MyComponent, { inputProp: value });
  });
});
```

### Adding providers

```typescript
beforeEach(() =>
  MockBuilder(MyComponent)
    .mock(UserStateService)
    .mock(ActivatedRoute)
    .provide(MOCK_REPOSITORIES_PROVIDERS)      // all repo mocks
    .provide(MockProvider(SomeService, { method: jest.fn() }))
    .provide({ provide: DialogRef, useValue: { close: jest.fn() } })
    .provide({ provide: DIALOG_DATA, useValue: { ... } })
);
```

### Per-test provider overrides

Pass providers as the 3rd arg to `MockRender`:

```typescript
const fixture = MockRender(
  MyComponent,
  {},
  {
    providers: [{ provide: DIALOG_DATA, useValue: { key: value } }],
  },
);
```

### `MockInstance` for per-test mock config

```typescript
MockInstance.scope(); // auto-reset after each test

it('configures mock', () => {
  MockInstance(SomeService, (instance) => {
    instance.method.mockReturnValue(of(value));
  });
  const fixture = MockRender(MyComponent);
});
```

### Interacting with the DOM

```typescript
const element = ngMocks.find(fixture, '#my-button');
ngMocks.click(element);

const select = ngMocks.find('select');
ngMocks.change(select, 'OPTION_VALUE');

const service = ngMocks.get(UserStateService);
service.setUser(null);
ngMocks.flushTestBed(); // re-init after state change
fixture.detectChanges(); // propagate changes
```

## Service Tests — Use `TestBed` + `MockProvider`

```typescript
describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MyService, MockProvider(DependencyService, { method: jest.fn() }), MockProvider(OtherService)],
    });
    service = TestBed.inject(MyService);
  });
});
```

For type-safe repository mocking, cast with `jest.Mocked`:

```typescript
let repo: jest.Mocked<MyRepository>;

beforeEach(() => {
  repo = ngMocks.get(MyRepository) as jest.Mocked<MyRepository>;
  repo.method.mockReturnValue(of(value));
});
```

## Business Object (BO) Tests — Use `TestBed` + `MockProvider`

Same pattern as service tests. BOs are pure Angular services with injected dependencies:

```typescript
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [MyBO, MockProvider(UserStateService), MockProvider(Repository, { method: () => of(mockData) })],
  });
  service = TestBed.inject(MyBO);
});
```

Use `expect.objectContaining()` / `expect.arrayContaining()` for partial matching. Use `done` callback for async observable tests.

## Pipe Tests — Pure Class Instantiation

No TestBed needed:

```typescript
describe('MyPipe', () => {
  it('transforms', () => {
    const pipe = new MyPipe();
    expect(pipe.transform(input)).toBe(expected);
  });
});
```

## Guard Tests — `TestBed.runInInjectionContext`

```typescript
TestBed.configureTestingModule({
  providers: [MockProvider(AuthService), MockProvider(UserStateService)],
});

const result = TestBed.runInInjectionContext(() => myGuard(route, state));
```

Mock route/state as minimal objects using `as never`. Guards can return `boolean | UrlTree | Observable<...>` — check type and subscribe if needed.

## Host Component Wrapper

For components that require specific structural context (e.g., form controls), define a host component in the spec file:

```typescript
@Component({
  template: `<form [formGroup]="form">
    <my-component formControlName="ctrl" />
  </form>`,
  imports: [MyComponent, ReactiveFormsModule],
})
class HostComponent {
  form = new FormGroup({ ctrl: new FormControl('') });
}

beforeEach(() => MockBuilder([MyComponent, HostComponent, ReactiveFormsModule]));
```

## Key `ng-mocks` API

| API                                   | Usage                     |
| ------------------------------------- | ------------------------- |
| `MockBuilder(Comp, Module)`           | Create testing module     |
| `MockRender(Comp, inputs, providers)` | Render component          |
| `ngMocks.get(Type)`                   | Get service from injector |
| `ngMocks.find(fixture, selector)`     | Find DOM element          |
| `ngMocks.click(el)`                   | Simulate click            |
| `ngMocks.change(el, value)`           | Simulate form change      |
| `ngMocks.flushTestBed()`              | Force TestBed re-init     |
| `MockProvider(Token, methods)`        | Mock provider             |
| `MockInstance(Token, callback)`       | Per-test mock config      |
| `MockInstance.scope()`                | Auto-reset mock instances |
| `fixture.point.componentInstance`     | Access component instance |

## Async Patterns

- Use `done` callback for observable-based tests
- Use `fakeAsync` / `tick` for timer-based async
- `jest.spyOn(instance, 'method')` for spying on existing instances
