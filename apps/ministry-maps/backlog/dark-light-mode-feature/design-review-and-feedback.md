# Design Review & Feedback Resolutions — Dark & Light Mode Feature

This document captures the design review feedback, root cause analyses, engineering decisions, and resolutions implemented for the Dark and Light Mode feature.

---

## Feedback Items & Resolutions Summary

| # | Topic | User Feedback | Root Cause | Engineering Resolution |
|---|---|---|---|---|
| **1** | **Brand Accent** | Green accent color of header brand was lost and replaced by blue; dark version should use a green tone that contrasts well. | The initial design draft mapped `--kui-color-action-primary` to blue (`#2A4970`). | Restored light mode `--kui-color-action-primary` to `#07AB3B` (Kingdom Apps signature primary green); set dark mode `--kui-color-action-primary` to `#22C55E` (vibrant green with high contrast on dark surfaces). |
| **2** | **Header Container Color** | Light mode header container had a darker shade of gray; it should preserve the original one. | Shell header token was mapped to an ad-hoc green tone instead of the original light header gray. | Configured `--mm-color-shell-header` in light mode to `hsl(0, 0%, 50%)` (`#808080`), preserving the exact original neutral gray header shade. |
| **3** | **Spinner & App Accent** | Spinner and general action accents lost green accent. | `SpinnerComponent` was set to `currentColor`, causing it to spin in black/grey/blue in isolated contexts. | Set `SpinnerComponent`'s default `color` input to `var(--kui-color-action-primary, #07AB3B)`. Re-anchored primary action styles to the brand green token family. |
| **4** | **Card Header & Dark Container Tones** | Card headers and dark container surfaces looked awkward with a bluish tint. | Surface inverse was defined as `#0F172A` (slate-blue). | Updated dark `--kui-color-surface-inverse`, `CardHeaderComponent`, and `--mm-color-shell-header` to `#262626` (clean neutral dark gray). |
| **5** | **Profile Card Consistency** | Profile appearance card didn't reuse the original card style/component (e.g. `Administrador` card). | `AppearanceSettingsComponent` created an ad-hoc card container. | Refactored `AppearanceSettingsComponent` to reuse `<kingdom-apps-section title="Aparência">`, exactly matching the structure of `ChangeCongregationComponent`. |
| **6** | **Generic Radio Group Component** | Appearance settings radio group should be a generic reusable component in `common-ui` under `form-field`. | Radio option markup was originally embedded inside `AppearanceSettingsComponent` in `ministry-maps`. | Extracted and created generic [`RadioGroupComponent`](file:///home/du/development/projects/kingdom-apps/libs/common-ui/src/lib/components/form-field/radio-group/radio-group.component.ts) (`lib-radio-group`) in `@kingdom-apps/common-ui`, supporting `RadioOption<T>`, `ControlValueAccessor`, and flexible layouts. |
| **7** | **Radio Group Layouts** | `lib-radio-group` should default to vertical layout; horizontal layout should be flexible with equal item width. | Group layout originally defaulted to grid with centered column cards. | Configured default layout to `'vertical'` (stacked list). For `'horizontal'`, configured `.lib-radio-option { flex: 1 1 0px; min-width: 0; }` so all options share equal width and occupy the full container width. |
| **8** | **Dark Icons on Feature Pages** | All icons on `territories/assign`, `search-input`, `sort-filter`, and `copy-text-block` were dark on dark surfaces. | Hardcoded `grey400` (`#202020`) was passed to `[fillColor]` in component templates and TypeScript classes. | Replaced all hardcoded `grey400` icon bindings with `fillColor="currentColor"`, allowing SVG icons to dynamically inherit the text color (`--kui-color-text`). |
| **9** | **Subpixel Circle Centering on High-DPI / 4K Displays** | Radio indicator inner circle was not centered properly on 4K/high-res monitors at 100% zoom. | Separate HTML box-model borders with `border-radius: 50%` undergo independent rasterizer pixel-snapping and anti-aliasing passes on fractional scaling. | Replaced DOM div indicators with an inline vector `<svg viewBox="0 0 20 20">` where outer ring (`r="8.5"`) and inner dot (`r="4.5"`) share the exact same `cx="10" cy="10"` vector coordinate origin, guaranteeing concentricity across all monitors and zoom levels. |
| **10** | **`generation-couple` Icon Color in Dark Mode** | `generation-couple` territory icon remained hardcoded dark grey on dark mode. | `sprite.svg` had inline `fill="#2B2B2B"` and `fill="none"` on `<symbol>` in `iconmonstr-generation-couple`. | Removed hardcoded `fill="#2B2B2B"` and `fill="none"` from the symbol tag so child paths inherit the SVG's `fill: var(--fill-color)`. |
| **11** | **Bluish Link Color for Home Cards** | Home card navigation links should use a classic bluish link color across both light and dark modes. | Link tokens were mapped to green action tokens (`#07AB3B` / `#4ADE80`). | Updated `--kui-color-link` to `#4171AE` in light mode and `#60A5FA` in dark mode; hover tokens updated to `#2A4970` and `#93C5FD`. |
| **12** | **Territories Overflow Menu & Action Icons** | Overflow menu trigger button (`⋮`) and `Exportar Territórios` icon in `/territories` were dark on dark mode. | `TerritoriesPageComponent.greyButtonColor` was initialized to `grey400` (`#202020`). | Updated `greyButtonColor` to `'currentColor'`, allowing the icon button and dropdown menu item icons to inherit the active theme text color. |
| **13** | **Territory Statistics Item Theming (`/territories/statistics`)** | `.statistics-item` tiles on `/territories/statistics` were not reacting to light/dark mode. | Hardcoded `background-color: white; border: 1px solid #BAB7B5; color: #868686;` in `statistics-territories-page.component.scss`. | Replaced hardcoded values with semantic tokens `--kui-color-surface`, `--kui-color-border`, `--kui-color-text-muted`, and `--kui-color-action-primary`. |
| **14** | **Territory Drag Handle Color (`territory-item-drag-handle`)** | Drag handle icon color was not adapting correctly to dark mode. | Handled via static `disabledLight` (`#8d8d8d`) variable binding in template. | Updated button to use `[disabled]` binding and icon `fillColor="currentColor"`, allowing semantic disabled styling via CSS. |
| **15** | **`generation-couple` SVG Symbol `fill="none"`** | After removing `#2B2B2B`, `generation-couple` symbol was not visible because `<symbol fill="none">` caused child paths to have no fill. | `<symbol fill="none">` on the SVG symbol declaration. | Removed `fill="none"` from the symbol tag so paths inherit `fill: var(--fill-color)` like all other icons in `sprite.svg`. |
| **16** | **Floating Action Button (`FloatingActionButtonComponent`) Theme Styling** | Floating Action Button had hardcoded pastel `[backgroundColor]='green200'` and `[fillColor]='white200'` bindings on feature pages. | Template bindings overrode semantic action tokens with static palette variables. | Removed hardcoded bindings across `TerritoriesPageComponent`, `UsersPageComponent`, and `AssignTerritoriesPageComponent`. Component now automatically consumes `--kui-color-action-primary` and `--kui-color-on-action-primary` (`#22C55E` / `#052E16` in dark mode, `#07AB3B` / `#FDFDFD` in light mode). |

---

## Detailed Architectural Notes

### 1. Color Palette System
- **Light Theme (`libs/common-ui/src/lib/styles/base/_theme.scss`)**:
  - Primary Action & Focus: `#07AB3B`
  - On Primary Action: `#FDFDFD`
  - Links: `#4171AE` (hover: `#2A4970`)
  - Selected Surface: `#0E361D` (subtle green tint)
  - Inverse Surface (Header): `hsl(0, 0%, 50%)`
- **Dark Theme (`libs/common-ui/src/lib/styles/base/_theme.scss`)**:
  - Canvas: `#121212`
  - Surface / Elevated: `#1E1E1E` / `#262626`
  - Inverse Surface (Header / Card Header): `#262626`
  - Primary Action & Focus: `#22C55E`
  - On Primary Action: `#052E16` (high contrast)
  - Links: `#60A5FA` (hover: `#93C5FD`)

### 2. High-DPI Vector Concentricity
Concentric circles in CSS with border + inner dot are prone to subpixel offset on non-integer device pixel ratios. By adopting SVG with shared `cx="10" cy="10"` origins, anti-aliasing and pixel rasterization are computed symmetrically by the GPU.

### 3. Component Architecture
- **Generic Common UI**: `RadioGroupComponent` is completely decoupled from Ministry Maps domain models and can be used in any form across the monorepo.
- **Floating Action Button**: Defaults cleanly to `--kui-color-action-primary` and `--kui-color-on-action-primary` without requiring page-level color overrides.
- **Icon Rendering Contract**: SVG sprite symbols and `<lib-icon>` instances must never have `fill="none"` or hardcoded hex colors on symbols, relying on `currentColor` / `var(--fill-color)` inheritance to adapt across light/dark surfaces.
