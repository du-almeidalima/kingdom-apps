# Kingdom Apps — Architecture

This document records stable system boundaries. See [`README.md`](./README.md) for setup and
commands. The current baseline is Angular 21, Nx 22, and Node.js 22.

## System topology

```text
Angular PWA ──imports──> common-ui
     │
     ├──> Firebase Auth
     ├──> Cloud Firestore
     ├──> Remote Config
     └──> Functions ──> Firebase Admin SDK
           ├── callable (deleteUser, provisionUserFromInvite)
           └── scheduled (closeDesignationsHeaders, daily 12:00 America/Sao_Paulo)
```

There is no custom API server. The browser uses Firebase directly; privileged operations belong in
Cloud Functions or another trusted backend.

## Workspace units

| Path                                | Nx project          | Responsibility                                                      |
| ----------------------------------- | ------------------- | ------------------------------------------------------------------- |
| `apps/ministry-maps`                | `ministry-maps`     | Angular PWA, unit tests, and Playwright E2E suite.                  |
| `libs/common-ui`                    | `common-ui`         | Generic UI components, directives, styles, and non-domain UI state. |
| `functions/ministry-maps`           | —                   | Separate Node 22 Firebase Functions v2 codebase.                    |
| `tools/executors/firebase-emulator` | `firebase-emulator` | Local emulator orchestration and baseline seed.                     |

`functions/ministry-maps` is deployed by Firebase rather than Nx and has its own `package.json` and
lockfile.

## Frontend structure

- **Bootstrap and components:** the app uses `bootstrapApplication()` and standalone components.
  A legacy route NgModule remains under the work feature; do not add new NgModules.
- **Feature loading:** top-level features are lazy-loaded from `app-routes.ts`.
- **Data access:** repository abstractions are registered in `repositories-providers.ts`; Firebase
  datasource services implement them.
- **State:** focused services use RxJS subjects and Angular signals rather than a global store.
- **Shared UI:** cross-project imports use `@kingdom-apps/common-ui`, whose public API is
  `libs/common-ui/src/index.ts`. Ministry Maps domain logic stays in the app.
- **PWA:** production builds register the Angular service worker configured by `ngsw-config.json`.

## Firebase boundary

| Service            | Usage                                                                                                                                                                                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth               | Google and Microsoft OAuth; emulator custom-token sign-in is exposed only in local development.                                                                                                                                                                                                      |
| Cloud Firestore    | Primary application data, accessed through repositories. `logs` and `designations` are TTL-deleted (~6 months); `designations_header` follows the same policy and holds the resumable assignment cycles.                                                                                             |
| Cloud Functions v2 | The `deleteUser` callable performs privileged Firebase Auth deletion; the `provisionUserFromInvite` callable provisions users from invites; the `closeDesignationsHeaders` scheduled function (v2 `onSchedule`) closes every `IN_PROGRESS` `designations_header` daily at 00:00 `America/Sao_Paulo`. |
| Remote Config      | Runtime configuration; no local emulator is wired in `app.config.ts`.                                                                                                                                                                                                                                |
| Hosting            | `prod` targets `du-ministry-maps`; `beta` targets `du-ministry-maps-beta`.                                                                                                                                                                                                                           |

The application models six roles: `APP_ADMIN`, `ADMIN`, `ELDER`, `ORGANIZER`, `SUPERINTENDENT`, and
`PUBLISHER`. Route guards and `libAuthorize` control client navigation and visibility; they are not a
backend security boundary. Firestore security rules are not versioned in this repository.

The authoritative collection shapes and invariants are documented in
[`apps/ministry-maps/docs/domain/data-model.md`](./apps/ministry-maps/docs/domain/data-model.md).

## Environments

- `NX_*` values are embedded at build time by the esbuild `define` plugin at
  `apps/ministry-maps/tools/esbuild/define-env.plugin.js`; they are not
  read dynamically from the deployed browser environment.
- Local development connects Auth (`9099`), Firestore (`8080`), and Functions (`5001`) to emulators.
  The Emulator UI runs on `4000`.
- **Triggering scheduled functions locally:** v2 `onSchedule` functions are HTTP-invoked in production
  (Cloud Scheduler → authenticated HTTP POST), and the Functions emulator mirrors that: the scheduled
  function is served at the trigger-key route `POST http://127.0.0.1:5001/<project>/<region>/<name>-0`.
  Note the plain function name 404s and the Pub/Sub emulator does **not** help: on firebase-tools 14.x a
  v2 scheduled function registers the topic `firebase-schedule-<name>` on the Pub/Sub emulator, but its
  trigger signature is `http`, so topic publishes are acked without executing (verified on 14.27.0).
- `apps/ministry-maps/.env.development` contains local defaults. CI supplies deployment values through
  GitHub secrets and variables.
- Emulator seed data lives in `tools/executors/firebase-emulator/seed`.

## CI/CD

GitHub Actions runs affected unit tests, a separate full emulator-backed E2E job, and deployment of
affected deployable projects on pushes to `main`. The E2E job intentionally does not gate deployment.
Firebase Hosting serves the production PWA from `dist/apps/ministry-maps`.
