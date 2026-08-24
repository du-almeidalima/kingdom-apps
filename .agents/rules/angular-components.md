---
globs:
  - '**/*.component.ts'
  - '**/*.component.html'
  - '**/*.component.scss'
  - '**/components/**'
description: Create or modify Angular components — selectors, templates, signal APIs, dialogs, forms, and folder placement.
---

# Angular Component Guidelines

## Non-negotiables

- **Standalone** — Angular 21 default; omit `standalone: true`, never add NgModules (legacy routing NgModules under home/territory/users/work are migration debt).
- **OnPush** — `changeDetection: ChangeDetectionStrategy.OnPush` is required on new components (~72% of existing ones have it).
- **Selectors** — app components: `kingdom-apps-*` (e.g. `kingdom-apps-territories-page`); common-ui: `lib-*` elements or attribute selectors (`button[lib-button]`). The `prefix: app` in project.json is dead config — ignore it.
- **`inject()`** for new DI. Constructor DI survives in ~41 older files — don't copy it.
- **`data-testid`** on interactive/dynamic elements — unit specs query `By.css('[data-testid=…]')`, Playwright page objects use `page.getByTestId(...)`.

## Templates — built-in control flow only

`*ngIf`/`*ngFor` are banned (zero usages; 36 files use the modern syntax):

```html
@if (user(); as user) {
  <h1>{{ user.name }}</h1>
} @else {
  <lib-spinner />
} @for (territory of territories(); track territory.id) {
  <kingdom-apps-territory-list-item [territory]="territory" />
} @empty {
  <p>Nenhum território.</p>
} @let total = items().length;
```

- Track inline (`track territory.id`); a `trackBy` _method_ survives in one legacy file only.
- Keep logic out of templates — expose computed values from the class.

## Inputs, outputs, state

Signal APIs are the convention in new code (`@Input()`/`@Output()` decorators are legacy):

```typescript
value = input<T | null>(null);
label = input.required<string>();
selection = model<T | null>(null); // two-way binding
saved = output<Item>();

items = signal<Item[]>([]);
filtered = computed(() => this.items().filter((i) => i.active));
user = toSignal(this.userState.$user); // bridge Observable state into the template
```

- **Split:** signals in components/pages; RxJS Observables in services/BOs/repositories (see `.agents/rules/angular-services.md`).
- `async` pipe survives in three older pages; prefer `toSignal` in new code.
- Template-facing members: `protected readonly`.

## Dialogs (CDK Dialog)

Opener:

```typescript
private readonly dialog = inject(Dialog);

open(): void {
  const ref = this.dialog.open(ManageDialogComponent, { data: dialogData });
  ref.closed.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(result => { /* ... */ });
}
```

Dialog component conventions:

- Get data/ref with `inject(DIALOG_DATA)` / `inject(DialogRef)` (older dialogs use constructor `@Inject(DIALOG_DATA)` — don't copy).
- Wrap the body in common-ui shells: `<lib-dialog [title]="…">` + `<lib-dialog-footer>`.
- Close via the `libDialogClose` attribute on a `lib-button`.
- `dialogRef.disableClose = true` while submitting; `isSubmitting` signal + inline `@if` spinner on the save button.
- Confirmations reuse `ConfirmDialogComponent` (+ `ConfirmDialogData`) from common-ui — no bespoke confirm dialogs.

## Forms

- Simple controls (filter selects/checkboxes): template-driven `[(ngModel)]` is accepted (see territory/statistics filter pages).
- Real forms: reactive — `new FormControl('', { nonNullable: true })`, or `NonNullableFormBuilder` for dialog forms.

## Icons and TS design tokens

- Icons: `<lib-icon icon="task-list-lined" [fillColor]="…">` — single SVG sprite in common-ui; `icon` is a typed union, not a free string.
- TS-side colors: import tokens from `@kingdom-apps/common-ui` (`primaryGreen`, `red400`, `grey400`, …) — never hardcode hex in TS.

## Folder layout

One folder per component; files named after the folder:

```
src/
├── app/
│   ├── app.config.ts / app.component.* / app-routes.ts
│   ├── features/<feature>/              # territory, users, work, profile, configuration, home
│   │   ├── pages/<name>-page/           # smart pages: <name>-page.component.{ts,html?,scss}
│   │   ├── components/<kebab-name>/     # presentation components
│   │   ├── bo/<area>/<name>.bo.ts       # business objects (see angular-services.md)
│   │   ├── config/*.config.ts           # feature config (roles, filters)
│   │   └── dto/<name>.dto.ts            # data transfer objects
│   ├── shared/                          # components/, services/, utils/, pipes/, business-objects/
│   │   └── pipes/<name>/<name>.pipe.ts  # one folder per pipe
│   ├── core/                            # services/, features/auth, features/congregation-settings
│   ├── repositories/                    # data access (see repositories.md / firestore.md)
│   └── state/<entity>.state.service.ts
├── models/                              # domain models (kebab-case .ts)
│   ├── enums/                           # role.ts, visit-outcome.ts, designation-status.ts
│   └── firebase/                        # firebase-<entity>-model.ts Firestore variants
└── styles/                              # see styling.md
```

- **Pages** are the smart layer: inject BOs/state, navigate, open dialogs. Other feature components stay presentation-only.
- New shared code → `shared/`; cross-feature state → `state/`; data access only through `repositories/` (direct Firestore access in `repositories/db/` is a last resort).

## Testing

ng-mocks (`MockBuilder`/`MockRender`/`MockInstance`), never TestBed boilerplate — see `.agents/rules/unit-testing.md`.

## Checklist

- [ ] Standalone (no flag, no NgModule) + OnPush + `kingdom-apps-*` selector
- [ ] `@if/@for/@let` with inline `track` — no `*ngIf`/`*ngFor`
- [ ] `input()/output()/model()` signal APIs; `toSignal` for Observable state
- [ ] `data-testid` on queryable elements
- [ ] Dialogs: `lib-dialog`/`lib-dialog-footer`/`libDialogClose`; reuse `ConfirmDialogComponent`
- [ ] One-folder-per-component, files named after the folder, kebab-case
