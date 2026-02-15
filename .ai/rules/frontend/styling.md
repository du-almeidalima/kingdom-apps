---
applyTo:
  - "**/*.scss"
  - "**/*.css"
  - "**/styles/**"
  - "**/tailwind.config.js"
instruction: "Apply these rules when working with styles (SCSS, Tailwind CSS)."
---

# Styling Guidelines

## Technology Stack

- **Primary:** Tailwind CSS (utility-first)
- **Secondary:** SCSS (for complex styles)
- **Architecture:** 7-1 Pattern for SCSS organization
- **Component Styles:** SCSS with scoped styles

## Tailwind CSS

### Usage Priority
1. **First choice:** Use Tailwind utility classes
2. **Second choice:** SCSS for complex/reusable styles
3. **Last resort:** Inline styles (avoid)

### Common Tailwind Patterns

#### Layout
```html
<div class="flex items-center justify-between gap-4">
  <div class="flex-1">Content</div>
  <button class="px-4 py-2">Action</button>
</div>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- Grid items -->
</div>
```

#### Spacing
```html
<div class="p-4 m-2">     <!-- padding: 1rem, margin: 0.5rem -->
<div class="px-6 py-3">   <!-- horizontal & vertical padding -->
<div class="mt-4 mb-2">   <!-- margin-top & margin-bottom -->
<div class="space-y-4">   <!-- vertical spacing between children -->
```

#### Typography
```html
<h1 class="text-2xl font-bold text-gray-900">
<p class="text-sm text-gray-600 leading-relaxed">
<span class="text-xs uppercase tracking-wide">
```

#### Colors
```html
<div class="bg-blue-500 text-white">
<div class="bg-gray-100 text-gray-900">
<button class="bg-indigo-600 hover:bg-indigo-700">
```

#### Responsive Design
```html
<div class="text-sm md:text-base lg:text-lg">
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
<div class="hidden md:block">              <!-- hide on mobile -->
<div class="block md:hidden">              <!-- show only on mobile -->
```

### Tailwind Configuration
Located in `apps/ministry-maps/tailwind.config.js`:

```javascript
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors
      },
      spacing: {
        // Custom spacing
      }
    },
  },
  plugins: [],
}
```

## SCSS 7-1 Architecture

### Directory Structure

Both `apps/ministry-maps/src/styles/` and `libs/common-ui/src/lib/styles/` follow this pattern:

```
styles/
├── abstract/           # Variables, mixins, functions
│   ├── _variables.scss
│   ├── _breakpoints.scss
│   └── _index.scss
├── base/               # Base styles, resets
│   ├── _resets.scss
│   ├── _typography.scss
│   ├── _base.scss
│   ├── _layout.scss
│   └── _index.scss
├── components/         # Component-specific styles
│   ├── _form-control.scss
│   ├── _menu.scss
│   └── _index.scss
└── index.scss          # Main entry (imports all)
```

### Main Entry Point

**`libs/common-ui/src/lib/styles/index.scss`:**
```scss
@forward "./abstract";
@forward "./base";
@forward "./components";
```

**`apps/ministry-maps/src/styles/main.scss`:**
```scss
@use './components/index' as *;

@layer mm-base;

@import '@angular/cdk/overlay-prebuilt.css';

@tailwind utilities;
```

### Loading Order (project.json)
```json
"styles": [
  "libs/common-ui/src/lib/styles/index.scss",
  "apps/ministry-maps/src/styles/main.scss"
]
```

## SCSS Best Practices

### Use @use and @forward (Not @import)
```scss
// ✅ CORRECT
@use '../abstract/variables' as vars;
@use '../abstract/breakpoints' as bp;

.my-component {
  color: vars.$primary-color;
  @include bp.respond-to('tablet') {
    font-size: 1.2rem;
  }
}

// ❌ AVOID (deprecated)
@import '../abstract/variables';
```

### Variables
```scss
// abstract/_variables.scss
$primary-color: #3b82f6;
$secondary-color: #10b981;
$text-dark: #1f2937;
$text-light: #6b7280;

$spacing-xs: 0.25rem;
$spacing-sm: 0.5rem;
$spacing-md: 1rem;
$spacing-lg: 1.5rem;
$spacing-xl: 2rem;

$border-radius: 0.375rem;
$transition-speed: 150ms;
```

### Mixins
```scss
// abstract/_breakpoints.scss
$breakpoints: (
  'mobile': 320px,
  'tablet': 768px,
  'desktop': 1024px,
  'wide': 1280px
);

@mixin respond-to($breakpoint) {
  @if map-has-key($breakpoints, $breakpoint) {
    @media (min-width: map-get($breakpoints, $breakpoint)) {
      @content;
    }
  }
}
```

Usage:
```scss
.my-component {
  font-size: 0.875rem;

  @include respond-to('tablet') {
    font-size: 1rem;
  }

  @include respond-to('desktop') {
    font-size: 1.125rem;
  }
}
```

