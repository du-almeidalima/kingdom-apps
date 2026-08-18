---
description: Common patterns and utilities reference.
---

# Common Patterns & Utilities

## Utility Files
Located in `shared/utils/` as flat kebab-case modules (list below is non-exhaustive):
- `date.ts` - Date manipulation
- `type-utils.ts` - TypeScript utilities  
- `firebase-entity-converter.ts` - Firestore converters
- `user-utils.ts` - User-related utilities
- `open-google-maps.ts` - Google Maps integration
- `territory-icon-mapper.ts` - Territory icons

## Shared Pipes
Located in `shared/pipes/`:
- `territory-icon-translator.pipe.ts` - Icon translation
- `visit-outcome-to-icon.pipe.ts` - Visit outcome icons

## Directives (common-ui)
Located in `libs/common-ui/src/lib/directives/`:
- `authorize.directive.ts` - Authorization
- `dialog-close.directive.ts` - Dialog closing
- `only-numbers.directive.ts` - Number input

## Business Objects (`.bo.ts`)
Located in `shared/business-objects/` or `features/*/bo/`:
- Encapsulate business logic
- Examples: `configuration.bo.ts`, `territory.bo.ts`

## Folder Structure Pattern

Canonical layouts and naming conventions live in the rule files (keep this file an index, not a second copy of the trees):

- App (`apps/ministry-maps/src`): "Folder layout" in `.agents/rules/angular-components.md`.
- Shared UI library (`libs/common-ui`): "Structure" in `.agents/rules/common-ui.md`.
