# Kingdom Apps — Agent Guide

Repository-wide instructions for coding agents. [`README.md`](./README.md) has setup and common commands; [`ARCHITECTURE.md`](./ARCHITECTURE.md) records system boundaries and the Firebase topology.

## Core Rules

- **Standalone Angular only:** no NgModules in new code. Existing feature-routing NgModules are migration debt, not examples to copy.
- **Zoneless + signals:** no Zone.js anywhere (no `zone.js` polyfill, `provideZoneChangeDetection`, or `NgZone`). Every component is OnPush; use signal inputs/outputs/queries and `host` objects. State mutated in async callbacks (subscribe/finalize) must be a signal or it won't render. Unit tests run zoneless (`setupZonelessTestEnv`) — `fakeAsync`/`tick` don't work; use jest fake timers.
- **Prefer `inject()`** for new dependency injection. Legacy constructor DI exists in older files — don't copy it, don't mass-migrate it.
- **npm + Node 22:** use `npm`/`npx` (e.g. `npx nx … ministry-maps`); never introduce another package manager. Java 21 is required for the Firebase emulators.
- **Lean dependencies:** keep third-party packages minimal. Before adding one, check whether `common-ui` already provides the component or the shared styles cover it; otherwise build it yourself (standalone + Tailwind/SCSS + design tokens). Adopt a library only when its logic is complex enough that maintaining it in-house would cost more than the dependency's weight.
- **Path aliases:** cross-project imports use `@kingdom-apps/common-ui` (the only alias). Intra-app imports stay relative.
- **kebab-case files**, one folder per component, files named after the folder.
- **Keep `common-ui` generic:** no Ministry Maps domain models, business logic, or feature-specific UI.
- **UI copy is pt-BR:** Ministry Maps user-facing strings are Brazilian Portuguese — keep quoted UI text verbatim (selectors in tests rely on it).
- **Conventional commits:** `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:` — vocabulary and scopes in `.agents/rules/git-commits.md`.
- **Preserve scope:** smallest change that satisfies the task; no unrelated refactors.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

## Contextual Rules Index

Rules live in `.agents/rules/`. oh-my-pi and Antigravity load them natively, scoped by the frontmatter `globs`; other harnesses should read the rules relevant to the files being changed:

| Context                                | Rules                                                                 |
|----------------------------------------|-----------------------------------------------------------------------|
| Components, services, state            | `.agents/rules/angular-components.md`, `angular-services.md`          |
| Styling, theming, tokens               | `.agents/rules/styling.md`                                            |
| Unit tests (ng-mocks + Jest)           | `.agents/rules/unit-testing.md`                                       |
| E2E (Playwright + emulators)           | `.agents/rules/e2e-testing.md` and `apps/ministry-maps/e2e/README.md` |
| Data access, Firestore, security rules | `.agents/rules/repositories.md`, `firestore.md`                       |
| Cloud Functions                        | `.agents/rules/firebase-functions.md`                                 |
| Nx workspace, project targets          | `.agents/rules/monorepo.md`                                           |
| Build, CI, deployment                  | `.agents/rules/deployment.md`                                         |
| Commits, branches, PRs                 | `.agents/rules/git-commits.md`                                        |
| Shared UI library internals            | `.agents/rules/common-ui.md`, `patterns.md`                           |

For Ministry Maps behavior or data changes, also read the relevant material under `apps/ministry-maps/docs/`.

## Verification

Use Nx through `npx`. Run the focused target first, then every relevant downstream target required by the change.

| Change                    | Minimum relevant checks                                                                                                                                                               |
|---------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `apps/ministry-maps`      | `npx nx test ministry-maps`, `npx nx lint ministry-maps`, `npx nx build ministry-maps`                                                                                                |
| `libs/common-ui`          | `npx nx test common-ui`, `npx nx lint common-ui`                                                                                                                                      |
| E2E                       | `npx nx typecheck-e2e ministry-maps`, then the relevant `npx nx e2e ministry-maps` scope                                                                                              |
| `functions/ministry-maps` | `npm --prefix functions/ministry-maps run lint`, `npm --prefix functions/ministry-maps test`, `npm --prefix functions/ministry-maps run build` plus an emulator-backed behavior check |
| Documentation only        | Validate changed links and commands; run `git diff --check`                                                                                                                           |

Add or update tests for behavior changes. Do not weaken, skip, or delete a failing test to make a change pass.

## Gotchas

- `functions/ministry-maps` is **not an Nx project**: separate manifest and lockfile, driven by `npm --prefix functions/ministry-maps run <script>`.
- `NX_*` values are injected at build time (webpack DefinePlugin) from `apps/ministry-maps/.env.development`/`.env.production` — not read dynamically in the browser.
- Root flat ESLint config covers the Angular workspace; Functions has its own `functions/ministry-maps/eslint.config.mjs`.
- `npm start` imports the emulator seed on start and exports it back on graceful exit; snapshot manually with `npx firebase emulators:export tools/executors/firebase-emulator/seed --force`.
- Deploy order when both change: functions first, then Firestore rules. Hosting deploys happen in CI on merge to `main`.
- `npx nx build ministry-maps` is a **production** build (default configuration).
- The `angular-cli` MCP server works only for docs/best-practices/examples tools. `list_projects` fails (schema error) because this Nx workspace has no `angular.json` — use Nx MCP/tooling for workspace queries instead, and omit `workspacePath` args.

<!-- CODEGRAPH_START -->

## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
