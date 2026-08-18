---
globs:
- '**/project.json'
- '**/ngsw-config.json'
- '**/firebase.json'
description: Builds, budgets, the CI pipeline, and Firebase deployment.
---

# Build & Deployment

## Builds

`npx nx build ministry-maps` is a **production** build by default (`defaultConfiguration: production`); pass `--configuration=development` for a dev build. Output `dist/apps/ministry-maps` (also the hosting root). Budgets: initial bundle warn 2MB / error 2.5MB; component styles 4KB / 8KB.

## CI (`.github/workflows/ci.yml`)

- **main** — `nx affected -t test`.
- **e2e** — Node 22 + Java 21; functions `lint`/`test`/`build`; `typecheck-e2e`; Playwright vs emulators. Deliberately **not** a deploy gate.
- **deploy** — on push to `main`: affected projects with a `deploy` target run `nx run <proj>:deploy --configuration=production` with `FIREBASE_TOKEN` + `NX_FIREBASE_*` secrets and `NX_ENV=production`.

## Deploying

- Hosting: `npx nx deploy ministry-maps` (@angular/fire:deploy). Channels `prod` and `beta`, both serving `dist/apps/ministry-maps` — SPA rewrite, immutable 1y cache for hashed js/css, no-cache for `ngsw-worker.js`/`ngsw.json`.
- Functions: `npm --prefix functions/ministry-maps run deploy`. Order: **functions first, then Firestore rules**.
- Normal flow is hands-off: merges to `main` deploy via CI.

## Emulator & seed workflow (dev)

`npm start` runs the app (`:4200`) + emulators (auth `9099`, firestore `8080`, functions `5001`, UI `4000`) with seed auto-import from `tools/executors/firebase-emulator/seed` and auto-export on graceful exit. Manual snapshot: `npx firebase emulators:export tools/executors/firebase-emulator/seed --force`. Commit intentional seed changes that behavior depends on.

## PWA

Service worker via `ngsw-config.json`; manifest `public/manifest.webmanifest`; icons under `public/icons/`.
