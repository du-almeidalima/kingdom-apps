import { Locator, Page } from '@playwright/test';

export class WorkPage {
  readonly loading: Locator;
  readonly pendingList: Locator;
  readonly completedList: Locator;
  readonly expiredNote: Locator;
  readonly allDone: Locator;
  readonly territoriesHeading: Locator;
  readonly completedHeading: Locator;
  readonly notFound: Locator;
  readonly notFoundHeading: Locator;
  readonly notFoundIcon: Locator;

  constructor(public readonly page: Page) {
    this.loading = page.getByTestId('work-loading');
    this.pendingList = page.getByTestId('work-pending-list');
    this.completedList = page.getByTestId('work-completed-list');
    this.expiredNote = page.getByTestId('work-expired-note');
    this.allDone = page.getByTestId('work-all-done');
    this.territoriesHeading = page.getByRole('heading', { name: 'Territórios' });
    this.completedHeading = page.getByRole('heading', { name: 'Concluídos' });
    this.notFound = page.getByTestId('work-designation-not-found');
    this.notFoundHeading = page.getByTestId('designation-not-found-heading');
    this.notFoundIcon = page.getByTestId('designation-not-found-icon');
  }

  itemByAddress(address: string): Locator {
    return this.page.getByTestId('work-item').filter({ hasText: address });
  }

  async goto(designationId: string): Promise<void> {
    await this.page.goto(`/work/${designationId}`);
  }
}
