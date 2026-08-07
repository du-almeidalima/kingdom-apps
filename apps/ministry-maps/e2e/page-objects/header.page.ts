import { Locator, Page } from '@playwright/test';

/**
 * Page object for the app header (`kingdom-apps-header`).
 *
 * The header wraps `lib-header` (common-ui) and projects the app name
 * plus the profile icon link. Uses the `header-nav` testid (WP-05) and
 * the existing `#profile-link` id.
 */
export class HeaderPage {
  readonly nav: Locator;
  readonly profileLink: Locator;
  readonly logo: Locator;
  readonly appName: Locator;

  constructor(private readonly page: Page) {
    this.nav = page.getByTestId('header-nav');
    this.profileLink = page.locator('#profile-link');
    this.logo = page.locator('lib-header .header__logo');
    this.appName = this.nav.locator('.header-container__app-name');
  }

  /** Click the profile icon to navigate to `/profile`. */
  async goToProfile(): Promise<void> {
    await this.profileLink.click();
  }

  /** Click the logo/initials to navigate to the home page. */
  async goToHome(): Promise<void> {
    await this.logo.click();
  }
}
