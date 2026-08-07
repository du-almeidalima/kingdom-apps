import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for the `lib-toaster-container` overlay.
 *
 * Wraps the `toast-message` testid added in WP-06. Toasts auto-dismiss
 * after a timeout, so callers should assert on `message` with web-first
 * assertions promptly after the triggering action.
 */
export class ToastPage {
  readonly message: Locator;

  constructor(private readonly page: Page) {
    this.message = page.getByTestId('toast-message');
  }

  /** Assert that a toast containing `text` is visible. */
  async expectText(text: string): Promise<void> {
    await expect(this.message.filter({ hasText: text })).toBeVisible();
  }
}
