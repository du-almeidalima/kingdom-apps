import { Locator, Page } from '@playwright/test';

export class NoAccountPage {
  readonly container: Locator;
  readonly heading: Locator;
  readonly image: Locator;

  constructor(private readonly page: Page) {
    this.container = page.getByTestId('no-account-container');
    this.heading = page.getByRole('heading', { name: 'Olá!' });
    this.image = page.locator('img[alt="MM Image"]');
  }
}
