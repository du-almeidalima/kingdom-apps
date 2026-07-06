# E2E Testing Foundation — Ministry Maps

End-to-end tests for the `ministry-maps` Angular PWA, running against the
**real Firebase emulators** (Firestore + Auth) with **no mocks**. Seeding and
assertions use the Firebase Admin SDK in Playwright's Node context.

## Quick Start

```bash
# Install browsers (one-time)
npx playwright install chromium

# Run all E2E tests (boots emulators, serves app, runs specs)
npx nx e2e ministry-maps
```

The Playwright `webServer` in `playwright.config.ts` runs:
`firebase emulators:exec "nx serve ministry-maps" --project du-ministry-maps`
— it starts the emulators, serves the app at `http://localhost:4200`, runs the
specs, and shuts everything down.

## Architecture

```
apps/ministry-maps/e2e/
├── README.md                     ← this file
├── config/                       ← composable configuration
│   ├── emulator.config.ts        # ports, project id, REST clear URLs
│   ├── firebase-admin.context.ts # Admin SDK bootstrap (firestore, auth, collections)
│   └── auth.config.ts            # role→uid map, default password
├── firebase/                     ← utility layer (runs in Node)
│   ├── firestore-read.util.ts    # getDoc, getCollectionDocs, queryWhere, etc.
│   ├── refs.util.ts              # DocumentReference builders (congregationRef, etc.)
│   ├── reset.util.ts             # REST wipe of Firestore + Auth emulators
│   └── custom-token.util.ts      # mintCustomToken(uid) via Admin SDK
├── seed/                         ← composable data seeding
│   ├── types.ts                  # SeedDefinition, *Seed types
│   ├── seeder.ts                 # write(def) → Firestore + Auth emulators
│   ├── default.seed.ts           # DEFAULT_SEED_IDS + buildDefaultSeed()
│   └── factories/                # buildCongregation, buildUser, buildTerritory, etc.
├── fixtures/                     ← Playwright fixture wiring
│   ├── database.fixture.ts       # resetAndSeed (auto), seed, db
│   ├── auth.fixture.ts           # signInAs(role) — custom-token auth
│   └── index.ts                  # composed test + expect (import from here!)
├── page-objects/                 ← page abstractions
│   ├── base.page.ts              # shared navigation helpers
│   └── territories.page.ts       # territories page locators
└── tests/
    ├── smoke.spec.ts             # baseline integrity checks
    └── territories.spec.ts       # authenticated territory list proof
```

## Configuration (`config/`)

| Module                      | Purpose                                                                                                                                                       |
|-----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `emulator.config.ts`        | Single source of truth for ports (`8080`, `9099`, `5001`), project id (`du-ministry-maps`), and derived REST URLs. Keep in sync with `firebase.json`.         |
| `firebase-admin.context.ts` | Sets env vars (`FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`), initializes the Admin app once, and exports `firestore`, `auth`, and `Collections`. |
| `auth.config.ts`            | Maps test roles (`admin`, `publisher`) to seeded uids from `DEFAULT_SEED_IDS`.                                                                                |

## Seeding (`seed/`)

### The Default Baseline

Before every test the database fixture resets the emulators and applies the
**default baseline**: 1 congregation, 4 users (1 ADMIN + 3 PUBLISHERs), 3
territories (with visit history), and 1 designation.

### Factory Usage

Each factory returns a fully-typed `*Seed` payload with realistic Brazilian
defaults and accepts a `Partial` override:

```typescript
import { test, expect } from '../fixtures';

test('on-demand seeding', async ({ seed, db }) => {
  const territory = seed.factories.buildTerritory({
    congregationId: seed.ids.congregation,
    city: 'Campinas',
    address: 'Rua Inventada, 999',
    history: [
      seed.factories.buildVisitHistory({ notes: 'Morador interessado.' }),
    ],
  });

  await seed.write({
    congregations: [],
    users: [],
    territories: [territory],
    designations: [],
  });

  const stored = await db.getDoc(db.collections.territories, territory.id);
  expect(stored?.city).toBe('Campinas');
});
```

### Firestore Storage Contract (critical)

The seeder enforces the app's real storage shape:

