---
globs:
- '**/nx.json'
- '**/project.json'
- '**/workspace.json'
description: Nx workspace — which projects exist, what targets each has, and how each is driven.
---

# Nx Monorepo

## Projects and targets

| Path | Nx project | Targets | Driven by |
|---|---|---|---|
| `apps/ministry-maps` | `ministry-maps` | build, serve, test, lint, deploy, extract-i18n, e2e (+ e2e-ui, e2e-report, e2e-servers, typecheck-e2e) | `npx nx … ministry-maps` |
| `libs/common-ui` | `common-ui` | test, lint only | `npx nx … common-ui` |
| `tools/executors/firebase-emulator` | `firebase-emulator` | serve (emulators + seed import/export-on-exit) | `npx nx serve firebase-emulator` (or `npm start`) |
| `functions/ministry-maps` | — (no `project.json`) | — | `npm --prefix functions/ministry-maps run <script>` |

- The `e2e` target is registered by `@nx/playwright/plugin` in `nx.json`, not by `project.json`.
- Nx 22 + Angular 21; Nx Cloud is enabled.
- Command cheat-sheet: root `README.md` → "Common commands".

## Path aliases

Cross-project imports use `@kingdom-apps/common-ui` → `libs/common-ui/src/index.ts` (`tsconfig.base.json`). Intra-app imports stay relative — that alias is the only one.

## CI quick facts

Test gate is `npx nx affected -t test`; deployment runs only from `main` (see `.agents/rules/deployment.md`).
