---
description: Common patterns and utilities reference.
---

# Common Patterns & Utilities

- **Utility modules (`apps/ministry-maps/src/app/shared/utils/`):** flat kebab-case modules for pure helpers (Firestore converters, filters, maps links, sharing, user/agent helpers).
- **Shared pipes (`apps/ministry-maps/src/app/shared/pipes/`):** one folder per pipe (`<name>/<name>.pipe.ts`).
- **Directives (`libs/common-ui/src/lib/directives/`):** generic UI directives (`authorize`, `dialog-close`, `only-numbers`).
- **Business Objects (`features/<feature>/bo/`):** feature-scoped domain orchestration services (`*.bo.ts`; see `.agents/rules/angular-services.md`).

## Folder Structure Pattern

Canonical layouts and naming conventions live in the rule files:

- App (`apps/ministry-maps/src`): "Folder layout" in `.agents/rules/angular-components.md`.
- Shared UI library (`libs/common-ui`): "Structure" in `.agents/rules/common-ui.md`.
