import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for the `/territories` route.
 *
 * Uses `data-testid` selectors added to the app's HTML for robust,
 * locale-independent targeting. Synchronization after actions (e.g. filtering)
 * is left to the caller's web-first assertions rather than baked in here —
 * `goto()` only waits for the initial list to render.
 */
export class TerritoriesPage {
  readonly heading: Locator;
  readonly list: Locator;
  readonly territoryItems: Locator;
  readonly cityFilter: Locator;
  readonly searchInput: Locator;
  readonly addButton: Locator;
  readonly overflowMenu: Locator;
  readonly exportItem: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByTestId('territories-heading');
    this.list = page.getByTestId('territories-list');
    this.territoryItems = page.getByTestId('territory-list-item');
    this.cityFilter = page.getByTestId('territories-city-filter');
    // `<lib-search-input>` exposes no testid; target its inner `<input>`.
    this.searchInput = page.locator('lib-search-input input');
    this.addButton = page.getByTestId('territories-add-button');
    this.overflowMenu = page.getByTestId('territories-overflow-menu');
    this.exportItem = page.getByTestId('territories-export-item');
  }

  /** Navigate to the territory list page and wait for the list to render. Does not touch the city filter. */
  async goto(): Promise<void> {
    await this.page.goto('/territories');
    await expect(this.list).toBeVisible();
  }

  /** Select the "Todas" city filter so all territories are shown. */
  async showAllCities(): Promise<void> {
    await this.cityFilter.selectOption('ALL');
  }

  /** Select a specific city by its visible label. */
  async selectCity(city: string): Promise<void> {
    await this.cityFilter.selectOption(city);
  }

  /** Text contents of the city `<select>` options (cities first, `Todas` last). */
  async cityOptions(): Promise<string[]> {
    return this.cityFilter.locator('option').allTextContents();
  }

  /** Current rendered territory-row count. */
  async rowCount(): Promise<number> {
    return this.territoryItems.count();
  }

  /** Locator for the territory item whose address contains `address`. */
  territoryByAddress(address: string): Locator {
    return this.territoryItems.filter({ hasText: address });
  }

  /** Type a term into the search box (appends; clear first with `clearSearch()`). */
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }

  /** Clear the search box. */
  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
  }

  /** Open the ⋮ menu on the row whose address contains `address`. */
  async openItemMenu(address: string): Promise<void> {
    await this.territoryByAddress(address).getByTestId('territory-item-menu').click();
  }

  /** Locator for an item in the currently open CDK menu (by visible text, e.g. `Editar`). */
  menuItem(text: string): Locator {
    return this.page.locator('.menu__item').filter({ hasText: text });
  }

  /** The drag handle inside the row whose address contains `address` (only rendered per-city). */
  dragHandle(address: string): Locator {
    return this.territoryByAddress(address).getByTestId('territory-item-drag-handle');
  }
}