### Nesting (Use Sparingly)
```scss
// ✅ GOOD - Max 3 levels deep
.card {
  padding: 1rem;

  &__header {
    font-weight: bold;
  }

  &__body {
    color: gray;
  }

  &--highlighted {
    background: yellow;
  }
}

// ❌ BAD - Too deep
.card {
  .header {
    .title {
      .text {
        .icon {
          // Too nested!
        }
      }
    }
  }
}
```

## Component Styles

### Scoped Component Styles
Component SCSS files are automatically scoped:

```scss
// my-component.component.scss
:host {
  display: block;
  padding: 1rem;
}

.container {
  background: white;
  border-radius: 0.5rem;
}

.title {
  font-size: 1.5rem;
  font-weight: bold;
}
```

### :host Selector
```scss
// Apply styles to the component itself
:host {
  display: block;
}

// Conditional styling
:host(.active) {
  background: blue;
}

:host-context(.dark-theme) {
  color: white;
}
```

### Combining Tailwind with Component SCSS
```html
<!-- Template -->
<div class="flex items-center p-4">
  <div class="custom-element">
    Content
  </div>
</div>
```

```scss
// Component SCSS for custom styles
.custom-element {
  // Complex styles that Tailwind doesn't cover
  background: linear-gradient(to right, #3b82f6, #10b981);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: translateY(-2px);
    transition: transform 0.2s ease;
  }
}
```

## Global Styles

### Base Styles
```scss
// base/_base.scss
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  line-height: 1.6;
}
```

### Typography
```scss
// base/_typography.scss
h1, h2, h3, h4, h5, h6 {
  margin: 0 0 1rem 0;
  font-weight: 600;
  line-height: 1.2;
}

h1 { font-size: 2.5rem; }
h2 { font-size: 2rem; }
h3 { font-size: 1.75rem; }
h4 { font-size: 1.5rem; }
h5 { font-size: 1.25rem; }
h6 { font-size: 1rem; }

p {
  margin: 0 0 1rem 0;
}
```

### Component-Specific Global Styles
```scss
// components/_form-control.scss
.form-control {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  transition: border-color 150ms ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &--error {
    border-color: #ef4444;
  }
}
```

## CSS Layers

Use CSS layers to control cascade:

```scss
@layer mm-base {
  // Base styles that can be overridden
}

@layer components {
  // Component styles
}

@layer utilities {
  // Utility classes
}
```

## Responsive Design

### Mobile-First Approach
```scss
// Start with mobile styles
.component {
  font-size: 0.875rem;
  padding: 0.5rem;

  // Tablet and up
  @media (min-width: 768px) {
    font-size: 1rem;
    padding: 1rem;
  }

  // Desktop and up
  @media (min-width: 1024px) {
    font-size: 1.125rem;
    padding: 1.5rem;
  }
}
```

### Tailwind Breakpoints
- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px
- `2xl:` - 1536px

## Animations

### CSS Transitions
```scss
.button {
  transition: all 150ms ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
}
```

### CSS Animations
```scss
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 300ms ease-out;
}
```

### Tailwind Animations
```html
<div class="transition duration-150 ease-in-out hover:scale-105">
<div class="animate-pulse">
<div class="animate-spin">
```

## Dark Mode (Future)

Prepare for dark mode support:

```scss
:root {
  --bg-primary: #ffffff;
  --text-primary: #000000;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1f2937;
    --text-primary: #ffffff;
  }
}

.component {
  background: var(--bg-primary);
  color: var(--text-primary);
}
```

## Performance

### Avoid Expensive Properties
```scss
// ❌ SLOW
.component {
  filter: blur(10px);
  box-shadow: 0 0 100px rgba(0,0,0,0.5);
}

// ✅ BETTER
.component {
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
```

### Use `will-change` Sparingly
```scss
.animated-element {
  will-change: transform;

  &:hover {
    transform: scale(1.05);
  }
}
```

### Minimize Reflows
```scss
// ✅ Use transform instead of position
.element {
  transform: translateX(100px);
}

// ❌ Triggers reflow
.element {
  left: 100px;
}
```

## Common Patterns

### Card Component
```html
<div class="bg-white rounded-lg shadow-md p-6">
  <h3 class="text-xl font-bold mb-2">Title</h3>
  <p class="text-gray-600">Content</p>
</div>
```

### Button Variants
```html
<button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
  Primary
</button>

<button class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition">
  Secondary
</button>
```

### Form Field
```html
<div class="space-y-2">
  <label class="block text-sm font-medium text-gray-700">
    Label
  </label>
  <input
    type="text"
    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  >
</div>
```

## Checklist

Before committing styles:
- ✅ Tailwind utilities used where possible
- ✅ SCSS follows 7-1 architecture
- ✅ Using `@use` instead of `@import`
- ✅ Nesting max 3 levels deep
- ✅ Mobile-first responsive design
- ✅ No hardcoded colors (use variables or Tailwind)
- ✅ Animations are performant
- ✅ Styles are scoped appropriately
- ✅ No duplicate styles
- ✅ Accessible color contrasts
