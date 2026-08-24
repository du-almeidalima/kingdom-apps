# Dark/light mode requirements

**Status: Frozen implementation contract**
**Scope: planning only; no feature behavior is implemented by this document**

This document owns product behavior and acceptance criteria. Token names and values are owned by [assets/theme-token-contract.md](./assets/theme-token-contract.md); execution order is owned by [implementation-runbook.md](./implementation-runbook.md).

## Terms

- **Preference**: the user-selected literal `system`, `light`, or `dark`.
- **System scheme**: the browser result for `(prefers-color-scheme: dark)`; non-dark/no-preference resolves as light.
- **Resolved theme**: the effective `light` or `dark` scheme rendered by the application.
- **Current device**: the current browser profile and origin, represented by `localStorage`; it is not an authenticated-user or cross-device setting.

## Functional requirements

### Preference control

- **FR-01** — Add an `Aparência` card or section to `ProfilePageComponent` on `/profile`.
- **FR-02** — Present exactly three mutually exclusive native radio inputs in a native `fieldset` with a `legend`.
- **FR-03** — Bind the choices to the exact persisted values and visible labels below.

  | Persisted value | Visible label | Stable test ID         |
  | --------------- | ------------- | ---------------------- |
  | `system`        | `Sistema`     | `profile-theme-system` |
  | `light`         | `Claro`       | `profile-theme-light`  |
  | `dark`          | `Escuro`      | `profile-theme-dark`   |

- **FR-04** — Use this profile copy:
  - Section/legend: **Aparência**
  - Helper text: **Use Sistema para acompanhar a aparência definida no seu dispositivo.**
- **FR-05** — Apply each selection immediately. Do not add a Save action, confirmation dialog, or success toast.
- **FR-06** — The currently selected preference determines the radio’s native checked state.
- **FR-07** — Preserve profile identity, role/congregation display, congregation-change authorization and flow, confirmation/logout behavior, and layout semantics.

### Persistence and synchronization

- **FR-08** — Use the exact storage key `ministry-maps.theme-preference`.
- **FR-09** — Store only the exact literals `system`, `light`, or `dark`; no JSON envelope, boolean, resolved scheme, account ID, timestamp, or version is required.
- **FR-10** — A missing, malformed, removed, or inaccessible storage value resolves to preference `system` without throwing or preventing startup.
- **FR-11** — If a write fails, keep the new preference and resolved appearance in memory for the current page lifetime; persistence across reload is not guaranteed.
- **FR-12** — Process same-origin browser `storage` events only when their key is `ministry-maps.theme-preference`.
- **FR-13** — A valid storage-event value immediately becomes the in-memory preference without writing it back. A removed or invalid value immediately becomes `system`.
- **FR-14** — Preference state is device/browser-local. Do not read or write Firestore, user documents, repositories, auth claims, Functions, or migration data.

### Theme resolution

- **FR-15** — Resolve preference and operating-system state using this truth table:

  | Stored/in-memory preference | OS preference       | Effective scheme |
  | --------------------------- | ------------------- | ---------------- |
  | `system` or no valid value  | light/no preference | `light`          |
  | `system` or no valid value  | dark                | `dark`           |
  | `light`                     | either              | `light`          |
  | `dark`                      | either              | `dark`           |

- **FR-16** — Observe `matchMedia('(prefers-color-scheme: dark)')` after bootstrap. A change updates the resolved theme immediately only while preference is `system`.
- **FR-17** — Set `data-theme="system|light|dark"` on the root `html` element to the preference.
- **FR-18** — Set `data-resolved-theme="light|dark"` on the root `html` element to the effective scheme.
- **FR-19** — Keep the browser `color-scheme` and the single identifiable `theme-color` metadata value synchronized with the resolved theme.
- **FR-20** — Switching theme is immediate and does not require reload, route navigation, authentication, or profile re-fetch.

### First paint and startup

- **FR-21** — Put a minimal synchronous initializer in `apps/ministry-maps/src/index.html` before render-blocking application styles.
- **FR-22** — The initializer validates the storage value, resolves the media query, and applies both root attributes plus effective browser metadata before content paints.
- **FR-23** — Catch failures from storage and media APIs; use `system` with a safe light resolution when the browser cannot provide a dark result.
- **FR-24** — CSS without JavaScript or without theme attributes renders the existing light-compatible default.
- **FR-25** — Angular initialization is idempotent and adopts an already-correct head-initializer state without a visible theme change.
- **FR-26** — The head initializer and Angular runtime use the same storage key, allowed values, query, attributes, and light/dark metadata colors; automated evidence must detect drift.

### Visual scope and semantics

