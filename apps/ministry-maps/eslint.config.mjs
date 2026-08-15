import playwright from 'eslint-plugin-playwright';
import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'kingdomApps',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'kingdom-apps',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
  {
    files: ['**/*.ts', '**/*.js'],
    // Override or add rules here
    rules: {},
  },
  // Playwright rules, scoped to the e2e suite only. Kept LAST so its rule
  // overrides win over the base config (flat config: later entries take
  // precedence for matching files).
  {
    ...playwright.configs['flat/recommended'],
    // `**/e2e/` (not `e2e/`) so the block matches regardless of the cwd ESLint
    // is invoked from: `nx lint` runs from the workspace root, while a direct
    // `eslint .` runs from this project directory.
    files: ['**/e2e/**/*.ts'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-conditional-in-test': 'error',
      // Playwright fixtures with no dependencies are declared as
      // `async ({}, use) => ...` — the empty pattern is the idiom, not a bug.
      'no-empty-pattern': 'off',
    },
  },
];
