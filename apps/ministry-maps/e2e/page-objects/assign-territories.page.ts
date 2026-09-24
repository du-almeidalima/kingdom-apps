import { Locator, Page } from '@playwright/test';

/**
 * Page object for the `/territories/assign` route.
 *
 * Wraps the `assign-*` testids (WP-05). The submit FAB has no testid — it is
 * targeted by its stable `title="Enviar Designação"`; its selected-count badge
 * (the `fab-badge` testid added by `FloatingActionButtonComponent`) is exposed
 * as {@link AssignTerritoriesPage.selectedCount}. The search input has no
 * testid, so its inner `<input>` is targeted. Checkbox rows are the
 * `assign-territory-checkbox` components; ticking happens by clicking the row
 * (the testid sits on the wrapping `<label>`), and the checked state is read
 * from the hidden inner `input[type=checkbox]:checked`. Clicking a row that is
 * already assigned (checked-and-disabled) re-triggers the designation share.
 */
export class AssignTerritoriesPage {
  readonly heading: Locator;
  readonly cityFilter: Locator;
  readonly list: Locator;
  readonly checkboxes: Locator;
  readonly dock: Locator;
  readonly submitButton: Locator;
  /** Alias for submitButton to maintain backwards compatibility with existing specs. */
  readonly fab: Locator;
  readonly stopButton: Locator;
  readonly selectedCount: Locator;
  readonly selectedText: Locator;
  readonly assignedCount: Locator;
  readonly searchInput: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByTestId('assign-heading');
    this.cityFilter = page.getByTestId('assign-city-filter');
    this.list = page.getByTestId('assign-territory-list');
    this.checkboxes = page.getByTestId('assign-territory-checkbox');
    this.dock = page.getByTestId('assign-dock');
    this.submitButton = page.getByTitle('Enviar Designação', { exact: true });
    this.fab = this.submitButton;
    this.stopButton = page.getByTestId('assign-dock-stop-button');
    this.selectedCount = page.getByTestId('assign-dock-selected-badge');
    this.selectedText = page.getByTestId('assign-dock-selected-text');
    this.assignedCount = page.getByTestId('assign-dock-assigned-text');
    this.searchInput = page.locator('lib-search-input input');
  }

  /** Navigate to the assign page and wait for the list to render. */
  async goto(): Promise<void> {
    await this.page.goto('/territories/assign');
    await this.heading.waitFor();
  }

  /** Select the "Todas" city filter so every territory is shown. */
  async showAllCities(): Promise<void> {
    await this.cityFilter.selectOption('ALL');
  }

  /** Select a specific city by its visible label. */
  async selectCity(city: string): Promise<void> {
    await this.cityFilter.selectOption(city);
  }

  /** The checkbox row whose address contains `address`. */
  checkboxByAddress(address: string): Locator {
    return this.checkboxes.filter({ hasText: address });
  }

  /** Tick (click) the checkbox row for the given address. */
  async check(address: string): Promise<void> {
    await this.checkboxByAddress(address).click();
  }

  /** Whether the checkbox row for `address` is currently checked. */
  async isChecked(address: string): Promise<boolean> {
    const row = this.checkboxByAddress(address);
    return (await row.locator('input[type="checkbox"]:checked').count()) > 0;
  }

  /** Type a term into the search box. */
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }
}
