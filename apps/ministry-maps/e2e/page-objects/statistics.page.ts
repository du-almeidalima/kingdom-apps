import { expect, Locator, Page } from '@playwright/test';

/**
 * Page object for the `/territories/statistics` route.
 *
 * The page renders two sections wrapped by `@if (isLoading)`:
 * - the static "Gerais" section (`statistics-static-section`) with four
 *   counter tiles (territories, people, bible studies, moved);
 * - the dynamic "Por período" section (`statistics-dynamic-section`) with the
 *   period `<select>` and two counter tiles (visits, revisits).
 *
 * Tile text is rendered as `Label: <span>N</span>` (e.g. `Territórios: 3`),
 * so callers assert via `toContainText('Label: N')`.
 *
 * `goto()` only waits for the static section to render (i.e. `isLoading`
 * flipped to `false`); further synchronization after city/period changes is
 * left to the caller's web-first assertions.
 */
export class StatisticsPage {
  readonly heading: Locator;
  readonly cityFilter: Locator;
  readonly periodFilter: Locator;
  readonly loading: Locator;
  readonly staticSection: Locator;
  readonly dynamicSection: Locator;
  readonly generalHeading: Locator;
  readonly periodHeading: Locator;
  readonly tileTerritories: Locator;
  readonly tilePeople: Locator;
  readonly tileBibleStudies: Locator;
  readonly tileMoved: Locator;
  readonly tileVisits: Locator;
  readonly tileRevisits: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByTestId('statistics-heading');
    this.cityFilter = page.getByTestId('statistics-city-filter');
    this.periodFilter = page.getByTestId('statistics-period-filter');
    this.loading = page.getByTestId('statistics-loading');
    this.staticSection = page.getByTestId('statistics-static-section');
    this.dynamicSection = page.getByTestId('statistics-dynamic-section');
    // The `<h2>` headings inside each section carry no testid — target them by
    // role/name within the (loaded) section wrapper.
    this.generalHeading = this.staticSection.getByRole('heading', { level: 2, name: 'Gerais' });
    this.periodHeading = this.dynamicSection.getByRole('heading', { level: 2, name: 'Por período' });
    this.tileTerritories = page.getByTestId('statistic-tile-territories');
    this.tilePeople = page.getByTestId('statistic-tile-people');
    this.tileBibleStudies = page.getByTestId('statistic-tile-bible-studies');
    this.tileMoved = page.getByTestId('statistic-tile-moved');
    this.tileVisits = page.getByTestId('statistic-tile-visits');
    this.tileRevisits = page.getByTestId('statistic-tile-revisits');
  }

  /** Navigate to the statistics page and wait for the static section to render. */
  async goto(): Promise<void> {
    await this.page.goto('/territories/statistics');
    await expect(this.staticSection).toBeVisible();
  }

  /** Reload the page (used to reset the cached `TerritoryStatisticsBO` after on-demand seeds). */
  async reload(): Promise<void> {
    await this.page.reload();
    await expect(this.staticSection).toBeVisible();
  }

  /** Select a specific city by its visible label. */
  async selectCity(city: string): Promise<void> {
    await this.cityFilter.selectOption(city);
  }

  /** Select the "Todas" (ALL) option to aggregate across cities. */
  async showAllCities(): Promise<void> {
    await this.cityFilter.selectOption('ALL');
  }

  /** Text contents of the city `<select>` options (cities first, `Todas` last). */
  async cityOptions(): Promise<string[]> {
    return this.cityFilter.locator('option').allTextContents();
  }

  /** Select a period by its visible label (e.g. `Este Mês`, `1 Mês`, `3 Meses`, `6 meses`, `1 ano`, `Este Ano`). */
  async selectPeriodByLabel(label: string): Promise<void> {
    await this.periodFilter.selectOption({ label });
  }

  /** Select a period by its underlying value (e.g. `THIS_MONTH`, `ONE_MONTH`). */
  async selectPeriodByValue(value: string): Promise<void> {
    await this.periodFilter.selectOption(value);
  }
}
