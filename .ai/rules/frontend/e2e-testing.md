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

> **Use-case catalog:** what to test (every screen's use cases `UC-<AREA>-NN`, multi-role journeys `J-NN`, seed preconditions, Firestore assertions, priorities, and testability gaps) is documented in `apps/ministry-maps/docs/` — start from `apps/ministry-maps/docs/test-catalog.md` and reference the UC/J ID in test titles.

## Running E2E Tests

```bash
npx nx e2e ministry-maps --no-tui     # boots emulators + serve via webServer, runs all specs
npx nx typecheck-e2e ministry-maps    # type-checks the suite (tsc --noEmit against e2e/tsconfig.json)
```

> **Type-check the suite.** Playwright transpiles with esbuild (types stripped, never checked) and the ESLint rules here are syntactic only, so `typecheck-e2e` is the ONLY thing that type-checks the fixture/seed layer. `e2e/tsconfig.json` is a dedicated `strict` config extending the workspace base;

The `e2e` target is auto-inferred by `@nx/playwright/plugin` (no `project.json` target). The `webServer` runs:

```
npx firebase emulators:exec "npx nx serve ministry-maps" --project du-ministry-maps
```

> Playwright browsers must be installed once: `npx playwright install chromium`.

## Directory Structure

```
apps/ministry-maps/e2e/
├── README.md                      # full usage guide (authoritative)
├── tsconfig.json                  # strict TS config for the suite (type-check + editor)
├── config/
│   ├── emulator.config.ts         # ports, project id, REST clear URLs
│   ├── firebase-admin.context.ts  # Admin SDK bootstrap (firestore, auth, collections)
│   └── auth.config.ts             # ROLE_UIDS map, default password
├── firebase/
│   ├── firestore-read.util.ts     # getDoc, getCollectionDocs, queryWhere, etc.
│   └── reset.util.ts              # REST wipe of Firestore + Auth
├── seed/
│   ├── types.ts                   # SeedDefinition (all fields optional) / *Seed shapes
│   ├── seeder.ts                  # writes a SeedDefinition to the emulators
│   ├── default.seed.ts            # DEFAULT_SEED_IDS + buildDefaultSeed()
│   └── factories/                 # typed entity builders (+ index barrel)
├── fixtures/
│   ├── database.fixture.ts        # auto resetAndSeed, seed, db
│   ├── auth.fixture.ts            # signInAs(role) — custom-token auth
│   └── index.ts                   # composed test + expect (IMPORT FROM HERE)
├── page-objects/
│   └── territories.page.ts        # territories page locators
└── tests/
    └── *.spec.ts                  # specs
```

## Golden Rule — Always Import From `fixtures/index.ts`

Never import `test`/`expect` directly from `@playwright/test`. Import from the composed fixture so every spec gets auto reset + seed, `seed`/`db` helpers, and `signInAs`:

```typescript
import { test, expect } from '../fixtures';
```

The auto `resetAndSeed` runs **before every test**: it wipes Firestore + Auth, then applies the default baseline. All other fixtures are available:

- **`seed`** — build & write extra data on demand (`SeedApi`)
- **`db`** — read Firestore back to assert state (`DbApi`)
- **`signInAs`** — authenticate as a seeded role (`(role: 'admin' | 'publisher') => Promise<void>`); the page stays on `/login` with a live session, and the caller navigates to the guarded route it wants

## The `db` Fixture (assertion / read helpers)

| Member                                      | Purpose                                                                    |
|---------------------------------------------|----------------------------------------------------------------------------|
| `db.firestore` / `db.auth`                  | Raw Admin SDK handles                                                      |
| `db.collections`                            | Collection names (`congregations`, `users`, `territories`, `designations`) |
| `db.historySubcollection`                   | `'history'` subcollection name on a territory                              |
| `db.getDoc(collection, id)`                 | Document data, or `undefined`                                              |
| `db.getDocSnapshot(collection, id)`         | Raw snapshot (inspect `DocumentReference` / `Timestamp`)                   |
| `db.getCollectionDocs(collection)`          | All docs of a collection                                                   |
| `db.getSubcollectionDocs(coll, id, sub)`    | All docs of a subcollection                                                |
| `db.queryWhere(collection, field, op, val)` | Query a collection with a `where` filter                                   |

> Need a raw `DocumentReference` for an assertion? Use the escape hatch: `db.firestore.doc(`${db.collections.users}/${id}`)`.

```typescript
test('default baseline is applied', async ({ db }) => {
  const territories = await db.getCollectionDocs(db.collections.territories);
  expect(territories).toHaveLength(3);
});
```

## The `seed` Fixture (build extra data on demand)

| Member            | Purpose                                                                                                                                   |
|-------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| `seed.factories`  | Typed builders (`buildCongregation`, `buildUser`, `buildTerritory`, `buildVisitHistory`, `buildDesignation`, `buildDesignationTerritory`) |
| `seed.write(def)` | Writes a `SeedDefinition` to the emulators; returns created ids                                                                           |
| `seed.ids`        | Well-known ids of the default baseline (`DEFAULT_SEED_IDS`)                                                                               |

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

Build with a factory (realistic defaults + `Partial` overrides), then `seed.write()`. `SeedDefinition` fields are all optional — pass only the entity types you're adding:

```typescript
test('reads back an on-demand territory', async ({ db, seed }) => {
  const extra = seed.factories.buildTerritory({
    congregationId: seed.ids.congregation,
    city: 'Campinas',
  });

  await seed.write({ territories: [extra] });

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

1. **`User.congregation` is a `DocumentReference`** to `/congregations/{congregationId}` — never a plain object/string. The seeder converts `congregationId` into a real reference at write time.
2. **Auth/Firestore id parity:** a matching Auth emulator user is created with `uid === userDocId` (the app keys `users/{uid}` by the auth uid). Under serial workers with a full emulator wipe per test, a duplicate uid is a bug, not a race — `createAuthUser` rethrows with context (`Failed to create Auth emulator user '<id>' (<email>): <message>`) instead of swallowing "already exists".
3. **Dates are stored as Firestore `Timestamp`s** — write plain JS `Date`s; the Admin SDK converts them automatically so the app's `.toDate()` converters work unchanged. Never write date strings.
4. **Territory history lives in a subcollection** `territories/{id}/history`; the parent doc carries `recentHistory` (latest 5, sorted desc) and `lastVisit`.

## Reset Between Tests

`firebase/reset.util.ts` wipes both emulators via their REST endpoints (handles subcollections atomically, idempotent on an empty emulator):

- `clearFirestore()` → `DELETE .../databases/(default)/documents`
- `clearAuth()` → `DELETE .../accounts`
- `resetEmulators()` → both in parallel

Emulator configuration is centralized in `config/emulator.config.ts` — keep it in sync with `firebase.json`.

## Configuration Layer

| Module                             | Purpose                                                                    |
|------------------------------------|----------------------------------------------------------------------------|
| `config/emulator.config.ts`        | Single source of truth for ports, hosts, and REST URLs.                    |
| `config/firebase-admin.context.ts` | Admin SDK initialization (env vars, `ignoreUndefinedProperties`, exports). |
| `config/auth.config.ts`            | Maps test roles to seeded uids from `DEFAULT_SEED_IDS`.                    |

## Auth Fixture (`signInAs`)

The auth fixture establishes a **real Firebase session** against the Auth emulator using the **custom-token** strategy (cross-test `storageState` reuse is a documented future upgrade, not implemented today — see below):

1. `auth.createCustomToken(uid)` mints a custom token via the Admin SDK (Node context) using `ROLE_UIDS[role]`.
2. The browser navigates to `/login` and waits (up to `E2E_HOOK_TIMEOUT_MS`, 10s) for `window.__E2E__` — a development-only hook.
3. `signInWithCustomToken(auth, token)` authenticates the user in the browser.
4. The fixture waits (up to `SESSION_SETTLE_TIMEOUT_MS`, 10s) for `auth.currentUser` to settle to the expected uid. The page stays on `/login` — it never auto-navigates on auth-state change — and the caller navigates to the guarded route it wants.

Both waits throw an actionable error on timeout instead of a bare `TimeoutError`: the hook-wait error names the `app.config.ts` gating condition and the `webServer` command; the settle-wait error points at `ROLE_UIDS` and the Auth emulator port.

```typescript
test('guarded route', async ({ signInAs, page }) => {
  await signInAs('admin');
  await page.goto('/territories');
  // ...assertions on the guarded route
});
```

**Future upgrade path:** a per-role Playwright setup project writing `storageState` once per role would let specs skip the token exchange entirely. Blocked today by the per-test Auth emulator reset — any saved session would be invalidated by the next test's wipe.

### Dev-Only App Hook

The `window.__E2E__ = { auth, signInWithCustomToken }` hook is **strictly gated** to
`environment.env === 'development' && !environment.useCloud` in `app.config.ts`. It never ships to production.

## Page Objects

Page objects encapsulate navigation and locators in `page-objects/` as `readonly` properties assigned in the constructor via `page.getByTestId(...)`. They use `data-testid` selectors for robustness and don't bake in synchronization beyond their own effect — waits belong to the caller's web-first assertions, backed by the global `expect: { timeout: 10_000 }` in `playwright.config.ts`:

```typescript
import { expect, test } from '../fixtures';
import { TerritoriesPage } from '../page-objects/territories.page';

const territoriesPage = new TerritoriesPage(page);
await territoriesPage.goto();
await expect(territoriesPage.heading).toBeVisible();

await territoriesPage.showAllCities();
await expect(territoriesPage.territoryItems).toHaveCount(3);
```

`toHaveCount` is only a sound post-filter wait when the count actually differs before/after the filter — otherwise assert on an element unique to the post-filter view (e.g. `territoryByAddress(...)`).

## Conventions

- **No mocks** — assert real Firestore state, not just the DOM.
- Admin SDK code runs **only** in Playwright's Node context, never in the browser.
- kebab-case filenames; small, focused modules.
- New specs go under `apps/ministry-maps/e2e/tests/` and import from `../fixtures`.
- Add `data-testid` attributes to app HTML for robust selectors.
- Never use `page.waitForTimeout` — it's lint-enforced (`playwright/no-wait-for-timeout: error`, scoped to `e2e/**/*.ts` in `eslint.config.mjs`). Synchronize with web-first, auto-retrying assertions instead.

## Out of Scope (current follow-ups)

- CI pipeline wiring (GitHub Actions).
- Broad feature test suites beyond the smoke + territories proof tests.
- Exercising the real `signInWithPopup` OAuth flow (the custom-token approach is used instead).
- Cross-test session reuse (currently sign-in per test).
