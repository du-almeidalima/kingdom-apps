import { Page } from '@playwright/test';

declare global {
  interface Window {
    /** Recorder installed by {@link stubWindowOpen} — every URL passed to `window.open`, in order. */
    __openedUrls?: string[];
  }
}

/**
 * Replaces `window.open` with a recorder (via `page.addInitScript`, so it
 * survives every navigation) that pushes attempted URLs onto
 * `window.__openedUrls` instead of opening anything.
 *
 * Serves UC-USERS-14 and the Firefox/Safari branch of UC-WORK-19 (see
 * `docs/testability-gaps.md` §2.3): `page.waitForEvent('popup')` is the wrong
 * tool for these flows — it never fires for a `_self` navigation (the
 * Chromium branch of UC-WORK-19) and is unreliable for custom, unregistered
 * protocols like `whatsapp://` (UC-USERS-14's desktop path).
 *
 * Install **before** the action under test (the init script only affects
 * navigations that happen after registration):
 *
 * ```ts
 * await stubWindowOpen(page);
 * // ...navigate + click the share affordance...
 * expect(await getOpenedUrls(page)).toEqual([expect.stringContaining('whatsapp://send?text=')]);
 * ```
 */
export async function stubWindowOpen(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__openedUrls = [];
    window.open = (url?: string | URL) => {
      window.__openedUrls?.push(String(url));
      return null;
    };
  });
}

/** Reads the URLs recorded by {@link stubWindowOpen} (empty when nothing was opened). */
export function getOpenedUrls(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__openedUrls ?? []);
}