- **FR-27** — Apply the selected appearance across signed-out auth/onboarding, authenticated routes, app shell/navigation, loading/error/empty states, CDK dialogs and overlays, menus, toasts, validation, and shared controls.
- **FR-28** — Use central semantic CSS custom properties for rendered theme values across Sass, templates, runtime SVG presentation, and necessary utility classes.
- **FR-29** — Keep generic tokens and concepts in `libs/common-ui`; keep Ministry Maps page, shell, territory, work, and other domain/status concepts in the application.
- **FR-30** — Preserve semantic distinctions for action, link, success, warning, danger, disabled, assigned, available, completed, overdue/attention, selection, and focus states.
- **FR-31** — Replace presentation-only TypeScript color values and literal inheritable SVG fills with semantic classes/custom properties and `currentColor` where applicable.
- **FR-32** — Do not blanket-invert logos, maps, territory imagery, or user/content imagery. Retain them unless a documented route check identifies a contrast defect.
- **FR-33** — Do not use CSS `dark:` utility proliferation as the theme architecture and do not call Sass color functions with CSS variables. Define explicit semantic interaction tokens.

## Accessibility requirements

- **A11Y-01** — Normal text reaches at least `4.5:1` contrast against its rendered background in both themes.
- **A11Y-02** — Large text reaches at least `3:1` contrast; meaningful control boundaries and focus indicators reach at least `3:1` against adjacent colors.
- **A11Y-03** — Selection, validation, success, warning, danger, and domain status are not communicated by color alone.
- **A11Y-04** — Preserve visible `:focus-visible`, hover, active, selected, disabled, placeholder, browser-autofill, and validation states in both themes.
- **A11Y-05** — Appearance radios retain native grouping, label association, keyboard operation, focus, checked state, and accessible legend semantics.
- **A11Y-06** — Theme switching adds no global animated color transition and remains safe for reduced-motion users.
- **A11Y-07** — Native controls, overlays/focus traps, scrollbars, browser chrome, and loading/fallback states remain perceivable and usable.

## Engineering constraints

- **ENG-01** — New and modified Angular components are standalone; do not add NgModules.
- **ENG-02** — New dependencies use `inject()`; do not perform unrelated constructor-injection migrations.
- **ENG-03** — New files use kebab-case and cross-project TypeScript imports use `@kingdom-apps/common-ui`.
- **ENG-04** — `common-ui` must not import or reference `--mm-*`, Ministry Maps models, business rules, or domain statuses.
- **ENG-05** — Existing primitive Sass/TypeScript palette exports may remain for compatibility, but modified rendered theme values consume approved semantic tokens.
- **ENG-06** — Update adjacent unit tests, affected E2E coverage, migration rows, and durable documentation with each relevant implementation slice.

## Acceptance criteria

- **AC-01** — With no valid stored value and dark OS emulation, first navigation exposes `data-theme="system"` and `data-resolved-theme="dark"` before application content is asserted.
- **AC-02** — While `system` is selected, an OS dark-to-light or light-to-dark change updates the effective application and metadata without reload.
- **AC-03** — Selecting `Escuro` on `/profile` updates root state and local storage immediately and survives reload and route navigation.
- **AC-04** — Selecting `Claro` remains light while the OS reports dark.
- **AC-05** — Selecting `Sistema` resumes live OS following and exposes preference `system` rather than persisting a resolved scheme.
- **AC-06** — Missing, invalid, removed, read-failing, and write-failing storage cases do not crash startup or interaction and follow the fallback rules.
- **AC-07** — A valid cross-tab event synchronizes immediately; invalid/removal resets to `system`; no write loop occurs.
- **AC-08** — All three radios are labeled, mutually exclusive, keyboard operable, and report native checked state.
- **AC-09** — A stored preference affects a signed-out auth surface before authentication and before visible app paint.
- **AC-10** — Representative Home, Territories/Work, Users, and Configuration states render semantic canvas/surface/text/status values in both themes using authorized fixtures.
- **AC-11** — CDK dialogs/backdrops, menus, toasts or validation feedback, focus traps, and loading/error states inherit the effective appearance.
- **AC-12** — Explicit light and dark plus system-light and system-dark checks pass at phone and desktop widths without theme-induced layout shift or light flash.
- **AC-13** — Accessibility requirements `A11Y-01` through `A11Y-07` have automated or recorded manual evidence.
- **AC-14** — Existing profile identity, congregation-change, authorization, confirmation/logout, and route behavior remain unchanged and covered.
- **AC-15** — Every row in both migration matrices is complete, every remaining rendered hard-coded color is classified with a reason, and all required command gates pass.
- **AC-16** — Durable user/developer documentation describes actual behavior, and no Firestore, user-model, backend, or migration change is present.

## Non-goals

- **NG-01** — Cross-device/account-synced preference.
- **NG-02** — Header or navigation appearance control.
- **NG-03** — Scheduled themes, custom colors, automatic brightness rules, or choices beyond the three specified values.
- **NG-04** — Layout, typography, navigation, or workflow redesign.
- **NG-05** — Unrelated feature-routing NgModule, dependency-injection, or design-system refactoring.
- **NG-06** — Screenshot-baseline infrastructure unless the repository already adopts it independently.

## Traceability

Implementation and validation mappings are defined in [testing-and-documentation.md](./testing-and-documentation.md) and the final evidence gate is [assets/acceptance-checklist.md](./assets/acceptance-checklist.md). Do not mark any acceptance criterion complete during this planning-only change.
