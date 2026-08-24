---
globs:
  - libs/common-ui/**
description: Working inside common-ui — structure, selectors, tokens, and what belongs in the shared library.
---

# Common-UI Library

Shared, reusable UI. **No application-specific logic, domain models, or feature UI.**

## When to add here

✅ Generic components (buttons, cards, dialogs, form controls), reusable directives, non-domain UI state (auth-user), design tokens & styles, UI utilities.
❌ Anything importing Ministry Maps models or encoding its behavior.

## Structure

```
libs/common-ui/src/
├── index.ts                           # Public API — export everything here
└── lib/
    ├── components/<kebab-name>/       # one folder per component; <name>.component.{ts,html?,scss} + .spec.ts
    │   └── <sub-component>/           # children nest under their parent (card/card-body, form-field/input)
    ├── directives/<kebab-name>/<name>.directive.ts
    ├── features/                      # cross-cutting UI features (theme/)
    ├── state/<entity>/<entity>.state.service.ts
    ├── models/                        # UI-only models
    └── styles/                        # 7-1 SCSS, loaded globally — see styling.md
```

Component files are named after their folder. Group related components with a per-folder `index.ts` barrel when they form one API surface (`form-field/`, `card/`, `dialog/`).

## Selectors

- Elements: `lib-*` (`lib-card`, `lib-dialog`, `lib-confirm-dialog`).
- Attribute selectors on native elements for controls: `button[lib-button]`, `input[lib-input]`, `select[lib-select]`, `label[lib-label]`, `[lib-icon-button]`, `button[lib-floating-action-button]` — these carry an intentional `// eslint-disable-next-line @angular-eslint/component-selector`.

## Conventions

- Components: standalone (default), OnPush, signal `input()/output()/model()` APIs in newer code, `data-testid` where queryable.
- Design tokens: SCSS palette in `styles/abstract/_variables.scss`, TS tokens in `abstract/variables.ts`; theme vars `--kui-color-*` (details in `.agents/rules/styling.md`).
- Public API = `src/index.ts` exports (components, directives, `ThemeService`, tokens, `ToasterService`…).

## Toolkit to reuse before building anything new

`lib-button` / `lib-icon-button` / `lib-floating-action-button`, `lib-card`(+header/body), `lib-dialog`(+footer) / `lib-confirm-dialog`, form-field suite (`lib-input`, `lib-select`, `lib-label`, `lib-radio-group`, autocomplete), `lib-search-input`, sort-filter, `lib-spinner`, `ToasterService`, `lib-header`, `lib-icon` (SVG sprite), `lib-note`, `lib-copy-text-block`; directives `libAuthorize` (role gating), `libDialogClose`, `only-numbers`; `ThemeService` + `provideTheme()`, `AuthUserStateService`.
