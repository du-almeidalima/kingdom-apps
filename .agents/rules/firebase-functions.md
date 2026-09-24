---
globs:
  - functions/**/*.ts
description: Firebase Cloud Functions v2 (TypeScript) — a standalone npm package, not an Nx project.
---

# Firebase Cloud Functions

## Ground rules

- **Not an Nx project** — no `project.json`, own manifest and lockfile. Everything runs via `npm --prefix functions/ministry-maps run <script>`: `build`, `build:watch`, `lint`, `test`, `deploy`, `backfill:ttl`. Never `nx run functions…`.
- TypeScript, Functions **v2**, Node 22. One callable per file in `src/functions/`, re-exported from `src/index.ts`.
- **Export name = callable name.** The frontend invokes by string: `httpsCallableData$(functions, 'deleteUser')` / `'provisionUserFromInvite'` — renaming an export breaks callers.
- Single Admin SDK init in `src/config/firebase.ts` (`db`, `auth`; emulator projectId fallback `du-ministry-maps`).

## Function shape

Copy `src/functions/provision-user.ts` (the reference implementation): `onCall<Request, Promise<Response>>`, check `request.auth` → `HttpsError`, log with `firebase-functions/logger`.

- **Authorization reads the caller's Firestore user doc** (`delete-user.ts`), not auth claims.
- Roles: `PUBLISHER | ORGANIZER | ELDER | ADMIN | SUPERINTENDENT | APP_ADMIN` (`src/models/user.ts`).
- Guarded mutations run inside `db.runTransaction` (e.g. invite consumption); `APP_ADMIN` can never be granted by invite.

## Layering

- `src/models/` (`UserDoc`/`PublicUser`) + `src/utils/user-mapper.ts` — never return raw Firestore docs to clients; congregation is a `DocumentReference`.
- One-off admin scripts live in `src/scripts/` (e.g. `backfill-ttl.ts`), run compiled via `npm run backfill:ttl`.

## Checks & deploy

- Lint: ESLint 9 flat config (`eslint.config.mjs`).
- Tests: standalone ts-jest (`jest.config.js`, node env), specs in `test/**/*.spec.ts` — not Nx jest.
- Deploy: `npm --prefix functions/ministry-maps run deploy` (`firebase deploy --only functions`; predeploy build wired in `firebase.json`). Deploy functions **before** Firestore rules.
