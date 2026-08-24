# Current-state styling audit

**Audit purpose:** identify current architecture and migration risk; this document does not implement or certify dark mode.
**Related contracts:** [requirements.md](./requirements.md), [technical-design.md](./technical-design.md), [style-migration-matrix.md](./style-migration-matrix.md), and [assets/route-component-matrix.md](./assets/route-component-matrix.md).

## Classification used in this audit

- **Known rendered color owner** — current source directly supplies a Sass palette value, literal color, shadow, SVG presentation value, inline style, or runtime color to rendered UI. It requires semantic migration or a documented retention reason.
- **Theme foundation/integration owner** — current source controls global bootstrapping, style imports, root/shell layout, overlays, or profile composition and must change even if every line is not a hard-coded color.
- **Visual verification required** — the surface is reachable and must be checked in all supported appearances, but this audit has not asserted that every file contains a color defect.
- Primitive palette definitions, domain data, fixtures, and non-rendered strings are not automatically defects.

The exhaustive implementation ledger is [style-migration-matrix.md](./style-migration-matrix.md). Do not treat this overview as permission to skip its rows or the post-migration rendered-color search.

## Current styling architecture

Ministry Maps is currently light-only. It combines compile-time Sass values from `common-ui`, component-scoped Sass, global Sass, layout-oriented Tailwind utilities, runtime icon inputs, and occasional inline styles. There is no existing appearance service, local-storage contract, `prefers-color-scheme` listener, root theme attribute, or pre-paint resolver.

The shared palette is centered in:

- `libs/common-ui/src/lib/styles/abstract/_variables.scss`
- `libs/common-ui/src/lib/styles/abstract/variables.ts`

Those files expose primitive whites/greys/color values and light-specific aliases such as text and form-control colors. They are imported by global shared styles and by component Sass. They must remain available for compatibility, but new rendered theme behavior cannot depend on compile-time values alone because Sass cannot change at runtime.

The shared style entry chain currently runs through files under:

- `libs/common-ui/src/lib/styles/index.scss`
- `libs/common-ui/src/lib/styles/base/_index.scss`
- `libs/common-ui/src/lib/styles/base/_base.scss`
- `libs/common-ui/src/lib/styles/base/_typography.scss`
- `libs/common-ui/src/lib/styles/components/`

The future generic token source belongs in `libs/common-ui/src/lib/styles/base/_theme.scss`. Ministry Maps domain/page/status aliases belong in the app, not this library.

## Known global and shell owners

| Classification                            | File                                                                                      | Current responsibility and risk                                                                                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme foundation + known colors           | `apps/ministry-maps/src/index.html`                                                       | Contains one fixed `theme-color` and no synchronous preference initializer. Angular-only application would permit a wrong-theme flash.                                       |
| Theme foundation + known colors           | `apps/ministry-maps/src/styles/main.scss` and `apps/ministry-maps/src/styles/components/` | Import shared Sass and own global body/loading/radio/quote/alert/avatar presentation with light palette assumptions.                                                         |
| Verification-only/possible false positive | `apps/ministry-maps/src/app/app.component.scss`                                           | File exists but the current root component uses inline styles rather than this file. Do not wire or migrate it opportunistically; reclassify only if current wiring changes. |
| Theme integration owner                   | `apps/ministry-maps/src/app/app.component.html`                                           | Root host must inherit the pre-paint theme during loading/lazy navigation; current app-specific shell color ownership is in the shared header component.                     |
| Known rendered color owner                | `apps/ministry-maps/src/app/shared/components/header/header.component.ts` and `.scss`     | Pass runtime primary-green/white values and use fixed light hover/content presentation for the Ministry Maps shell.                                                          |
| Theme integration owner                   | `apps/ministry-maps/src/app/app-config.ts`                                                | Standalone application providers currently have no theme initializer; this is the registration point for idempotent `ThemeService.initialize()`.                             |
| Visual verification required              | `apps/ministry-maps/src/app/app.component.ts`                                             | Root shell component and lazy-route host; verify loading, navigation, and route transition states.                                                                           |

CDK overlays are appended beneath `body`, not inside a feature component. They still inherit root custom properties. Migrate the global backdrop and generic dialog/menu surfaces rather than creating a parallel overlay theme service or overlay class toggler.

## Known `common-ui` light-color owners

### Global shared styles

Known rendered color owners include:

- `libs/common-ui/src/lib/styles/base/_base.scss`
- `libs/common-ui/src/lib/styles/base/_typography.scss`
- `libs/common-ui/src/lib/styles/components/_form-control.scss`
- `libs/common-ui/src/lib/styles/components/_form-control-error.scss`
- `libs/common-ui/src/lib/styles/components/_menu.scss`

`_base.scss` fixes the body to a light surface; typography utilities fix dark text; shared forms and menus assume light inputs/surfaces and compile-time hover/error colors.

### Generic component groups

The following component directories are known rendered color owners and have adjacent specs where present:

