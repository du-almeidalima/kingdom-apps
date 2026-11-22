---
description: Common patterns and utilities reference.
---

# Common Patterns & Utilities

- **Utility modules (`apps/ministry-maps/src/app/shared/utils/`):** flat kebab-case modules for pure helpers (Firestore converters, filters, maps links, sharing, user/agent helpers).
- **Shared pipes (`apps/ministry-maps/src/app/shared/pipes/`):** one folder per pipe (`<name>/<name>.pipe.ts`).
- **Directives (`libs/common-ui/src/lib/directives/`):** generic UI directives (`authorize`, `dialog-close`, `only-numbers`).
- **Business Objects (`features/<feature>/bo/`):** feature-scoped domain orchestration services (`*.bo.ts`; see `.agents/rules/angular-services.md`).

## Responsive Component Switching (`BreakpointObserver` + `<ng-template>`)

Keep viewport-specific primitives single-purpose (`lib-bottom-sheet` is strictly mobile; `lib-dialog` is strictly a centered dialog). When a surface should render different components by viewport:

- Encapsulate the switch in a shared wrapper component in `common-ui` (reference: `ResponsiveDialogComponent` / `<lib-responsive-dialog>`).
- Observe the breakpoint with Angular CDK `BreakpointObserver` (`@angular/cdk/layout`) converted via `toSignal(...)` (aligned with `styles/abstract/_breakpoints.scss`, e.g. `(min-width: 768px)`).
- Capture projected slots (`<ng-content>`) once inside `<ng-template>` blocks and project them into the active `@if (isDesktop())` / `@else` branch via `[ngTemplateOutlet]` + `ngProjectAs` so consumers write their content once without duplicating templates or breakpoint logic.

## Folder Structure Pattern

Canonical layouts and naming conventions live in the rule files:

- App (`apps/ministry-maps/src`): "Folder layout" in `.agents/rules/angular-components.md`.
- Shared UI library (`libs/common-ui`): "Structure" in `.agents/rules/common-ui.md`.
