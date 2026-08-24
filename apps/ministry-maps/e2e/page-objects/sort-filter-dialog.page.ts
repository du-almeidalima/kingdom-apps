import { Locator, Page } from '@playwright/test';

/**
 * Page object for the shared `lib-sort-filter` trigger + dialog.
 *
 * The trigger button (`sort-filter-trigger`) and optional badge
 * (`sort-filter-badge`) live on the host page. Clicking `open()` brings up
 * the `sort-filter-dialog` overlay whose inner controls use `sort-filter-*`
 * testids (WP-06). Call `apply()` to confirm changes, or dismiss by clicking
 * the cancel button.
 *
 * Used by both `/territories` and `/territories/assign`.
 */
export class SortFilterDialogPage {
  readonly trigger: Locator;
  readonly badge: Locator;
  readonly dialog: Locator;
  readonly sortSelect: Locator;
  readonly toggleFilters: Locator;
  readonly selectFilters: Locator;
  readonly textFilters: Locator;
  readonly applyButton: Locator;

  constructor(private readonly page: Page) {
    this.trigger = page.getByTestId('sort-filter-trigger');
    this.badge = page.getByTestId('sort-filter-badge');
    this.dialog = page.getByTestId('sort-filter-dialog');
    this.sortSelect = this.dialog.locator('#sort-select');
    this.toggleFilters = page.getByTestId('sort-filter-toggle');
    this.selectFilters = page.getByTestId('sort-filter-select');
    this.textFilters = page.getByTestId('sort-filter-text');
    this.applyButton = page.getByTestId('sort-filter-apply');
  }

  /** Click the filter trigger button to open the dialog. */
  async open(): Promise<void> {
    await this.trigger.click();
  }

  /** Click the "Aplicar" button to apply filter/sort changes. */
  async apply(): Promise<void> {
    await this.applyButton.click();
  }

  /** Select a sort option by its visible label text. */
  async selectSort(label: string): Promise<void> {
    await this.sortSelect.selectOption({ label });
  }

  /** Toggle a filter by its visible title text (clicks the matching toggle). */
  async toggleByTitle(title: string): Promise<void> {
    await this.toggleFilters.filter({ hasText: title }).click();
  }

  /** Select a filter option in a select-type filter identified by its title text. */
  async selectFilterByTitle(title: string, optionLabel: string): Promise<void> {
    await this.selectFilters.filter({ hasText: title }).locator('select').selectOption({ label: optionLabel });
  }
}
