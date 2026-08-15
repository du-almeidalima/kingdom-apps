import { Locator, Page } from '@playwright/test';

export class SignInPage {
  readonly card: Locator;
  readonly heading: Locator;
  readonly googleButton: Locator;
  readonly errorMessage: Locator;
  readonly image: Locator;

  constructor(private readonly page: Page) {
    this.card = page.getByTestId('sign-in-card');
    this.heading = page.getByRole('heading', { name: 'Cadastrar' });
    this.googleButton = page.locator('button.provider-login-button');
    this.errorMessage = page.getByTestId('sign-in-error');
    this.image = page.locator('img[alt="MM Image"]');
  }

  async goto(inviteId: string): Promise<void> {
    await this.page.goto(`/sign-in/${inviteId}`);
  }
}
