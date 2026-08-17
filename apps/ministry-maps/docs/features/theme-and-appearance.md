# Theme and Appearance Architecture

This document describes the architectural implementation of the Dark and Light Mode feature across the Kingdom Apps monorepo (`libs/common-ui` and `apps/ministry-maps`).

## 1. Core Principles

- **No Flash of Incorrect Theme (FOIT):** An inline pre-paint script in `index.html` synchronously resolves and applies the theme attributes before Angular bootstraps and before CSS layout/paint occur.
- **Three-State Preference:** Users can choose between `system`, `light`, and `dark`.
- **System Theme Reactivity:** When set to `system`, the app dynamically reacts to OS / browser preference changes (`prefers-color-scheme: dark`) in real time.
- **Cross-Tab Synchronization:** Changing the theme in one tab instantly propagates to all other open tabs in the same browser via `window.addEventListener('storage', ...)`.
- **Zero Backend / Firestore Dependencies:** Theme preference is strictly client-local and stored in `localStorage` under the key `ministry-maps.theme-preference`.
- **Semantic CSS Token Contract:** Components consume semantic design tokens (`--kui-*` in `common-ui`, `--mm-*` in `ministry-maps`) instead of hardcoded palette values or raw color variables.

---

## 2. DOM & Attribute Contract

The root `<html>` element is the single authority for runtime theme state:

- `data-theme`: reflects user preference (`system` | `light` | `dark`).
- `data-resolved-theme`: reflects active visual scheme (`light` | `dark`).
- `style.colorScheme`: set to `'light'` or `'dark'`.
- `<meta name="color-scheme" content="light dark">` in `<head>`.
- `<meta name="theme-color" data-mm-theme-color content="#E7E6E4">` (dynamically updated to `#121212` in dark mode).

---

## 3. Storage Contract

- **Key:** `ministry-maps.theme-preference`
- **Values:** `'system'` | `'light'` | `'dark'`
- **Fallback:** If the key is missing or invalid, resolution defaults to `'system'`.

---

## 4. Pre-Paint Bootstrap Script

Located in `apps/ministry-maps/src/index.html` inside `<head>` prior to any stylesheets:

```html
<script>
  (() => {
    try {
      const storageKey = 'ministry-maps.theme-preference';
      let pref = 'system';
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored === 'system' || stored === 'light' || stored === 'dark') {
          pref = stored;
        }
      } catch {}

      let isDark = false;
      try {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } catch {}

      const resolved = pref === 'dark' || (pref === 'system' && isDark) ? 'dark' : 'light';

      const docEl = document.documentElement;
      docEl.setAttribute('data-theme', pref);
      docEl.setAttribute('data-resolved-theme', resolved);
      docEl.style.colorScheme = resolved;

      const meta = document.querySelector('meta[name="theme-color"][data-mm-theme-color]');
      if (meta) {
        meta.content = resolved === 'dark' ? '#121212' : '#E7E6E4';
      }
    } catch {}
  })();
</script>
```

---

## 5. Angular Runtime (`@kingdom-apps/common-ui`)

The theme state management is provided as a shared feature in `libs/common-ui/src/lib/features/theme/` and exported via `@kingdom-apps/common-ui`.

