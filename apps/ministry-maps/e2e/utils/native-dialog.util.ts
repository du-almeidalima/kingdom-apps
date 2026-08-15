import { Page } from '@playwright/test';

/**
 * Registers a one-shot handler that **accepts** the next native dialog
 * (`window.confirm`/`alert`/`prompt`) — UC-CFG-10's city delete calls
 * `window.confirm('Are you sure you want to delete this city?')` (see
 * `docs/testability-gaps.md` §2.2).
 *
 * **Registration-before-click rule:** a native dialog has no DOM presence, so
 * no locator can see it, and Playwright's default auto-dismiss would hang the
 * app's confirm flow — the handler must be registered **before** the click
 * that opens it:
 *
 * ```ts
 * acceptNextDialog(page);
 * await page.getByRole('button', { name: 'Delete' }).first().click();
 * ```
 *
 * `page.once` auto-removes the handler after it fires, so each delete needs a
 * fresh registration.
 */
export function acceptNextDialog(page: Page): void {
  page.once('dialog', (dialog) => void dialog.accept());
}

/**
 * Registers a one-shot handler that **dismisses** the next native dialog —
 * the cancel path of UC-CFG-10. Same registration-before-click rule as
 * {@link acceptNextDialog}.
 */
export function dismissNextDialog(page: Page): void {
  page.once('dialog', (dialog) => void dialog.dismiss());
}
