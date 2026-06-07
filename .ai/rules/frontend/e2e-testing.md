---
applyTo:
  - "**/e2e/**"
  - "**/playwright.config.ts"
instruction: "Apply these rules when writing or maintaining end-to-end (E2E) tests. The project uses Playwright + the Firebase Emulators (Firestore + Auth), with NO mocks — tests run against the real emulated backend and seed data via the Admin SDK."
---

# E2E Testing Guidelines

## Testing Framework

- **Runner:** Playwright (`@playwright/test`)
- **Backend:** Firebase Emulators (Firestore `8080`, Auth `9099`) — **no mocks**
- **Seeding / assertions:** `firebase-admin` (Admin SDK) running in Playwright's Node context
- **Location:** everything lives inside the app at `apps/ministry-maps/e2e/`
- **Config:** `apps/ministry-maps/playwright.config.ts` (`testDir: './e2e'`, `baseURL` `http://localhost:4200`)

## Philosophy

E2E tests run against a **real emulated Firebase**, never mocks. After a UI action you can (and should) assert persistence directly in Firestore via the Admin SDK. Every test starts from a **known, repeatable baseline** that is wiped and re-seeded automatically before each test, so tests are deterministic and order-independent.

> The E2E emulator starts **EMPTY**. The Playwright `webServer` boots the emulators with `firebase emulators:exec`, which (unlike the dev target) does **not** `--import` seed data. Admin SDK seeding is therefore the **sole** source of test data.

## Running E2E Tests

```bash
npx nx e2e ministry-maps          # boots emulators + serve via webServer, runs all specs
```

The `e2e` target is auto-inferred by `@nx/playwright/plugin` (no `project.json` target). The `webServer` runs:

```
npx firebase emulators:exec "npx nx serve ministry-maps" --project du-ministry-maps
```

> Playwright browsers must be installed once: `npx playwright install chromium`.

## Directory Structure

```
apps/ministry-maps/e2e/
├── fixtures/
│   └── database.fixture.ts        # import `test` & `expect` from here
├── helpers/
│   ├── admin-sdk.ts               # Admin SDK bootstrap + generic read helpers
│   ├── reset.ts                   # REST wipe of Firestore + Auth
│   ├── domain/                    # domain-specific DocumentReference helpers
│   │   ├── congregation.helper.ts
│   │   ├── territory.helper.ts
│   │   ├── user.helper.ts
│   │   ├── designation.helper.ts
│   │   └── index.ts               # barrel
│   └── seed/
│       ├── types.ts               # SeedDefinition / *Seed shapes
│       ├── seeder.ts              # writes a SeedDefinition to the emulators
│       ├── default.seed.ts        # DEFAULT_SEED_IDS + buildDefaultSeed()
│       └── factories/             # typed entity builders (+ index barrel)
└── tests/
    └── *.spec.ts                  # specs
```

## Golden Rule — Always Import From the Fixture

Never import `test`/`expect` directly from `@playwright/test`. Import from the database fixture so every spec gets the auto reset + seed and the `seed`/`db` helpers:

```typescript
import { test, expect } from '../fixtures/database.fixture';
```

The fixture's auto `resetAndSeed` runs **before every test**: it wipes Firestore + Auth, then applies the default baseline. You get two extra fixtures:

- **`seed`** — build & write extra data on demand (`SeedApi`)
- **`db`** — read Firestore back to assert state (`DbApi`)

## The `db` Fixture (assertion / read helpers)

| Member                                   | Purpose                                                  |
|------------------------------------------|----------------------------------------------------------|
| `db.firestore` / `db.auth`               | Raw Admin SDK handles                                    |
| `db.collections`                         | Collection names (`congregations`, `users`, `territories`, `designations`) |
| `db.historySubcollection`                | `'history'` subcollection name on a territory            |
| `db.getDoc(collection, id)`              | Document data, or `undefined`                            |
| `db.getDocSnapshot(collection, id)`      | Raw snapshot (inspect `DocumentReference` / `Timestamp`) |
| `db.getCollectionDocs(collection)`       | All docs of a collection                                 |
| `db.getSubcollectionDocs(coll, id, sub)` | All docs of a subcollection                              |
| `db.congregationRef(id)` etc.            | Typed `DocumentReference` helpers (`territoryRef`, `userRef`, `designationRef`, `territoryHistoryRef`) |

```typescript
test('default baseline is applied', async ({ db }) => {
  const territories = await db.getCollectionDocs(db.collections.territories);
  expect(territories).toHaveLength(3);
});
```