- Actions: `libs/common-ui/src/lib/components/button/`, `floating-action-btn/`, and `icon-button/`.
- Cards: `libs/common-ui/src/lib/components/card/`, including `card-body/` links and inverse `card-header/` presentation.
- Dialogs: `libs/common-ui/src/lib/components/dialog/` and `confirm-dialog/`.
- Forms/search: `libs/common-ui/src/lib/components/form-field/`, `search-input/`, and `sort-filter/`.
- Feedback/content: `libs/common-ui/src/lib/components/copy-text-block/`, `note/`, `spinner/`, and `toaster/`.
- Shell-like generic UI: `libs/common-ui/src/lib/components/header/`.

Known runtime presentation owners include these TypeScript/template files or their component peers:

- `card/card-header/card-header.component.ts`
- `copy-text-block/copy-text-block.component.ts`
- `floating-action-btn/floating-action-button.component.ts`
- `header/header.component.ts` and `header/header.component.html`
- `icon-button/icon-button.component.ts`
- `icon/icon.component.ts`
- `note/note.component.ts`
- `search-input/search-input.component.ts`
- `sort-filter/` component TypeScript files
- `spinner/spinner.component.ts`
- `toaster/` container TypeScript files

These components import primitive color constants, expose/push concrete icon fills, map severity to presentation values, or assign literal CSS custom properties. During implementation, distinguish public compatibility inputs from presentation-only defaults. `icon-button.component.ts` is also a known constructor-injection site: if modified, migrate only that component to `inject()` rather than expanding scope.

## Profile composition and insertion point

The current protected `/profile` route lazy-loads `ProfilePageComponent` through:

- `apps/ministry-maps/src/app/features/profile/profile-routes.ts`
- `apps/ministry-maps/src/app/features/profile/pages/profile-page/profile-page.component.ts`
- `apps/ministry-maps/src/app/features/profile/pages/profile-page/profile-page.component.html`
- `apps/ministry-maps/src/app/features/profile/pages/profile-page/profile-page.component.scss`

`ProfilePageComponent` is standalone and already uses signals and `inject()`. It composes generic cards, identity/role/congregation content, congregation-change UI, and logout confirmation/action. The planned standalone `AppearanceSettingsComponent` belongs under `apps/ministry-maps/src/app/features/profile/components/appearance-settings/` and must be imported directly by the page. Place it after identity/congregation content and before logout without changing authorization or account behavior.

Existing focused coverage:

- `apps/ministry-maps/src/app/features/profile/pages/profile-page/profile-page.component.spec.ts`
- `apps/ministry-maps/e2e/src/profile.spec.ts`

Both must retain existing identity, congregation-change, authorization, confirmation, and logout assertions while adding appearance behavior.

## Ministry Maps shared UI

The current shared-component roots under `apps/ministry-maps/src/app/shared/components/` are:

- `dialogs/history-dialog/`
- `header/`
- `section/`
- `visit-outcome-option/`, including `icon-radio.component.ts`, its Sass, and its adjacent spec

Treat these as migration/verification owners and inspect their callers for inherited presentation. Search their templates, styles, directives, and callers for `fillColor`, `strokeColor`, inline `style.backgroundColor`/`style.color`, palette-derived CSS custom properties, literal SVG `fill`/`stroke`, and arbitrary Tailwind color classes. Global and route-level loading/fallback states remain high risk because they can render before lazy feature content; classify their current owners rather than assuming a stale component name.

## Signed-out/auth surfaces

Current auth code is rooted at `apps/ministry-maps/src/app/core/features/auth/`. Known route/page directories in this checkout include:

- `pages/sign-in-page/`
- `pages/login-page/`
- `pages/no-account-page/`
- `pages/welcome-page/`
- `components/provider-login-button.component.ts`
- `components/provider-login-button.component.scss`
- `auth-routes.ts`

The larger signed-out/onboarding experience must also include whichever current route components implement password recovery and congregation/role selection when the implementation starts; classify their current on-disk paths in the route matrix before styling. Verify cards, logos, links, validation/help text, icon-radio options, disabled actions, browser autofill, loading, and error states. Logos are verification-only unless contrast evidence requires a targeted asset treatment.

## Authenticated route groups

The route groups below are in app-wide scope. Listed directories are migration/verification roots; the exhaustive rows and states belong in the two matrices.

| Surface       | Current root                                         | Known risks                                                                                                          |
| ------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Home          | `apps/ministry-maps/src/app/features/home/`          | Page canvas plus `ministry-maps-card`/`territory-card` surfaces, icons, links, empty/loading states.                 |
| Profile       | `apps/ministry-maps/src/app/features/profile/`       | Page/cards/avatar, congregation component, logout, and new appearance radios.                                        |
| Territories   | `apps/ministry-maps/src/app/features/territory/`     | Lists/items, assignment/return/manage dialogs, forms, notes, inline/status background values, selected/hover states. |
| Work          | `apps/ministry-maps/src/app/features/work/`          | Assigned-work, work cards/header/items/lists, notes/add-note overlays, business status colors.                       |
| Users         | `apps/ministry-maps/src/app/features/users/`         | Lists/items, details, add/edit/invite dialogs/forms, congregation association, validation and disabled states.       |
| Configuration | `apps/ministry-maps/src/app/features/configuration/` | Main page, congregation/city/invite/notification components, lists/forms/dialogs, role-specific reachability.        |

