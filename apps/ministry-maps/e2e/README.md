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
├── tsconfig.json                 ← TS config for the suite (strict; drives type-checking + the editor)
├── config/                       ← composable configuration
│   ├── emulator.config.ts        # ports, project id, REST clear URLs
│   ├── firebase-admin.context.ts # Admin SDK bootstrap (firestore, auth, collections)
│   └── auth.config.ts            # ROLE_UIDS map, default password
├── firebase/                     ← utility layer (runs in Node)
│   ├── firestore-read.util.ts    # getDoc, getCollectionDocs, queryWhere, etc.
│   └── reset.util.ts             # REST wipe of Firestore + Auth emulators
├── utils/                        ← shared browser-interaction helpers (pure Playwright + Node)
│   ├── window-open-stub.util.ts  # stubWindowOpen/getOpenedUrls — window.open recorder
│   ├── whatsapp-link.util.ts     # captureWhatsAppPopup — whatsapp:// popup URL decoder
│   ├── csv-download.util.ts      # downloadCsv — BOM-aware CSV download reader
│   ├── native-dialog.util.ts     # acceptNextDialog/dismissNextDialog — native confirm() handlers
│   └── cdk-drag.util.ts          # dragRowByMouse — CDK drag-drop via the low-level mouse API
├── seed/                         ← composable data seeding
│   ├── types.ts                  # SeedDefinition (all fields optional), *Seed types
│   ├── seeder.ts                 # write(def) → Firestore + Auth emulators
│   ├── default.seed.ts           # DEFAULT_SEED_IDS + buildDefaultSeed()
│   └── factories/                # buildCongregation, buildUser, buildTerritory, etc.
├── fixtures/                     ← Playwright fixture wiring
│   ├── database.fixture.ts       # resetAndSeed (auto), seed, db
│   ├── auth.fixture.ts           # signInAs(role) — custom-token auth
│   └── index.ts                  # composed test + expect (import from here!)
├── page-objects/                 ← page abstractions
│   ├── territories.page.ts       # territories page locators
│   ├── confirm-dialog.page.ts    # shared confirm-dialog overlay
│   ├── history-dialog.page.ts    # shared visit-history dialog
│   ├── sort-filter-dialog.page.ts # shared sort/filter trigger + dialog
│   ├── header.page.ts            # app header (logo, profile link)
│   └── toast.page.ts             # toaster notification overlay
└── tests/
    ├── smoke.spec.ts             # baseline integrity checks
    └── territories.spec.ts       # authenticated territory list proof
```

## Configuration (`config/`)

| Module                      | Purpose                                                                                                                                                       |
|-----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `emulator.config.ts`        | Single source of truth for ports (`8080`, `9099`, `5001`), project id (`du-ministry-maps`), and derived REST URLs. Keep in sync with `firebase.json`.         |
| `firebase-admin.context.ts` | Sets env vars (`FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`), initializes the Admin app once, and exports `firestore`, `auth`, and `Collections`. |
| `auth.config.ts`            | `ROLE_UIDS: Record<TestRole, string>` — maps test roles (`admin`, `publisher`, `elder`, `organizer`, `superintendent`, `app_admin`) to seeded uids from `DEFAULT_SEED_IDS` — plus `DEFAULT_PASSWORD`.              |

## Seeding (`seed/`)

### The Default Baseline

Before every test the database fixture resets the emulators and applies the
**default baseline**: 1 congregation, 8 users (1 ADMIN, 3 PUBLISHERs, and 1 each
of ELDER, ORGANIZER, SUPERINTENDENT and APP_ADMIN so `signInAs` covers every
`RoleEnum`), 3 territories (with visit history), and 1 designation.

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

  // SeedDefinition fields are all optional — pass only what you're adding.
  await seed.write({ territories: [territory] });

  const stored = await db.getDoc(db.collections.territories, territory.id);
  expect(stored?.city).toBe('Campinas');
});
```

> `buildUser()` omits `password` by default, so seeded users fall back to
> `DEFAULT_PASSWORD` (`config/auth.config.ts`) — the single source of truth
> for the seeded password. Override `password` only when a test needs a
> different one.

### Firestore Storage Contract (critical)

