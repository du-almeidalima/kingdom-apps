import { expect, test } from '../fixtures';
import { ProfilePage } from '../page-objects/profile.page';

test.describe('Theme & Appearance Settings', () => {
  test.use({ role: 'admin' });

  test('TS-E01: should default to system preference and resolve theme from color-scheme media', async ({
    authenticatedPage: page,
  }) => {
    // Emulate dark media
    await page.emulateMedia({ colorScheme: 'dark' });
    const profilePage = new ProfilePage(page);
    await profilePage.goto();

    await expect(profilePage.appearanceSettings).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'system');
    await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', 'dark');

    // Emulate light media in real time
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'system');
    await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', 'light');
  });

  test('TS-E02 & TS-E03: should allow switching between system, light, and dark themes and persist to localStorage', async ({
    authenticatedPage: page,
  }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto();

    // Select Dark
    await profilePage.selectTheme('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', 'dark');

    const darkStorageValue = await page.evaluate(() => localStorage.getItem('ministry-maps.theme-preference'));
    expect(darkStorageValue).toBe('dark');

    // Select Light
    await profilePage.selectTheme('light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', 'light');

    const lightStorageValue = await page.evaluate(() => localStorage.getItem('ministry-maps.theme-preference'));
    expect(lightStorageValue).toBe('light');

    // Select System
    await profilePage.selectTheme('system');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'system');

    const systemStorageValue = await page.evaluate(() => localStorage.getItem('ministry-maps.theme-preference'));
    expect(systemStorageValue).toBe('system');
  });

  test('TS-E04: should retain persisted theme on page reload', async ({ authenticatedPage: page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto();

    await profilePage.selectTheme('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', 'dark');
  });

  test('TS-E05: should sync theme across browser tabs/contexts via storage events', async ({
    authenticatedPage: page,
    context,
  }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto();

    // Open second page in same context
    const secondPage = await context.newPage();
    await secondPage.goto('/profile');

    // Change theme on first page to dark
    await profilePage.selectTheme('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Second page should sync to dark
    await expect(secondPage.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(secondPage.locator('html')).toHaveAttribute('data-resolved-theme', 'dark');

    await secondPage.close();
  });
});