Current page-level files include `home-page`, `profile-page`, `territories-page`, `assign-territories-page`, `statistics-territories-page`, `work-page`, `users-page`, and `configuration-main-page`, each under its feature’s `pages/` directory with nearby unit specs. Component-level color owners must not be hidden behind only page-level rows.

Territory/work colors require domain interpretation. Do not mechanically map green, red, yellow, or arbitrary `--color` values to generic success/danger tokens without confirming whether they mean available, assigned, completed, expired, overdue/attention, or selection.

## Overlay and transient states

These surfaces can be reached from multiple routes and need independent rows/evidence:

- Generic confirmation and content dialogs.
- Territory assignment/return/manage and unlink dialogs.
- Work/user/invite/congregation notes, add/edit, and association dialogs.
- Sort/filter dialogs and menus.
- Toast severity variants and form validation feedback.
- CDK backdrop, focus trap, keyboard focus restoration, and scroll blocking.
- Global and route-level loading, empty, unauthorized, not-found, and error states.

Do not create a second theme mechanism for overlays; root properties must flow into them.

## Tests and documentation locations

### Tests

- Unit specs are generally adjacent to components/services in `apps/ministry-maps/src/` and `libs/common-ui/src/lib/`.
- Profile E2E coverage begins at `apps/ministry-maps/e2e/src/profile.spec.ts`.
- Shared E2E instructions and fixtures live under `apps/ministry-maps/e2e/`, including `README.md`, `MANUAL-ACCEPTANCE.md`, and the existing plan documents.
- Root Nx/Jest configuration is in `nx.json`, `jest.config.ts`, `jest.preset.js`, and project target configuration discoverable through Nx.

### Current durable documentation

Current Ministry Maps documentation is rooted at `apps/ministry-maps/docs/`; relevant existing files include:

- `apps/ministry-maps/docs/README.md`
- `apps/ministry-maps/docs/features/profile.md`
- `apps/ministry-maps/docs/features/auth-onboarding.md`
- `apps/ministry-maps/docs/features/navigation-shell.md`
- Feature files for territories, work, users/invites, and configuration.
- `apps/ministry-maps/docs/test-catalog.md`
- `apps/ministry-maps/docs/testability-gaps.md`

Per the confirmed plan, the later implementation intentionally introduces the new `apps/ministry-maps/docs/user-guide/` and `apps/ministry-maps/docs/developer-guide/` hierarchy specified in [testing-and-documentation.md](./testing-and-documentation.md), then links it from existing documentation. Do not create those durable files during this planning-only packet change.

## Known search patterns for implementation

Classify every rendered occurrence in affected HTML/SCSS/TypeScript of:

- Sass variables matching `$white-*`, `$gray-*`, `$grey-*`, `$light-grey-*`, `$text*`, `$blue-btn`, `$link*`, `$red-*`, and `$green-*`.
- Hex, `rgb()`/`rgba()`, named `white`/`black`, `background`, `background-color`, `color`, `border-color`, `box-shadow`, `fill`, and `stroke`.
- `[fillColor]`, `[strokeColor]`, `style.backgroundColor`, `style.color`, and TypeScript-assigned custom properties.
- Tailwind arbitrary color utilities such as `bg-[#...]` and `text-[#...]`.

Classify each match as `migrate`, `retain with reason`, or `false positive`. Primitive definitions, test fixtures, and domain data are not automatically rendered-color defects. The final search must leave no unclassified rendered value.

## Primary risks and required mitigations

| Risk                                            | Mitigation required by the packet                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Wrong-theme flash before Angular                | Synchronous defensive head initializer plus light CSS fallback and idempotent Angular adoption.              |
| Runtime theming attempted with Sass-only values | Central semantic CSS custom properties with explicit interaction/on-color tokens.                            |
| Domain statuses lose meaning                    | App-owned semantic status families with separate background/foreground/border/selected/hover roles.          |
| Shared library becomes app-specific             | `--kui-*` only in `common-ui`; no app models, `--mm-*`, or Ministry Maps concepts.                           |
| Overlay remains light                           | Migrate inherited generic surfaces and global backdrop; verify open overlays in each scheme.                 |
| Literal runtime SVG colors bypass theme         | Move presentation to host classes/custom properties and `currentColor` where inheritance is intended.        |
| Storage/browser API failure blocks app          | Validate every external value, catch reads/writes/media access, retain in-memory selection on write failure. |
| Large migration hides regressions               | Work matrix row by row, update adjacent specs immediately, run focused gates before proceeding.              |
| Theme conveyed only through color               | Preserve text/icons/borders/checked state and validate contrast/non-color cues.                              |
| Scope expands into legacy cleanup               | Follow the runbook’s anti-refactoring gates; migrate only directly touched legacy DI where required.         |

## Planning-only boundary

This audit records work for a later feature implementation. It does not claim that any route has dark styling, any contrast pairing has been measured in-browser, or any test command has passed. Continue with [technical-design.md](./technical-design.md) and the two migration matrices before editing production files.
