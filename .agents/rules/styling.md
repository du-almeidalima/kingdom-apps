---
globs:
  - '**/*.scss'
  - '**/*.css'
  - '**/styles/**'
  - '**/tailwind.config.js'
description: Styling — design tokens, the light/dark theme system, common-ui SCSS layers, and Tailwind usage.
---

# Styling

## Token system — use tokens, never raw colors

- CSS custom properties: `--kui-color-*` / `--kui-shadow-*` (common-ui) and `--mm-color-*` (app contracts in `apps/ministry-maps/src/styles/_theme.scss`).
- Always consume with an SCSS fallback: `color: var(--kui-color-text, #{variables.$text});`
- SCSS palette: `libs/common-ui/src/lib/styles/abstract/_variables.scss` (`$red-50…$rose-950`, `$primary-green`, `$shadow-z1…z6`, `$text/$text-secondary/$text-error`, control metrics). TS-side tokens: `abstract/variables.ts`, exported from `@kingdom-apps/common-ui`.
- Unthemeable utilities like `text-gray-*` appear only in older templates — do not add new ones.

## Theme system (implemented — not future work)

`ThemeService` (common-ui, signal-based): persists the preference (`kui.theme-preference`), resolves `system|light|dark` via `matchMedia`, sets `data-theme` + `data-resolved-theme` on `<html>`, updates `color-scheme`/theme-color. Registered with `provideTheme()` in `app.config.ts`; user UI is `appearance-settings.component` + `lib-radio-group`.

Light/dark values: `common-ui styles/base/_theme.scss` (`light-theme-tokens`/`dark-theme-tokens`, ~40 vars) and app-level `mm-light-theme-tokens`/`mm-dark-theme-tokens`.

**New colors must be added to both the light and the dark token set** (kui or mm layer, by ownership).

## Style architecture

- `libs/common-ui/src/lib/styles/` — 7-1: `abstract/` (variables, breakpoints), `base/` (resets, typography, theme, layout), `components/` (form-control, form-control-error, menu). Entry `index.scss` `@forward`s all three.
- `apps/ministry-maps/src/styles/` — `main.scss`, `_theme.scss` (mm tokens), `components/` (app-wide classes).
- Loading order (project.json): common-ui `index.scss` first, then app `main.scss` — global classes from common-ui are available everywhere.

### Importing shared SCSS

Repo-root-relative `@use` (the established pattern in 14+ app files):

```scss
@use 'libs/common-ui/src/lib/styles/abstract/variables';
@use 'libs/common-ui/src/lib/styles/abstract/breakpoints' as bp;

.my-el {
  color: var(--kui-color-text, #{variables.$text});
  @include bp.tablet-up {
    font-size: 1rem;
  }
}
```

`stylePreprocessorOptions.includePaths` contains the common-ui styles dir, so short forms like `@use 'components/form-control' as *` also work.

## Global classes — apply, don't restyle

- Typography: `.t-headline1…4`, `.t-body1/2`, `.t-caption`, `.t-control` + modifiers `.t-primary`, `.t-secondary`, `.t-medium-emphasis`, `.t-low-emphasis`, `.t-white`.
- `.form-control` (+ `.form-control-error`), `.menu`.

## Breakpoint mixins

`abstract/_breakpoints.scss`: `mobile-only`, `tablet-up`, `desktop-up`, `large-desktop-up`, `tablet-only` — sm 640 / md 768 / lg 1024 / xl 1280.

## Tailwind

`apps/ministry-maps/tailwind.config.js` uses `createGlobPatternsForDependencies(__dirname)` and excludes specs/stories; `theme.extend` is **empty by design** — theming flows through the token system, not Tailwind theme colors. Use utilities for layout/spacing/responsive; colors come from tokens.

## Rules

- `@use`, never `@import` (deprecated).
- Nesting ≤ 3 levels.
- No hardcoded hex in components — token or palette variable.
- Component-specific styles scoped in `<name>.component.scss`; shared/global styles go to the common-ui layers or `src/styles/components/`.
- CDK overlay customization goes through tokens (see the `.cdk-overlay-backdrop` override in `main.scss`).