The seeder enforces the app's real storage shape:

1. **`User.congregation`** is a `DocumentReference` — never a plain string.
2. **Auth/Firestore uid parity** — `auth.createUser({ uid: userDocId })` with
   the same id as the Firestore document. Under serial workers with a full
   emulator wipe per test, a duplicate uid means the caller seeded the same
   user twice: the seeder now **throws** (with the uid + email + underlying
   message) instead of silently ignoring an "already exists" error.
3. **Dates** are plain `Date`s — the Admin SDK auto-converts to `Timestamp`.
4. **Territory history** lives in `territories/{id}/history` subcollection;
   `recentHistory` (latest 5, desc) and `lastVisit` are derived on the parent.
5. **Invitation links** (`invitation_links`, mind the underscore) are written in
   the app's creation-time shape: `congregation` as a `DocumentReference` and
   the doc's own `id` embedded in the body. Seed them via
   `seed.write({ invitationLinks: [seed.factories.buildInvitationLink({ congregationId: seed.ids.congregation })] })`;
   a consumed invite is just an override (`isValid: false, usedAt, usedBy`).

## Fixtures

### Importing

All specs **must** import `test` and `expect` from `fixtures/index.ts` (never
directly from `@playwright/test`):

```typescript
import { test, expect } from '../fixtures';
```

### Available Fixtures

| Fixture             | Type                      | Description                                               |
|---------------------|---------------------------|-----------------------------------------------------------|
| `resetAndSeed`      | auto                      | Wipes + re-seeds before every test.                       |
| `seed`              | `SeedApi`                 | Factories, `write()`, `ids`.                              |
| `db`                | `DbApi`                   | Firestore/Auth handles and read helpers.                  |
| `role`              | option (`TestRole`)       | Identity for `authenticatedPage`; set via `test.use`.     |
| `signInAs`          | `(role) => Promise<void>` | Imperatively signs the current `page` into a seeded user. |
| `signInAsUser`      | `(uid) => Promise<void>`  | Signs the current `page` into **any** seeded user, by uid. |
| `authenticatedPage` | `Page`                    | A `page` already signed in as the `role` option.          |

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

### Authenticated Pages

Two Playwright-idiomatic ways to reach guarded routes:

**1. Declarative — the `role` option + `authenticatedPage` fixture** (preferred
when a spec/file uses a single identity):

```typescript
test.use({ role: 'admin' }); // defaults to 'admin' if omitted

test('guarded route', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/territories');
  // ...assertions on the guarded page
});
```

**2. Imperative — the `signInAs` fixture** (when a test drives multiple
identities). It signs the current `page` in and leaves it on `/login` with a
live session; you navigate to the route you want:

```typescript
test('guarded route', async ({ signInAs, page }) => {
  await signInAs('admin');       // mints token + establishes the session
  await page.goto('/territories');
  // ...assertions on the guarded page
});
```

`signInAs` resolves only once `auth.currentUser` is populated in the browser,
so the auth guard resolves the user on your first navigation (no arbitrary
waits). Supported roles: `'admin'` (ADMIN), `'publisher'` (PUBLISHER),
`'elder'` (ELDER), `'organizer'` (ORGANIZER), `'superintendent'`
(SUPERINTENDENT) and `'app_admin'` (APP_ADMIN) — each maps to a baseline user
carrying the matching `RoleEnum` (see `ROLE_UIDS` in `config/auth.config.ts`).

For identities **outside** the baseline (e.g. the admin of a second, on-demand
congregation), use `signInAsUser(uid)` — same session mechanics, but it mints
the custom token for any seeded uid:

```typescript
test('second-congregation admin', async ({ seed, signInAsUser, page }) => {
  const congregation = seed.factories.buildCongregation({ cities: ['Campinas'] });
  const admin = seed.factories.buildUser({
    role: RoleEnum.ADMIN,
    congregationId: congregation.id,
  });
  await seed.write({ congregations: [congregation], users: [admin] });

  await signInAsUser(admin.id);
  await page.goto('/territories');
  // ...scoped to the new congregation
});
```

## Auth Strategy

The E2E tests establish a **real Firebase session** against the **Auth emulator**
using the **custom-token** approach (no OAuth popup):