1. **`User.congregation`** is a `DocumentReference` — never a plain string.
2. **Auth/Firestore uid parity** — `auth.createUser({ uid: userDocId })` with
   the same id as the Firestore document.
3. **Dates** are plain `Date`s — the Admin SDK auto-converts to `Timestamp`.
4. **Territory history** lives in `territories/{id}/history` subcollection;
   `recentHistory` (latest 5, desc) and `lastVisit` are derived on the parent.

## Fixtures

### Importing

All specs **must** import `test` and `expect` from `fixtures/index.ts` (never
directly from `@playwright/test`):

```typescript
import { test, expect } from '../fixtures';
```

### Available Fixtures

| Fixture        | Type                      | Description                                     |
|----------------|---------------------------|-------------------------------------------------|
| `resetAndSeed` | auto                      | Wipes + re-seeds before every test.             |
| `seed`         | `SeedApi`                 | Factories, `write()`, `buildDefault()`, `ids`.  |
| `db`           | `DbApi`                   | Firestore/Auth handles, refs, and read helpers. |
| `signInAs`     | `(role) => Promise<Page>` | Signs into the app as a seeded user.            |

### `db` — Read / Assertion API

```typescript
test('check Firestore', async ({ db, seed }) => {
  const data = await db.getDoc(db.collections.territories, seed.ids.territories[0]);
  const snapshot = await db.getDocSnapshot(db.collections.users, seed.ids.adminUser);
  const all = await db.getCollectionDocs(db.collections.congregations);

  // Subcollection reads
  const history = await db.getSubcollectionDocs(
    db.collections.territories,
    territoryId,
    db.historySubcollection,
  );

  // Query helper
  const results = await db.queryWhere(db.collections.users, 'role', '==', 'ADMIN');
});
```

### `signInAs` — Authenticated Pages

```typescript
test('guarded route', async ({ signInAs, page }) => {
  await signInAs('admin');         // mints token, signs in, waits for redirect
  await page.goto('/territories');
  // ...assertions on the guarded page
});
```

Supported roles: `'admin'` (ADMIN user), `'publisher'` (PUBLISHER user).

## Auth Strategy

The E2E tests establish a **real Firebase session** against the **Auth emulator**
using the **custom-token + storageState** approach:

1. The Playwright fixture calls `mintCustomToken(uid)` via the Admin SDK (Node
   context).
2. It navigates the browser to `/login` and waits for `window.__E2E__` — a
   development-only hook exposed by the app when connected to the Auth
   emulator.
3. It calls `signInWithCustomToken(auth, token)` in the browser, which
   authenticates the user against the emulator.
4. The Angular auth guard sees the now-authenticated user, resolves their
   Firestore document, and redirects away from `/login`.

**Important:** The `window.__E2E__ = { auth, signInWithCustomToken }` hook is
**strictly gated** to `environment.env === 'development' && !environment.useCloud`
in `app.config.ts` — it never ships to production.

## Page Objects (`page-objects/`)

Page objects encapsulate navigation and locators:

```typescript
import { TerritoriesPage } from '../page-objects/territories.page';

const territoriesPage = new TerritoriesPage(page);
await territoriesPage.goto();
await expect(territoriesPage.heading).toBeVisible();
const count = await territoriesPage.count();
```

Locators use `data-testid` attributes (not text content) for robustness.

## Running Tests

```bash
# Complete suite
npx nx e2e ministry-maps

# Install/update browsers
npx playwright install chromium

# Run with UI
npx playwright test --ui --config apps/ministry-maps/playwright.config.ts
```

## Adding New Tests

1. Create a page object in `page-objects/` if the route doesn't have one.
2. Create a spec in `tests/` importing from `../fixtures`.
3. Use `seed.factories.*` for on-demand data via `seed.write()`.
4. Assert both UI state (via page objects) and Firestore state (via `db.*`).
5. For guarded routes, call `signInAs(role)` first.

## Out of Scope (Future)

- CI pipeline wiring (GitHub Actions).
- Broad feature test suites beyond the smoke + territories proof.
- Exercising the real `signInWithPopup` OAuth flow.
- Cross-test session reuse (currently sign-in per test).
