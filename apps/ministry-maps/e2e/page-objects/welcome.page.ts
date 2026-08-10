import { Locator, Page } from '@playwright/test';

export class WelcomePage {
  readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByTestId('welcome-heading');
  }
}
