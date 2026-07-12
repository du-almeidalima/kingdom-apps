/**
 * Composed fixture entry point.
 *
 * All specs MUST import `test` and `expect` from this file (never directly from
 * `@playwright/test`) so they automatically receive:
 *
 * - `resetAndSeed` — auto fixture that wipes and re-seeds before every test
 * - `seed` — `SeedApi` (factories, write, ids)
 * - `db` — `DbApi` (Firestore/Auth handles, read helpers)
 * - `signInAs` — imperatively signs the current `page` into a role
 * - `authenticatedPage` — a `page` already signed in as the `role` option
 * - `role` — option (`test.use({ role })`) driving `authenticatedPage`
 *
 * The composition chain is `database.fixture` → `auth.fixture`; this module is
 * the single, stable import surface for the whole suite.
 */
export { test, expect } from './auth.fixture';
