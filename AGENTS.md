# Kingdom Apps — Agent Guide

This file contains repository-wide instructions for coding agents. Use [`README.md`](./README.md) for setup and [`ARCHITECTURE.md`](./ARCHITECTURE.md) for system boundaries.

## Core Rules

- **Standalone Angular only:** new and modified components must be standalone; do not add NgModules. Existing feature-routing NgModules are migration debt, not examples to copy.
- **Use `inject()`:** do not add constructor injection. Avoid unrelated migrations of legacy code.
- **Use path aliases:** cross-project imports must use configured `@kingdom-apps/*` aliases (currently
  `@kingdom-apps/common-ui`).
- **Use `kebab-case`:** apply it to every new file name.
- **Keep `common-ui` generic:** no Ministry Maps domain models, business logic, or feature-specific UI.
- **Use conventional commits:** `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, and similar types.
- **Preserve scope:** make the smallest change that satisfies the task; do not refactor unrelated legacy code.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

## Contextual Rules Index

Read only the rules relevant to the files being changed:

| Context                               | Rules                                                                           |
|---------------------------------------|---------------------------------------------------------------------------------|
| Angular components, services, styling | `.ai/rules/frontend/angular-components.md`, `angular-services.md`, `styling.md` |
| Unit tests                            | `.ai/rules/frontend/unit-testing.md`                                            |
| E2E tests                             | `.ai/rules/frontend/e2e-testing.md` and `apps/ministry-maps/e2e/README.md`      |
| Firebase Functions or Firestore       | `.ai/rules/backend/firebase-functions.md`, `firestore.md`                       |
| Monorepo, shared UI, repositories     | `.ai/rules/architecture/monorepo.md`, `common-ui.md`, `repositories.md`         |
| Development, commits, deployment      | `.ai/rules/workflow/development.md`, `git-commits.md`, `deployment.md`          |

For Ministry Maps behavior or data changes, also read the relevant material under
`apps/ministry-maps/docs/`.

## Verification

Use Nx through the workspace package manager. Run the focused target first, then every relevant downstream target required by the change.

| Change                    | Minimum relevant checks                                                                                                                                                               |
|---------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `apps/ministry-maps`      | `npx nx test ministry-maps`, `npx nx lint ministry-maps`, `npx nx build ministry-maps`                                                                                                |
| `libs/common-ui`          | `npx nx test common-ui`, `npx nx lint common-ui`                                                                                                                                      |
| E2E                       | `npx nx typecheck-e2e ministry-maps`, then the relevant `npx nx e2e ministry-maps` scope                                                                                              |
| `functions/ministry-maps` | `npm --prefix functions/ministry-maps run lint`, `npm --prefix functions/ministry-maps test`, `npm --prefix functions/ministry-maps run build` plus an emulator-backed behavior check |
| Documentation only        | Validate changed links and commands; run `git diff --check`                                                                                                                           |

Add or update tests for behavior changes. Do not weaken, skip, or delete a failing test to make a change pass.

## Gotchas

- Root `npm ci` / `npm install` needs `--legacy-peer-deps` because of Angular 21 and Firebase RC peer dependencies.
- `functions/ministry-maps` has a separate package manifest and lockfile; install its dependencies separately when needed.
- `NX_*` values are injected at build time by webpack, not read dynamically in the browser.
- Angular uses the root flat ESLint config; Functions uses its own flat config `functions/ministry-maps/eslint.config.mjs`.
- Local Firebase seed data is imported and exported by the `firebase-emulator:serve` target.

<!-- CODEGRAPH_START -->

## CodeGraph

Use CodeGraph before generic text search or opening several files when locating or understanding code:

1. Run `codegraph status` at the repository root. Do not infer readiness from `.codegraph/`; the directory can exist before an index does.
2. If the index is usable, prefer the `codegraph_explore` MCP tool when available. Otherwise run
   `codegraph explore "<symbol names or question>"` from the shell.
3. If the index is stale, run `codegraph sync` and check its status again. If CodeGraph is unavailable or cannot provide the needed result, fall back to the normal repository search tools.

Name concrete symbols or files in queries when possible. The index is machine-local and intentionally ignored by Git; never commit its database, daemon files, sockets, or logs.

For an explicit environment-setup task, the portable one-time setup is:

```bash
npm install --global @colbymchenry/codegraph
codegraph init
codegraph status
```

<!-- CODEGRAPH_END -->
