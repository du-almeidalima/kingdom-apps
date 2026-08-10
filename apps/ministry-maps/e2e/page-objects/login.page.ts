import { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly heading: Locator;
  readonly googleButton: Locator;
  readonly card: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Login' });
    this.googleButton = page.locator('button.provider-login-button');
    this.card = page.getByTestId('login-card');
  }
}