### Provider Function: `provideTheme(config?: ThemeConfig)`
Configures and initializes `ThemeService` at application bootstrap in `app.config.ts`:

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideTheme({
      storageKey: 'ministry-maps.theme-preference',
      metaColors: { light: '#E7E6E4', dark: '#121212' },
      metaSelector: 'meta[name="theme-color"][data-mm-theme-color]',
    }),
    // ...
  ],
};
```

### `ThemeService` API
Injected anywhere via `inject(ThemeService)`:
- `preference`: `Signal<ThemePreference>` (`'system'` | `'light'` | `'dark'`)
- `resolvedTheme`: `Signal<ResolvedTheme>` (`'light'` | `'dark'`)
- `setPreference(preference: ThemePreference)`: Updates signals, persists to `localStorage`, applies DOM root attributes, updates `theme-color` meta tag, and synchronizes cross-tab storage events.

---

## 6. Token Architecture

- **`libs/common-ui/src/lib/styles/base/_theme.scss`**: Defines generic `--kui-*` tokens (canvas, surface, text, action, border, focus, feedback, shadows).
- **`apps/ministry-maps/src/styles/_theme.scss`**: Defines application-specific `--mm-*` tokens (shell header, profile avatar, territory alerts, work state families, user role badges).
- All tokens are defined for `:root` (light default), `[data-theme='light']`, `[data-theme='dark']`, and `:root[data-theme='system']` with `@media (prefers-color-scheme: dark)` overrides.

---

## 7. Color Palette Decisions & Refinements

- **Brand Action & Accent (`--kui-color-action-primary` / `--mm-color-shell-header-logo-bg`):**
  - **Light Mode:** `#07AB3B` (Kingdom Apps signature primary green), preserving original brand recognition.
  - **Dark Mode:** `#22C55E` (vibrant green with high contrast on dark surfaces, with `#052E16` on-action contrast).
- **Navigation & Card Links (`--kui-color-link` / `--kui-color-link-hover`):**
  - **Light Mode:** `#4171AE` (classic blue link tone), hover `#2A4970`.
  - **Dark Mode:** `#60A5FA` (accessible, vibrant blue with high contrast against dark surfaces), hover `#93C5FD`.
- **Header & Card Header Containers:**
  - **Light Mode:** `hsl(0, 0%, 50%)` (`#808080`) preserving the exact original neutral gray header tone.
  - **Dark Mode:** `#262626` clean neutral dark gray (avoiding blue/slate tints) for headers, `--kui-color-surface-inverse`, and `lib-card-header`.
- **Spinner Component (`<lib-spinner>`):**
  - Defaults to `var(--kui-color-action-primary, #07AB3B)` for brand accent visibility in both light and dark modes, while allowing explicit color overrides.
- **Icon Color & SVG Sprite Inheritance:**
  - All standard icons and dropdown trigger buttons default to `fillColor="currentColor"` to dynamically adapt to text colors across all themes.
  - SVG sprite definitions in `sprite.svg` avoid hardcoded fills, ensuring all symbols inherit active surface and text colors.

---

## 8. Generic Form & Button Components (`@kingdom-apps/common-ui`)

- **`RadioGroupComponent` (`lib-radio-group`):**
  - Location: `libs/common-ui/src/lib/components/form-field/radio-group/`
  - Reusable card/option radio group implementing `ControlValueAccessor` with keyboard accessibility (`Space`, `Enter`).
  - Defaults to `'vertical'` stacked list layout.
  - Supports `'horizontal'` (with flexible equal-width option cards spanning full width) and `'grid'` layouts.
  - Option cards feature left-aligned content (icon + label + description) and a right-aligned indicator.
  - **Vector SVG Indicator:** Employs an inline vector `<svg viewBox="0 0 20 20">` with concentric `<circle>` elements sharing `cx="10" cy="10"`. This guarantees subpixel centering and concentricity on 4K/high-DPI monitors at any browser zoom level.

- **`FloatingActionButtonComponent` (`button[lib-floating-action-button]`):**
  - Location: `libs/common-ui/src/lib/components/floating-action-btn/`
  - Automatically consumes `--kui-color-action-primary` for background and `--kui-color-on-action-primary` for icon/spinner color.
  - In light mode: `#07AB3B` background with `#FDFDFD` white icon.
  - In dark mode: `#22C55E` background with `#052E16` dark forest green icon (WCAG AAA contrast ratio > 7:1).

---

## 9. Profile Appearance Settings Integration

- **`AppearanceSettingsComponent` (`kingdom-apps-appearance-settings`):**
  - Reuses `<kingdom-apps-section title="Aparência">` to maintain visual consistency with the `Administrador` card.
  - Houses the generic `<lib-radio-group>` bound to `ThemeService.preference()`.

---

## 10. Design Review & Feedback Record

For the complete log of review feedback items, root cause analyses, and architectural decisions, see [`apps/ministry-maps/backlog/dark-light-mode-feature/design-review-and-feedback.md`](../backlog/dark-light-mode-feature/design-review-and-feedback.md).
