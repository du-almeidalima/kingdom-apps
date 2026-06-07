# Kingdom Apps — Architecture

**Monorepo managed by Nx 22.6.5** (npm, Node 22, `--legacy-peer-deps`).

## Projects

| Project                   | Stack                                    | Purpose                                                    |
|---------------------------|------------------------------------------|------------------------------------------------------------|
| `apps/ministry-maps`      | Angular 21 PWA, Tailwind, SCSS, Jest     | Territory management SPA                                   |
| `libs/common-ui`          | Angular 21 standalone components         | Shared UI library (buttons, dialogs, icons, etc.)          |
| `functions/ministry-maps` | Node 22, Firebase Functions v2, plain JS | Serverless backend (single `deleteUser` callable function) |

## Dependency Wiring

```
ministry-maps (app)  —imports→  common-ui (lib)
ministry-maps (app)  —calls→    functions/ministry-maps (via @angular/fire)
```

TypeScript path alias `@kingdom-apps/common-ui` maps to `libs/common-ui/src/index.ts`.

## Architecture Patterns

1. **No custom API server** — the Angular app connects directly to Firebase (Auth, Firestore, Functions, Remote Config). In dev, all calls route to local emulators (Auth:9099, Firestore:8080, Functions:5001).
2. **Repository pattern** — abstract interfaces (`UserRepository`, `TerritoryRepository`, etc.) with Firebase datasource implementations, wired via Angular DI providers in `app.config.ts`.
3. **Standalone components** — `bootstrapApplication()`, no NgModules, lazy-loaded routes for features (home, territories, work, users, profile, configuration).
4. **State management** — lightweight `BehaviorSubject`-based services, with `AuthUserStateService` shared via `common-ui`.
5. **Role-based auth** — 6 roles (`APP_ADMIN`, `ADMIN`, `ELDER`, `ORGANIZER`, `SUPERINTENDENT`, `PUBLISHER`), enforced via route guards and an `authorize` structural directive.
6. **PWA** — service worker (`ngsw-config.json`), manifest, offline support via `@angular/pwa`.
7. **CI/CD** — GitHub Actions → `nx affected -t test` → `nx affected -t deploy` → Firebase Hosting.

## Firebase Services

| Service                | Usage                                                                                            |
|------------------------|--------------------------------------------------------------------------------------------------|
| **Auth**               | Google + Microsoft OAuth providers                                                               |
| **Cloud Firestore**    | Primary DB: `users`, `congregations`, `territories`, `designations`, `invitation_links`, `notes` |
| **Cloud Functions v2** | One callable: `deleteUser` (validates role, deletes Auth user)                                   |
| **Remote Config**      | Feature flags / remote settings                                                                  |
| **Hosting**            | Two targets: `du-ministry-maps` (prod), `du-ministry-maps-beta` (beta)                           |

## Build & Dev

- Env vars prefixed `NX_*` injected via webpack `DefinePlugin` (not `process.env`).
- `.env.development` holds emulator values; GitHub secrets for CI deploys.
- Dev: `npm start` runs emulators + `nx serve` concurrently.
- Firebase Emulator Suite: Firestore (8080), Auth (9099), Functions (5001), Hosting (5000), UI (4000).
- Seed data: `tools/executors/firebase-emulator/seed/`.
