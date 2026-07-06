/**
 * Composed fixture entry point.
 *
 * All specs MUST import `test` and `expect` from this file (never directly from
 * `@playwright/test`) so they automatically receive:
 *
 * - `resetAndSeed` — auto fixture that wipes + re-seeds before every test
 * - `seed`          — `SeedApi` (factories, write, buildDefault, ids)
 * - `db`            — `DbApi` (Firestore/Auth handles, refs, read helpers)
 * - `signInAs`      — signs into the app as a seeded role (e.g. `'admin'`)
 */

import { test as dbTest, expect } from './database.fixture';
import { signInAs } from './auth.fixture';
import type { AuthApi } from './auth.fixture';

interface AuthFixtures {
  signInAs: AuthApi['signInAs'];
}

export const test = dbTest.extend<AuthFixtures>({
  signInAs: async ({ page }, use) => {
    await use((role) => signInAs(page, role));
  },
});

export { expect };
