import { Page } from '@playwright/test';

import { expect, test as dbTest } from './database.fixture';
import { auth } from '../config/firebase-admin.context';
import { ROLE_UIDS, TestRole } from '../config/auth.config';
import { AUTH_EMULATOR_HOST } from '../config/emulator.config';

/**
 * Shape of the development-only hook the app exposes on `window` when it is connected to the Auth emulator
 * (see `app.config.ts`). Only the members of the fixture drives are typed here.
 */
interface E2EAuthHook {
  auth: { currentUser: { uid: string } | null };
  signInWithCustomToken: (
    auth: E2EAuthHook['auth'],
    token: string,
  ) => Promise<{ user?: { uid?: string } }>;
}

declare global {
  interface Window {
    __E2E__?: E2EAuthHook;
  }
}

/** Serializable result returned from the in-browser sign-in `page.evaluate`. */
type SignInResult =
  | { success: true }
  | { success: false; error: string; code?: string };

/** Max time to wait for the dev-only `window.__E2E__` hook to appear after navigating to `/login`. */
const E2E_HOOK_TIMEOUT_MS = 10_000;
/** Max time to wait for `auth.currentUser` to settle to the signed-in uid after exchanging the custom token. */
const SESSION_SETTLE_TIMEOUT_MS = 10_000;

/**
 * Establishes a real Firebase Auth emulator session in the given page by exchanging an Admin-minted custom token via
 * the dev-only `__E2E__` hook.
 *
 * Sign-in happens per test, after the `resetAndSeed` auto fixture (the reset wipes Auth, revoking any previous token),
 * so a fresh token is minted here. The helper resolves only once `auth.currentUser` is populated, guaranteeing
 * the session is live before the caller navigates to a guarded route.
 *
 * Invariant: the login page never auto-navigates on its own auth-state change, so staying on `/login` after sign-in
 * is safe — the caller controls when (and where) to navigate next.
 *
 * Future upgrade path: a per-role `storageState` setup project would let specs skip this exchange entirely, but it's
 * blocked today by the per-test Auth emulator reset (any saved session would be invalidated by the next test's wipe).
 */
async function establishSession(page: Page, role: TestRole): Promise<void> {
  const uid = ROLE_UIDS[role];
  const token = await auth.createCustomToken(uid);

  await page.goto('/login');

  try {
    await page.waitForFunction(() => Boolean(window.__E2E__), undefined, {
      timeout: E2E_HOOK_TIMEOUT_MS,
    });
  } catch {
    throw new Error(
      `window.__E2E__ did not appear within ${E2E_HOOK_TIMEOUT_MS}ms. This hook is gated behind ` +
        `\`environment.env === 'development' && !environment.useCloud\` in app.config.ts — confirm the app under ` +
        `test was served via the Playwright webServer ` +
        `('npx firebase emulators:exec "npx nx serve ministry-maps" --project du-ministry-maps') and not a ` +
        `production build.`,
    );
  }

  const result = await page.evaluate<SignInResult, string>((authToken) => {
    const api = window.__E2E__;
    if (!api) {
      return { success: false, error: '__E2E__ hook not available' };
    }

    return api
      .signInWithCustomToken(api.auth, authToken)
      .then(() => ({ success: true as const }))
      .catch((err: Error) => ({
        success: false as const,
        error: err.message,
        code: (err as { code?: string }).code,
      }));
  }, token);

  if (result.success === false) {
    throw new Error(
      `signInWithCustomToken failed: ${result.error}${
        result.code ? ` (code: ${result.code})` : ''
      }`,
    );
  }

  // Wait for the Firebase session to settle (currentUser populated) so the
  // Angular auth guard resolves the user on the caller's first navigation.
  try {
    await page.waitForFunction(
      (expectedUid) => window.__E2E__?.auth.currentUser?.uid === expectedUid,
      uid,
      { timeout: SESSION_SETTLE_TIMEOUT_MS },
    );
  } catch {
    throw new Error(
      `auth.currentUser did not settle to uid '${uid}' (role '${role}') within ${SESSION_SETTLE_TIMEOUT_MS}ms. ` +
        `Confirm '${role}' maps to a seeded uid in ROLE_UIDS (config/auth.config.ts) and that the Auth emulator ` +
        `is reachable at ${AUTH_EMULATOR_HOST}.`,
    );
  }
}

interface AuthOptions {
  /**
   * Role used by the `authenticatedPage` fixture. Set it declaratively per file
   * or per describe block with `test.use({ role: 'publisher' })`.
   */
  role: TestRole;
}

interface AuthFixtures {
  /**
   * Signs the current `page` into the app as the given test role. The page is
   * left on `/login` with a live Firebase session; the caller navigates to the
   * guarded route it wants to exercise.
   *
   * @param role - a test role mapped to a seeded user (e.g. `'admin'`)
   */
  signInAs: (role: TestRole) => Promise<void>;
  /**
   * A `page` already signed in as `role` (defaults to `'admin'`). Prefer this
   * over calling `signInAs` manually when a spec only needs a single identity.
   */
  authenticatedPage: Page;
}

/**
 * Composed test object: extends the database fixture (reset+seed, `seed`, `db`) with Playwright-idiomatic
 * authentication (`role` option, `signInAs`, `authenticatedPage`). Specs import `test`/`expect` from `./index`.
 */
export const test = dbTest.extend<AuthOptions & AuthFixtures>({
  role: ['admin', { option: true }],

  signInAs: async ({ page }, use) => {
    // No `resetAndSeed` dependency needed: the returned function runs inside
    // the test body, i.e. after all auto fixtures have already completed.
    await use((role) => establishSession(page, role));
  },

  authenticatedPage: async ({ page, role, resetAndSeed }, use) => {
    // This fixture signs in during SETUP, so it must run after the emulator
    // wipe+seed — declaring `resetAndSeed` makes Playwright guarantee that
    // ordering instead of it being an accident of registration order.
    void resetAndSeed;
    await establishSession(page, role);
    await use(page);
  },
});

export { expect };
