import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts', '**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
    // Override or add rules here
    rules: {
      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: [
            // Fields
            'protected-static-field',
            'private-static-field',
            'public-static-field',
            'protected-field',
            'private-field',
            'public-field',
            'protected-decorated-field',
            'private-decorated-field',
            'public-decorated-field',
            // Getters
            'protected-get',
            'private-get',
            'public-get',
            // Constructor
            'constructor',
            // Methods
            'abstract-method',
            'protected-method',
            'static-method',
            'public-method',
            'private-method',
          ],
        },
      ],
    },
  },
];
