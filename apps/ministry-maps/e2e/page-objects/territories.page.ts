import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for the `/territories` route.
 *
 * Uses `data-testid` selectors that were added to the app's HTML for robust,
 * locale-independent targeting. Synchronization after actions (e.g. filtering)
 * is left to the caller's web-first assertions rather than baked in here —
 * `goto()` only waits for the initial list render.
 */
export class TerritoriesPage {
  readonly heading: Locator;
  readonly list: Locator;
  readonly territoryItems: Locator;
  readonly cityFilter: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByTestId('territories-heading');
    this.list = page.getByTestId('territories-list');
    this.territoryItems = page.getByTestId('territory-list-item');
    this.cityFilter = page.getByTestId('territories-city-filter');
  }

  /** Navigate to the territories list page and wait for the list to render. Does not touch the city filter. */
  async goto(): Promise<void> {
    await this.page.goto('/territories');
    await expect(this.list).toBeVisible();
  }

  /** Select the "Todas" city filter so all territories are shown. */
  async showAllCities(): Promise<void> {
    await this.cityFilter.selectOption('ALL');
  }

  /** Locator for the territory item whose address contains `address`. */
  territoryByAddress(address: string): Locator {
    return this.territoryItems.filter({ hasText: address });
  }
}