1. The Playwright fixture calls `mintCustomToken(uid)` via the Admin SDK (Node
   context).
2. It navigates the browser to `/login` and waits for `window.__E2E__` — a
   development-only hook exposed by the app when connected to the Auth
   emulator.
3. It calls `signInWithCustomToken(auth, token)` in the browser, which
   authenticates the user against the emulator.
4. It waits until `auth.currentUser` is populated, confirming the session is
   live. The page stays on `/login`; the spec then navigates to the guarded
   route, where the Angular auth guard resolves the user's Firestore document.

> Sign-in happens **per test, after `resetAndSeed`** — the reset wipes Auth and
> revokes any prior token, so a fresh token is minted each time. Cross-test
> session reuse (`storageState`) remains a future optimization, blocked today
> by the per-test Auth emulator reset (a saved session would be invalidated by
> the next test's wipe). It would take the shape of a per-role Playwright
> setup project writing one `storageState` file per role.

**Important:** The `window.__E2E__ = { auth, signInWithCustomToken }` hook is
**strictly gated** to `environment.env === 'development' && !environment.useCloud`
in `app.config.ts` — it never ships to production. The login page itself never
auto-navigates on an auth-state change, so `signInAs`/`authenticatedPage` can
safely leave the page on `/login` after establishing the session; the caller
navigates to the guarded route it wants to exercise.

### Timeouts and Failure Messages

The auth fixture waits on two conditions with explicit timeouts (10s each,
`E2E_HOOK_TIMEOUT_MS` / `SESSION_SETTLE_TIMEOUT_MS` in `auth.fixture.ts`):

1. **`window.__E2E__` appears after `goto('/login')`.** On timeout, the error
   names the gating condition in `app.config.ts` and the `webServer` command,
   so a stale/production build is easy to rule out.
2. **`auth.currentUser` settles to the expected uid.** On timeout, the error
   points at `ROLE_UIDS` (`config/auth.config.ts`) and the Auth emulator port,
   so a bad role→uid mapping or a down emulator is easy to rule out.

Both replace what used to be a bare, unbounded `waitForFunction` with no
timeout and a generic `TimeoutError` on failure.

## Page Objects (`page-objects/`)

Page objects encapsulate navigation and locators as `readonly` properties
assigned in the constructor. Actions (`goto()`, `showAllCities()`) don't wait
for anything beyond their own effect — synchronization is left to the
caller's web-first, auto-retrying assertions rather than baked-in sleeps or
per-call timeouts (those are governed globally by `expect: { timeout: 10_000 }`
in `playwright.config.ts`):

```typescript
import { expect, test } from '../fixtures';
import { TerritoriesPage } from '../page-objects/territories.page';

const territoriesPage = new TerritoriesPage(page);
await territoriesPage.goto();
await expect(territoriesPage.heading).toBeVisible();

await territoriesPage.showAllCities();
await expect(territoriesPage.territoryItems).toHaveCount(3);
await expect(territoriesPage.territoryByAddress('Rua Inventada, 999')).toBeVisible();
```

Locators use `data-testid` attributes (not text content) for robustness,
including `territories-city-filter` on the city `<select>`.

> **Pattern requirement:** `toHaveCount` is only a sound post-filter wait when
> the count actually differs before and after the filter (e.g. the default
> city renders 2 territories, "Todas" renders 3/4 — see `territories.spec.ts`).
> If a filter wouldn't change the count, assert on an element unique to the
> post-filter view instead (e.g. `territoryByAddress(...)`).

### Shared Page Objects (WP-07)

Cross-feature UI constructs have dedicated page objects so area specs don't
duplicate locator logic:

| Page Object | Constructor Arg | Key Locators / Actions | Used By |
|---|---|---|---|
| `ConfirmDialogPage` | `page` | `dialog`, `title`, `confirm()`, `cancel()` | TERR-20, WORK-17, ASSIGN-07/08, USERS-08/09, PROF-09/10 |
| `HistoryDialogPage` | `page` | `dialog`, `rows`, `close()` | TERR-26, WORK-09, J-02 |
| `SortFilterDialogPage` | `page` | `trigger`, `badge`, `open()`, `apply()`, `selectSort()`, `toggleByTitle()`, `selectFilterByTitle()` | TERR-09…13, ASSIGN-05…10 |
| `HeaderPage` | `page` | `nav`, `profileLink`, `logo`, `appName`, `goToProfile()`, `goToHome()` | NAV-*, PROF-01 |
| `ToastPage` | `page` | `message`, `expectText(text)` | CFG-*, USERS-10, ASSIGN-12 |

```typescript
import { ConfirmDialogPage } from '../page-objects/confirm-dialog.page';
import { ToastPage } from '../page-objects/toast.page';

const confirmDialog = new ConfirmDialogPage(page);
await confirmDialog.confirm();

const toast = new ToastPage(page);
await toast.expectText('Salvo com sucesso');
```

## Browser-Interaction Utilities (`utils/`)

Canonical helpers for the browser-level techniques catalogued in
[`../docs/testability-gaps.md`](../docs/testability-gaps.md) §2 — use them
instead of copying boilerplate into specs. All are pure Playwright + Node (no
`test`/`expect` imports), so they also work from fixtures.

| Helper | Technique | Serves |
|---|---|---|
| `stubWindowOpen(page)` / `getOpenedUrls(page)` | Records `window.open` URLs via `addInitScript` — the robust option when `waitForEvent('popup')` can't work (custom protocols, `_self` navigation) | UC-USERS-14, UC-WORK-19 (Firefox/Safari branch) |
| `captureWhatsAppPopup(page, trigger)` | Wraps `waitForEvent('popup')` around the trigger, decodes the `whatsapp://send?text=…` URL → `{ whatsappUrl, text, sharedUrl }` | UC-ASSIGN-19, J-01 |
| `downloadCsv(page, trigger)` | Wraps `waitForEvent('download')`, reads the file from `download.path()` — keeps the `\uFEFF` BOM for the caller to assert | UC-TERR-34, J-08 |
| `acceptNextDialog(page)` / `dismissNextDialog(page)` | One-shot native `confirm()` handlers — register **before** the click | UC-CFG-10, J-05 |
| `dragRowByMouse(page, source, target)` | CDK drag-drop via hover → `mouse.down()` → stepped `mouse.move()` → `mouse.up()` (`dragTo()` does not work) | UC-TERR-21 |

## Running Tests

```bash
# Complete suite
npx nx e2e ministry-maps

# Install/update browsers
npx playwright install chromium

# Run with UI
npx playwright test --ui --config apps/ministry-maps/playwright.config.ts

# Isolation check: run every test twice back-to-back. Passing proves the
# per-test reset+seed truly isolates tests (no cross-test state leakage, no
# hidden timing dependence).
npx playwright test --config apps/ministry-maps/playwright.config.ts --repeat-each=2

# Type-check the suite. Playwright transpiles with esbuild (types are stripped,
# never checked) and the ESLint rules here are syntactic only, so this is the
# ONLY thing that type-checks the fixture/seed layer. Runs against e2e/tsconfig.json.
npx nx typecheck-e2e ministry-maps
```

## Adding New Tests

1. Create a page object in `page-objects/` if the route doesn't have one.
2. Create a spec in `tests/` importing from `../fixtures`.
3. Use `seed.factories.*` for on-demand data via `seed.write()`.
4. Assert both UI state (via page objects) and Firestore state (via `db.*`).
5. For guarded routes, use the `authenticatedPage` fixture (with
   `test.use({ role })`) or call `signInAs(role)` first.

> **What should I test?** The full behavioural use-case and journey catalog lives in
> [`../docs`](../docs/README.md) (`UC-<AREA>-NN` entries, `J-NN` journeys, priorities, seed preconditions,
> Firestore assertions, and the testability-gap list). Start from [`../docs/test-catalog.md`](../docs/test-catalog.md)
> — test titles should reference the UC/J ID they implement.

## Out of Scope (Future)

- CI pipeline wiring (GitHub Actions).
- Broad feature test suites beyond the smoke + territories proof.
- Exercising the real `signInWithPopup` OAuth flow.
- Cross-test session reuse (currently sign-in per test).
