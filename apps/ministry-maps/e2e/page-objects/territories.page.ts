import { Page, Locator } from '@playwright/test';

import { BasePage } from './base.page';

/**
 * Page object for the `/territories` route.
 *
 * Uses `data-testid` selectors that were added to the app's HTML for robust,
 * locale-independent targeting.
 */
export class TerritoriesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate to the territories list page. */
  async goto(): Promise<void> {
    await super.goto('/territories');
    // Wait for the async pipe to resolve and the list to render.
    await this.list.waitFor({ state: 'visible', timeout: 15000 });
    // Switch to "Todas" (All) to see territories from all cities.
    await this.selectAllCities();
  }

  /** Select the "Todas" city filter so all territories are shown. */
  async selectAllCities(): Promise<void> {
    const select = this.page.locator('select[lib-select]');
    await select.waitFor({ state: 'visible', timeout: 10000 });
    await select.selectOption('ALL');
    // Wait for the list to update after filter change.
    await this.page.waitForTimeout(500);
  }

  /** The page heading element. */
  get heading(): Locator {
    return this.page.locator('[data-testid="territories-heading"]');
  }

  /** The territories list container. */
  get list(): Locator {
    return this.page.locator('[data-testid="territories-list"]');
  }

  /** All rendered territory list-item elements. */
  get territoryItems(): Locator {
    return this.page.locator('[data-testid="territory-list-item"]');
  }

  /** Returns the count of rendered territory items. */
  async count(): Promise<number> {
    return this.territoryItems.count();
  }

  /**
   * Returns an array of address strings visible in the rendered list.
   * Each list item's address is in `h3 .t-body2`.
   */
  async addresses(): Promise<string[]> {
    const count = await this.territoryItems.count();
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const address = await this.territoryItems
        .nth(i)
        .locator('h3 .t-body2')
        .textContent();
      if (address) {
        result.push(address.trim());
      }
    }
    return result;
  }
}
