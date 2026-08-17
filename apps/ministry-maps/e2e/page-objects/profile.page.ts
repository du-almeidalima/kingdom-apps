import { Locator, Page } from '@playwright/test';

/**
 * Page object for the `/profile` route.
 *
 * Exposes testids: `profile-initials`, `profile-name`, `profile-role-badge`,
 * `profile-congregation-name`, `profile-logout-button`.
 * Congregation switch card (`kingdom-apps-change-congregation`) is visible only to
 * `SUPERINTENDENT` and `APP_ADMIN`.
 */
export class ProfilePage {
  readonly initials: Locator;
  readonly name: Locator;
  readonly roleBadge: Locator;
  readonly congregationName: Locator;

  readonly changeCongregationCard: Locator;
  readonly congregationSelect: Locator;
  readonly logoutButton: Locator;

  constructor(private readonly page: Page) {
    this.initials = page.getByTestId('profile-initials').locator('figcaption');
    this.name = page.getByTestId('profile-name');
    this.roleBadge = page.getByTestId('profile-role-badge');
    this.congregationName = page.getByTestId('profile-congregation-name');

    this.changeCongregationCard = page.locator('kingdom-apps-change-congregation');
    this.congregationSelect = page.getByTestId('profile-congregation-select');
    this.logoutButton = page.getByTestId('profile-logout-button');

    this.appearanceSettings = page.getByTestId('appearance-settings');
    this.themeOptionSystem = page.getByTestId('theme-option-system');
    this.themeOptionLight = page.getByTestId('theme-option-light');
    this.themeOptionDark = page.getByTestId('theme-option-dark');
  }

  readonly appearanceSettings: Locator;
  readonly themeOptionSystem: Locator;
  readonly themeOptionLight: Locator;
  readonly themeOptionDark: Locator;

  /** Navigate to the profile page (uses SPA link if logged in to preserve UserState). */
  async goto(): Promise<void> {
    const profileLink = this.page.locator('#profile-link');
    if (await profileLink.isVisible().catch(() => false)) {
      await profileLink.click();
      await this.page.waitForURL(/\/profile/);
    } else {
      await this.page.goto('/profile');
    }
  }

  /** Select a congregation by visible text in the switch dropdown. */
  async selectCongregation(name: string): Promise<void> {
    await this.congregationSelect.selectOption({ label: name });
  }

  /** Select a theme preference option. */
  async selectTheme(preference: 'system' | 'light' | 'dark'): Promise<void> {
    await this.page.getByTestId(`theme-option-${preference}`).click();
  }
}
