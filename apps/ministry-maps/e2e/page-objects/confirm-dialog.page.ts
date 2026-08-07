import { Locator, Page } from '@playwright/test';

/**
 * Page object for the shared `lib-confirm-dialog` overlay.
 *
 * Wraps the `confirm-dialog-*` testids added in WP-06. Specs use
 * `confirm()` / `cancel()` to interact, and `title` to assert context.
 * No synchronisation beyond the click — callers assert the post-action
 * state with web-first assertions.
 */
export class ConfirmDialogPage {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByTestId('confirm-dialog');
    this.title = this.dialog.locator('[class*="dialog__title"], h2').first();
    this.confirmButton = page.getByTestId('confirm-dialog-confirm');
    this.cancelButton = page.getByTestId('confirm-dialog-cancel');
  }

  /** Click the "Confirmar" button. */
  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }

  /** Click the "Cancelar" button. */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
