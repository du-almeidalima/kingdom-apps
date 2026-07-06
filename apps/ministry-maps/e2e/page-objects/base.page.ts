import { Page } from '@playwright/test';

/**
 * Shared base for all page objects. Wraps a Playwright `Page` and provides
 * common navigation helpers.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  /** Navigate to a relative path (appended to the `baseURL`). */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }
}
