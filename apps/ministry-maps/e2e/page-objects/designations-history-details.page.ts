import { Locator, Page } from '@playwright/test';

export class DesignationsHistoryDetailsPage {
  readonly summaryText: Locator;
  readonly outcomeCounts: Locator;
  readonly unavailable: Locator;
  readonly notFound: Locator;
  readonly cards: Locator;

  constructor(private readonly page: Page) {
    this.summaryText = page.getByTestId('designations-progress-summary-text');
    this.outcomeCounts = page.getByTestId('designations-outcome-count');
    this.unavailable = page.getByTestId('designations-progress-unavailable');
    this.notFound = page.getByTestId('designations-history-details-not-found');
    this.cards = page.locator('kingdom-apps-designation-progress-card');
  }

  async goto(headerId: string) { await this.page.goto(`/territories/designations/${headerId}`); }
  cardByIndex(index: number): Locator { return this.cards.nth(index); }
  toggle(index: number): Locator { return this.cardByIndex(index).getByTestId('designation-progress-card-toggle'); }
  territoryRows(index: number): Locator { return this.cardByIndex(index).getByTestId('designation-territory-row'); }
  shareButton(index: number): Locator { return this.cardByIndex(index).getByTestId('designation-share-button'); }
}
