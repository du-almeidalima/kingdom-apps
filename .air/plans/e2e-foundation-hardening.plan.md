# E2E Foundation Hardening — ministry-maps Playwright suite

## Context

The e2e foundation (`apps/ministry-maps/e2e/`) works and all 9 tests pass, but a review surfaced fragilities that would compound as the suite grows: a hard `waitForTimeout(500)` sleep and arbitrary 15s/10s per-call timeouts in the page object, an unbounded `waitForFunction` in the auth fixture with unhelpful errors, a password constant duplicated in two files, a seed API that forces every call to pass all four collection arrays, error-swallowing in Auth user creation that masks bugs, and Playwright lint rules applied to the whole app instead of the e2e folder.

**User decisions (fixed):** keep `workers: 1` (serial), keep per-test sign-in (no storageState project — documented as a future upgrade path). The layered structure (config → firebase → seed → fixtures → page-objects → tests) is good and stays. This is a hardening/refactor pass, not an architecture change. No new test suites, no CI wiring.

## Step 1 — Seed layer: composable API, fail-loud, single-source password

- **`e2e/seed/types.ts`** — make all four `SeedDefinition` fields optional (`congregations?`, `users?`, `territories?`, `designations?`) so specs can write `seed.write({ territories: [x] })`. `SeedResult` unchanged.
- **`e2e/seed/seeder.ts`** — destructure with `= []` defaults at the top of `seed()`. In `createAuthUser`, **remove** the try/catch that swallows "already exists" (under serial workers with a full wipe per test, a duplicate uid is a bug, not a race); replace with a rethrow adding context: `Failed to create Auth emulator user '<id>' (<email>): <message>` with `{ cause }`. Update JSDoc — delete the incorrect "parallel workers" rationale.
- **`e2e/seed/factories/user.factory.ts`** — delete the `password: 'test-password-123'` default; the seeder already falls back to `DEFAULT_PASSWORD` from `config/auth.config.ts`, making that the single source. (Do NOT import it into the factory — cycle via `auth.config → default.seed → factories`.) The `password?` override stays.
- **`e2e/seed/factories/visit-history.factory.ts`** — replace the constant default date with a module-level decreasing sequence (`Date.UTC(2024, 0, 15, 10) - n * 86_400_000`) so multiple default builds never collide and `recentHistory`/`lastVisit` sort order is deterministic.
- **`e2e/config/auth.config.ts`** — replace the one-method `AUTH_CONFIG.roleUid(role)` object with a plain `export const ROLE_UIDS: Record<TestRole, string>`. `DEFAULT_PASSWORD` and `TestRole` stay.
- Update callers: `fixtures/auth.fixture.ts` (`ROLE_UIDS[role]`), and both specs to the sparse `seed.write` form.

## Step 2 — Auth fixture hardening

