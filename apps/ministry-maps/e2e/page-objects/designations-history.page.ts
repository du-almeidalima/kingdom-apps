import { Locator, Page } from '@playwright/test';

export class DesignationsHistoryPage {
  readonly heading: Locator;
  readonly rows: Locator;
  readonly emptyState: Locator;
  readonly loadMore: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByTestId('designations-history-heading');
    this.rows = page.getByTestId('designations-header-list-item');
    this.emptyState = page.getByTestId('designations-history-empty');
    this.loadMore = page.getByTestId('designations-history-load-more');
  }

  async goto() { await this.page.goto('/territories/designations'); }
}
