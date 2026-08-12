# Kingdom Apps

Kingdom Apps is an Nx monorepo for applications that support ministry and congregation workflows. It is an independent project and is not affiliated with or endorsed by Jehovah's Witnesses or any related legal entity.

## Workspace

| Path                                | Purpose                                                                |
|-------------------------------------|------------------------------------------------------------------------|
| `apps/ministry-maps`                | Angular PWA for managing territories, designations, users, and visits. |
| `libs/common-ui`                    | Reusable, application-agnostic Angular UI.                             |
| `functions/ministry-maps`           | Firebase Functions v2 codebase with its own dependencies and lockfile. |
| `tools/executors/firebase-emulator` | Nx target and seed data for local Firebase emulators.                  |

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for system boundaries and runtime details.

## Prerequisites

- Node.js 22 (see [`.nvmrc`](./.nvmrc)) and npm.
- Java 21 for the Firebase Emulator Suite.

Nx and Firebase Tools are workspace dependencies; global installations are not required.

## Setup

With Node.js 22 active (`nvm use` if you use nvm):

```bash
npm ci --legacy-peer-deps
npm ci --prefix functions/ministry-maps
```

Install Chromium once before running E2E tests:

```bash
npx playwright install chromium
```

## CodeGraph (optional)

CodeGraph provides a machine-local semantic index for navigating the codebase. Install and initialize
it once from the repository root:

```bash
npm install --global @colbymchenry/codegraph
codegraph init
codegraph status
```

Use it during development to locate symbols and understand code paths:

```bash
codegraph explore "where is Firebase authentication configured?"
```

Run `codegraph status` before use and `codegraph sync` when the index is stale, such as after pulling
substantial code changes. The index and its runtime files are local development artifacts and must not
be committed.

## Local development

Start the Angular dev server and the Auth, Firestore, and Functions emulators together:

```bash
npm start
```

- App: <http://localhost:4200/>
- Firebase Emulator UI: <http://127.0.0.1:4000/>

Local values come from `apps/ministry-maps/.env.development`. To use Firebase cloud services, supply the real `NX_FIREBASE_*` values and set `NX_USE_CLOUD=true`; clear browser site data when switching between cloud and emulator modes.

### Emulator seed data

The `firebase-emulator:serve` target imports `tools/executors/firebase-emulator/seed` at startup and exports back to it on graceful shutdown. To snapshot the running emulators immediately:

```bash
npx firebase emulators:export tools/executors/firebase-emulator/seed --force
```

Commit intentional seed changes that application or test behavior depends on.

## Common commands

| Task                      | Command                              |
|---------------------------|--------------------------------------|
| Start app and emulators   | `npm start`                          |
| Build the app             | `npx nx build ministry-maps`         |
| Test the app              | `npx nx test ministry-maps`          |
| Test affected projects    | `npx nx affected -t test`            |
| Lint the app              | `npx nx lint ministry-maps`          |
| Type-check E2E tests      | `npx nx typecheck-e2e ministry-maps` |
| Run E2E tests             | `npm run e2e`                        |
| Open Playwright UI        | `npm run e2e:ui`                     |
| View project dependencies | `npx nx graph`                       |

## Documentation

- [`AGENTS.md`](./AGENTS.md) — repository rules for coding agents.
- [`apps/ministry-maps/docs/README.md`](./apps/ministry-maps/docs/README.md) — product behavior, domain model, test catalog, and developer follow-ups.
- [`apps/ministry-maps/e2e/README.md`](./apps/ministry-maps/e2e/README.md) — Playwright/Firebase harness and test workflow.
- [`.ai/rules/`](./.ai/rules) — context-specific implementation and workflow guidance.