## The `seed` Fixture (build extra data on demand)

| Member               | Purpose                                                       |
|----------------------|---------------------------------------------------------------|
| `seed.factories`     | Typed builders (`buildCongregation`, `buildUser`, `buildTerritory`, `buildVisitHistory`, `buildDesignation`, `buildDesignationTerritory`) |
| `seed.write(def)`    | Writes a `SeedDefinition` to the emulators; returns created ids |
| `seed.buildDefault()`| Builds the default baseline definition                        |
| `seed.ids`           | Well-known ids of the default baseline (`DEFAULT_SEED_IDS`)   |

Reference the deterministic baseline ids instead of hard-coding strings:

```typescript
test('admin user belongs to the seeded congregation', async ({ db, seed }) => {
  const snapshot = await db.getDocSnapshot(db.collections.users, seed.ids.adminUser);
  expect(snapshot.data()?.['congregation'].path)
    .toBe(`${db.collections.congregations}/${seed.ids.congregation}`);
});
```

`DEFAULT_SEED_IDS`: `congregation`, `adminUser`, `publisherUsers[]`, `territories[]`, `designation`.

### Seeding extra data inside a test

Build with a factory (realistic defaults + `Partial` overrides), then `seed.write()`. Pass empty arrays for the entity types you are not adding:

```typescript
test('reads back an on-demand territory', async ({ db, seed }) => {
  const extra = seed.factories.buildTerritory({
    congregationId: seed.ids.congregation,
    city: 'Campinas',
  });

  await seed.write({ congregations: [], users: [], territories: [extra], designations: [] });

  const stored = await db.getDoc(db.collections.territories, extra.id);
  expect(stored?.['city']).toBe('Campinas');
});
```

## Factories

Each factory returns a realistic, fully-typed `*Seed` payload (typed against the real models in `apps/ministry-maps/src/models` and enums `RoleEnum`, `TerritoryIcon`, `VisitOutcomeEnum`, `DesignationStatusEnum`) and accepts a `Partial<...>` override:

```typescript
export function buildTerritory(over: Partial<TerritorySeed> = {}): TerritorySeed;
```

- Always set `congregationId` so entities link to a real congregation.
- Use real-world Brazilian cities, names, and addresses to match existing seed style.
- A territory's `history` is an array of `buildVisitHistory()` entries; the seeder derives `recentHistory`/`lastVisit` from it — usually you only override `history`.

## How the Seeder Maps to Firestore (critical contract)

`seed/seeder.ts` enforces the app's real storage shape. Respect these when extending it:

1. **`User.congregation` is a `DocumentReference`** to `/congregations/{congregationId}` — never a plain object/string. The seeder converts `congregationId` → ref via `congregationRef`.
2. **Auth/Firestore id parity:** a matching Auth emulator user is created with `uid === userDocId` (the app keys `users/{uid}` by the auth uid).
3. **Dates are stored as Firestore `Timestamp`s** — write plain JS `Date`s; the Admin SDK converts them automatically so the app's `.toDate()` converters work unchanged. Never write date strings.
4. **Territory history lives in a subcollection** `territories/{id}/history`; the parent doc carries `recentHistory` (latest 5, sorted desc) and `lastVisit`.

## Reset Between Tests

`helpers/reset.ts` wipes both emulators via their REST endpoints (handles subcollections atomically, idempotent on an empty emulator):

- `clearFirestore()` → `DELETE .../databases/(default)/documents`
- `clearAuth()` → `DELETE .../accounts`
- `resetEmulators()` → both in parallel

Emulator hosts/project id come from constants in `admin-sdk.ts` (`PROJECT_ID`, `FIRESTORE_EMULATOR_HOST`, `AUTH_EMULATOR_HOST`) — keep them in sync with `firebase.json`.

## Conventions

- **No mocks** — assert real Firestore state, not just the DOM.
- Admin SDK code runs **only** in Playwright's Node context, never in the browser.
- kebab-case filenames; small, focused modules; put domain-specific reference helpers under `helpers/domain/`, keep `admin-sdk.ts` generic.
- New specs go under `apps/ministry-maps/e2e/tests/` and import the fixture.

## Out of Scope (current follow-ups)

- Authenticated UI flows / logged-in `storageState` (the app uses `signInWithPopup`). Seeding **does** create matching Auth users so this is a future add-on.
- Page objects and full feature suites beyond smoke coverage; CI pipeline wiring.
