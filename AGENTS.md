# Kingdom Apps

## Core Principles (Always Active)
- **Standalone Components Only**: No NgModules.
- **Use `inject()` Function**: NEVER use constructor injection.
- **Path Aliases Required**: Use `@kingdom-apps/` aliases (e.g., `@kingdom-apps/common-ui`).
- **File Naming**: Always `kebab-case`.
- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, etc.
- **libs/common-ui**: UI components only, NO application-specific logic.

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
Refer to these rules based on your current task context.
- **Frontend**: `.ai/rules/frontend/`
  - `angular-components.md` - Component patterns
  - `angular-services.md` - Services, DI, state
  - `styling.md` - SCSS, Tailwind
  - `unit-testing.md` - Jest + ng-mocks
  - `e2e-testing.md` - Playwright + Firebase Emulator (see also `apps/ministry-maps/e2e/README.md`)
- **Backend**: `.ai/rules/backend/`
  - `firebase-functions.md` - Cloud Functions v2
  - `firestore.md` - Database patterns
- **Architecture**: `.ai/rules/architecture/`
  - `monorepo.md` - Nx structure
  - `common-ui.md` - Shared library
  - `repositories.md` - Data access pattern
- **Workflow**: `.ai/rules/workflow/`
  - `development.md` - Dev environment
  - `git-commits.md` - Git standards
  - `deployment.md` - Build & deploy

## Architecture

- `apps/ministry-maps/` — Angular 21 PWA (Tailwind + SCSS, Jest)
- `libs/common-ui/` — shared UI library (no app logic)
- `functions/ministry-maps/` — Cloud Functions v2 (JS, Node 22, separate package.json/lockfile)
- `tools/executors/firebase-emulator/seed/` — Firestore + Auth emulator seed data

## Commands

- `npm start` — Emulators + serve
- `npx nx test <project>` — Single project tests
- `npx nx affected -t test` — CI: test changed only
- `npx nx graph` — Dependency graph

## Gotchas

- `npm ci` / `npm install` needs `--legacy-peer-deps` (Angular 21 + Firebase RC dep conflicts)
- `NX_*` env vars injected via custom webpack DefinePlugin (not `process.env` at runtime); `.env.development` has emulator values
- ESLint: flat config (`eslint.config.mjs`) for Angular; legacy `.eslintrc.js` for Functions
- Firebase Hosting: `prod` → `du-ministry-maps`, `beta` → `du-ministry-maps-beta`