- **Delete `e2e/firebase/custom-token.util.ts`** (one-line wrapper); mint directly in the fixture via `auth.createCustomToken(uid)` from `config/firebase-admin.context`.
- **`e2e/fixtures/auth.fixture.ts`** (`establishSession`):
  - Keep `page.goto('/login')` (evaluated alternatives: `addInitScript` can't work — the hook needs the bootstrapped Auth instance from `app.config.ts`; signing in on the target page saves nothing since the guard bounces to `/login` anyway).
  - Named constants `E2E_HOOK_TIMEOUT_MS = 10_000`, `SESSION_SETTLE_TIMEOUT_MS = 10_000`.
  - Hook wait with explicit timeout; on failure throw an actionable error naming the gating condition (`environment.env === 'development' && !environment.useCloud` in `app.config.ts`) and the webServer command.
  - `currentUser` settle wait: add the missing explicit timeout; on failure point at `ROLE_UIDS` and the Auth emulator port.
  - Keep the in-page `SignInResult` evaluate and the `signInAs` / `authenticatedPage` / `role` fixture shapes unchanged (no spec churn).
  - JSDoc: document the invariant that the login page never auto-navigates on auth-state change, and the storageState future upgrade path (per-role setup project; blocked today by per-test Auth reset).
- Keep `config/firebase-admin.context.ts` import-time env mutation as-is (standard Admin SDK emulator pattern; ordering guaranteed since `firestore`/`auth` export from the same module) — just clarify the comment.

## Step 3 — Page objects: web-first, navigation ≠ filtering

- **App-side (only app change):** add `data-testid="territories-city-filter"` to the `<select lib-select>` in `apps/ministry-maps/src/app/features/territory/pages/territories-page/territories-page.component.html` (~line 24) — replaces the structural `select[lib-select]` selector.
- **Delete `e2e/page-objects/base.page.ts`** (pure indirection around `page.goto`).
- **Rewrite `e2e/page-objects/territories.page.ts`:**
  - `readonly` locators assigned in the constructor via `page.getByTestId(...)`: `heading`, `list`, `territoryItems`, `cityFilter`, plus `addresses` (`territoryItems.locator('h3 .t-body2')`).
  - `goto()`: navigate + `await expect(this.list).toBeVisible()` — no per-call timeouts (governed by global `expect.timeout`). **Does not touch the city filter.**
  - `showAllCities()`: `cityFilter.selectOption('ALL')` — no sleep; synchronization moves to spec-side auto-retrying assertions.
  - `territoryByAddress(address): Locator` — `territoryItems.filter({ hasText: address })`.
  - Remove the `count()` and `addresses(): Promise<string[]>` snapshot helpers (invite race-prone assertions).
- **`e2e/tests/territories.spec.ts`** — rewrite assertions web-first: `await expect(territoriesPage.territoryItems).toHaveCount(3)` after `showAllCities()`, `await expect(territoriesPage.territoryByAddress('...')).toBeVisible()` per address. `toHaveCount` is a sound post-filter wait because the default city renders a different count (2) than "Todas" (3/4) — note this pattern requirement in a comment. Redirect test unchanged.
- **`e2e/tests/smoke.spec.ts`** — convert `expect(await locator.innerText()).toContain(...)` to `await expect(locator).toContainText(...)`.

## Step 4 — playwright.config.ts hygiene

- Add `fullyParallel: false` beside `workers: 1` (nx preset defaults it to true) with a block comment explaining the shared-emulator constraint and the future parallelism path (per-worker emulator `projectId` namespacing — no fixture rewrite needed since reset/seed flows only through the database fixture).
- Add `expect: { timeout: 10_000 }` — globally backs the web-first assertions that replaced the per-call 15s/10s waits (dev-server Angular + emulator round-trips exceed the 5s default).
- Do NOT add `retries`/`reporter`/`forbidOnly` — the nx preset already provides them; add a one-line comment saying so.
- Delete dead weight: the commented `dotenv` block and all commented-out firefox/webkit/mobile/branded project entries.

## Step 5 — Scope Playwright lint to e2e

`apps/ministry-maps/eslint.config.mjs:6` currently applies `playwright.configs['flat/recommended']` to the entire app (Angular source + Jest specs). Replace with a block scoped to `files: ['e2e/**/*.ts']`, keeping the recommended rules and raising `playwright/no-wait-for-timeout` and `playwright/no-conditional-in-test` to `error`. Run `npx nx lint ministry-maps` and fix anything surfaced (after Steps 1–3 there should be nothing).

## Step 6 — Documentation

- **`apps/ministry-maps/e2e/README.md`** — update: tree (remove `custom-token.util.ts`, `base.page.ts`), sparse `seed.write` examples, duplicate-uid-now-throws note, `ROLE_UIDS` rename, new page-object pattern (+ the "expected count must differ pre/post filter" caveat), auth timeouts/errors, storageState future note, `--repeat-each=2` isolation check.
- **`.ai/rules/frontend/e2e-testing.md`** — same content updates; also fix two existing inaccuracies (`signInAs` returns `Promise<void>`, not `Promise<Page>`; the "storageState strategy" mention is wrong today) and add the convention bullet: never `page.waitForTimeout` (now lint-enforced) — synchronize with web-first assertions.

## Verification

1. `npx nx e2e ministry-maps` — all 9 tests (6 smoke + 3 territories) pass.
2. Isolation/no-sleep robustness: `npx playwright test --config apps/ministry-maps/playwright.config.ts --repeat-each=2` — passing back-to-back proves reset+seed isolation and that removing the 500ms sleep didn't reintroduce timing dependence.
3. `npx nx lint ministry-maps` clean; spot-check that a temporary `page.waitForTimeout(1)` in a spec errors, then revert.
4. Error-path check (once, then revert): break the hook timeout or a role uid and confirm the new actionable messages appear instead of a bare `TimeoutError`.
5. Static sweep: `grep -r "waitForTimeout" apps/ministry-maps/e2e` → nothing; `grep -r "test-password-123" apps/ministry-maps/e2e` → only `config/auth.config.ts`.

## Risks

1. **Seeder now throws on duplicate Auth uids** — intended behavior change; a future double-`seed.write` of the same user fails loudly instead of silently. Documented in README.
2. **`toHaveCount` as post-filter sync is only sound when the count differs pre/post filter** (true for both current tests). Mitigation: documented pattern — otherwise assert on an address unique to the "Todas" view.
3. **`expect.timeout: 10s`** slows genuinely-failing assertions by up to 10s each; acceptable trade vs. the removed 15s per-call waits.
4. **Visit-history factory module-level counter** — default dates are unique but build-order dependent; no current test asserts exact default dates.

## Critical files

- `apps/ministry-maps/e2e/fixtures/auth.fixture.ts`
- `apps/ministry-maps/e2e/seed/seeder.ts`, `e2e/seed/types.ts`, `e2e/seed/factories/user.factory.ts`, `e2e/seed/factories/visit-history.factory.ts`
- `apps/ministry-maps/e2e/config/auth.config.ts`
- `apps/ministry-maps/e2e/page-objects/territories.page.ts` (+ delete `base.page.ts`, delete `e2e/firebase/custom-token.util.ts`)
- `apps/ministry-maps/e2e/tests/territories.spec.ts`, `e2e/tests/smoke.spec.ts`
- `apps/ministry-maps/playwright.config.ts`
- `apps/ministry-maps/eslint.config.mjs`
- `apps/ministry-maps/src/app/features/territory/pages/territories-page/territories-page.component.html`
- `apps/ministry-maps/e2e/README.md`, `.ai/rules/frontend/e2e-testing.md`