import { Locator, Page } from '@playwright/test';

/**
 * Page object for the `kingdom-apps-history-dialog` overlay.
 *
 * Wraps the `history-dialog-*` testids added in WP-06. Specs inspect
 * `rows` to assert visit-history entries and call `close()` to dismiss.
 */
export class HistoryDialogPage {
  readonly dialog: Locator;
  readonly rows: Locator;
  readonly closeButton: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByTestId('history-dialog');
    this.rows = page.getByTestId('history-dialog-row');
    this.closeButton = page.getByTestId('history-dialog-close');
  }

  /** Click the "Fechar" button to dismiss the dialog. */
  async close(): Promise<void> {
    await this.closeButton.click();
  }
}
