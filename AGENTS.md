# Kingdom Apps — Agent Guide

Repository-wide instructions for coding agents. [`README.md`](./README.md) has setup and common commands; [`ARCHITECTURE.md`](./ARCHITECTURE.md) records system boundaries and the Firebase topology.

## Core Rules

- **Standalone + zoneless Angular:** write standalone `OnPush` components with `inject()`, signal inputs/outputs/queries, and `host` objects. Mutate async callback state through signals; use Jest fake timers in unit tests (`setupZonelessTestEnv`).
- **npm + Node 22:** run workspace tasks via `npx nx …` (Java 21 required for Firebase emulators).
- **Lean dependencies:** reuse `@kingdom-apps/common-ui` (the only cross-project path alias; intra-app imports stay relative) or build with standalone components + design tokens before adding packages. Keep `common-ui` generic and domain-free.
- **UI copy is pt-BR:** keep user-facing Brazilian Portuguese strings verbatim (selectors in tests rely on them).
- **Preserve scope:** smallest change that satisfies the task; follow `.agents/rules/git-commits.md` for Conventional Commits.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## Nx Workspace

- Run tasks through `npx nx` (`npx nx run`, `npx nx run-many`, `npx nx affected`) and use the Nx MCP tools (`nx_docs` for unfamiliar flags or advanced config). See `.agents/rules/monorepo.md` for projects and targets.

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
- `NX_*` values are injected at build time (esbuild `define` via `apps/ministry-maps/tools/esbuild/define-env.plugin.js`) from `apps/ministry-maps/.env.development`/`.env.production` — not read dynamically in the browser.
- Root flat ESLint config covers the Angular workspace; Functions has its own `functions/ministry-maps/eslint.config.mjs`.
- `npm start` imports the emulator seed on start and exports it back on graceful exit; snapshot manually with `npx firebase emulators:export tools/executors/firebase-emulator/seed --force`.
- Deploy order when both change: functions first, then Firestore rules. Hosting deploys happen in CI on merge to `main`.
- `npx nx build ministry-maps` is a **production** build (default configuration).
- The `angular-cli` MCP server works only for docs/best-practices/examples tools. `list_projects` fails (schema error) because this Nx workspace has no `angular.json` — use Nx MCP/tooling for workspace queries instead, and omit `workspacePath` args.

<!-- CODEGRAPH_START -->

## CodeGraph

When `.codegraph/` exists, query `codegraph_explore` (or `codegraph explore "<query>"`) before `grep`/`read`. When `.codegraph/` is absent, use standard file tools.
<!-- CODEGRAPH_END -->

## Agent skills

### Issue tracker

Local markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context layout routed through root `GLOSSARY-MAP.md`. See `docs/agents/domain.md`.
