import { Page } from '@playwright/test';

import { mintCustomToken } from '../firebase/custom-token.util';
import { AUTH_CONFIG, TestRole } from '../config/auth.config';

/**
 * Authentication API exposed to specs via the composed fixture.
 *
 * Sign-in is performed per-test, after the `resetAndSeed` auto fixture has run
 * (because the reset wipes Auth before each test, so a new token must be
 * minted for the re-seeded user each time).
 */
export interface AuthApi {
  /**
   * Signs into the app as the given test role and returns an authenticated
   * Playwright `Page` ready to access guarded routes.
   *
   * @param role - a test role mapped to a seeded user (e.g. `'admin'`)
   */
  signInAs(role: TestRole): Promise<Page>;
}

/** Drive signInWithCustomToken in the browser using the dev-only `__E2E__` hook. */
export async function signInAs(page: Page, role: TestRole): Promise<Page> {
  const uid = AUTH_CONFIG.roleUid(role);
  const token = await mintCustomToken(uid);

  await page.goto('/login');
  await page.waitForFunction(() => !!(window as any).__E2E__);

  const result = await page.evaluate(
    (t) => {
      const api = (window as any).__E2E__;
      return api.signInWithCustomToken(api.auth, t)
        .then((uc: unknown) => ({ success: true, uid: (uc as any)?.user?.uid }))
        .catch((err: Error) => ({ success: false, error: err.message, code: (err as any).code }));
    },
    token,
  );

  if (!result.success) {
    throw new Error(
      `signInWithCustomToken failed: ${result.error} (code: ${result.code})`,
    );
  }

  // The app does not auto-redirect from /login after sign-in. Navigate to
  // /home (a guarded route) to verify the auth guard lets us through, which
  // confirms the Firestore user doc was resolved.
  await page.goto('/home');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });

  return page;
}
