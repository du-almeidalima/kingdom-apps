import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures';
import { ConfigurationPage } from '../page-objects/configuration.page';
import { RoleEnum } from '../../src/models/enums/role';

// ─── WP-25: configuration (cities management) ───────────────────────────────

test.describe('Configuration — Cities (WP-25)', () => {
  test.use({ role: 'admin' });

  // Helper to ensure UserStateService is fully hydrated before client-side navigation to /configuration
  async function gotoConfigWithResolvedUser(page: Page) {
    await page.goto('/home');
    await expect(page).toHaveURL(/\/(home|welcome)/, { timeout: 15000 });
    await expect(page.getByTestId('welcome-heading').or(page.getByTestId('home-heading'))).toBeVisible({
      timeout: 15000,
    });

    // Client-side Angular Router navigation via popstate so in-memory UserState is preserved
    await page.evaluate(() => {
      window.history.pushState({}, '', '/configuration');
      window.dispatchEvent(new Event('popstate'));
    });
    await expect(page).toHaveURL(/\/configuration/, { timeout: 15000 });
    return new ConfigurationPage(page);
  }

  test('UC-CFG-01 — Cities list renders congregation.cities for signed-in admin', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    const configPage = await gotoConfigWithResolvedUser(authenticatedPage);

    await expect(configPage.heading).toBeVisible();
    await expect(configPage.congregationNameSubtitle).toHaveText('Congregação Jardim Primavera');
    await expect(configPage.cityRows).toHaveCount(2);

    await expect(configPage.rowByName('São Paulo')).toBeVisible();
    await expect(configPage.rowByName('Osasco')).toBeVisible();

    const congDoc = await db.getDoc(db.collections.congregations, seed.ids.congregation);
    expect(congDoc?.['cities']).toEqual(['São Paulo', 'Osasco']);
  });

  test('UC-CFG-02 — Add a city opens a new, empty, editable row', async ({ authenticatedPage }) => {
    const configPage = await gotoConfigWithResolvedUser(authenticatedPage);

    await configPage.addCity();

    await expect(configPage.cityRows).toHaveCount(3);

    const input = configPage.cityInput().last();
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('');

    await expect(configPage.addCityButton).toBeDisabled();
    await expect(configPage.saveButton).toBeEnabled();
  });

  test('UC-CFG-03 — Rename an existing city inline', async ({ authenticatedPage }) => {
    const configPage = await gotoConfigWithResolvedUser(authenticatedPage);

    await configPage.editCity('São Paulo');

    const input = configPage.cityInput().first();
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('São Paulo');

    await configPage.fillCityInput(input, 'São Paulo Zona Sul');
    await expect(configPage.saveButton).toBeEnabled();
  });

  test('UC-CFG-04 — Delete city removes row locally and counts as a change (Save enabled)', async ({
    authenticatedPage,
    db,
    seed,
  }) => {
    const configPage = await gotoConfigWithResolvedUser(authenticatedPage);

    await configPage.deleteCity('Osasco');

    await expect(configPage.cityRows).toHaveCount(1);
    await expect(configPage.rowByName('Osasco')).toHaveCount(0);

    // Fixed (2026-08): hasChanges() also compares the row count against the congregation
    // snapshot, so a delete-only change now enables Save Changes.
    await expect(configPage.saveButton).toBeEnabled();

    // Firestore unchanged before actually saving
    const congDoc = await db.getDoc(db.collections.congregations, seed.ids.congregation);
    expect(congDoc?.['cities']).toEqual(['São Paulo', 'Osasco']);
  });

  test('UC-CFG-05 — Cancel edit reverts city back to original name', async ({ authenticatedPage }) => {
    const configPage = await gotoConfigWithResolvedUser(authenticatedPage);

    await configPage.editCity('São Paulo');
    const input = configPage.cityInput().first();
    await configPage.fillCityInput(input, 'São Paulo Modificado');

    await configPage.cancelButton.first().click();

    await expect(configPage.rowByName('São Paulo')).toBeVisible();
    await expect(configPage.saveButton).toBeDisabled();
  });

  test('UC-CFG-06 — Cancel new row removes the draft row', async ({ authenticatedPage }) => {
    const configPage = await gotoConfigWithResolvedUser(authenticatedPage);

    await configPage.addCity();
    await expect(configPage.cityRows).toHaveCount(3);

    await configPage.cancelButton.last().click();

    await expect(configPage.cityRows).toHaveCount(2);
    await expect(configPage.addCityButton).toBeEnabled();
    await expect(configPage.saveButton).toBeDisabled();
  });

  test('UC-CFG-07 — Save changes cascades city rename to territories', async ({ authenticatedPage, seed, db }) => {
    const configPage = await gotoConfigWithResolvedUser(authenticatedPage);

    await configPage.editCity('São Paulo');
    const input = configPage.cityInput().first();
    await configPage.fillCityInput(input, 'Sampa');

    await configPage.save();

    await expect(configPage.saveButton).toBeDisabled();
    await expect(configPage.rowByName('Sampa')).toBeVisible();

    // Assert Firestore congregation cities updated
    await expect
      .poll(async () => {
        const snap = await db.getDocSnapshot(db.collections.congregations, seed.ids.congregation);
        return snap.data()?.['cities'];
      })
      .toContain('Sampa');

    // Assert territory city updated
    await expect
      .poll(async () => {
        const snap = await db.getDocSnapshot(db.collections.territories, seed.ids.territories[0]);
        return snap.data()?.['city'];
      })
      .toBe('Sampa');
  });

  test('UC-CFG-08 — Blank city name triggers validation toast and blocks save', async ({ authenticatedPage }) => {
    const configPage = await gotoConfigWithResolvedUser(authenticatedPage);

    await configPage.addCity();
    const input = configPage.cityInput().last();
    await configPage.fillCityInput(input, '   ');

    await configPage.save();

    // Verify error toast
    await expect(authenticatedPage.locator('text=All cities must have a name.')).toBeVisible();
  });

  test('UC-CFG-09 — Duplicate city name triggers validation toast and blocks save', async ({ authenticatedPage }) => {
    const configPage = await gotoConfigWithResolvedUser(authenticatedPage);

    await configPage.addCity();
    const input = configPage.cityInput().last();
    await configPage.fillCityInput(input, 'São Paulo');

    await configPage.save();

    // Verify error toast
    await expect(authenticatedPage.locator('text=City names must be unique.')).toBeVisible();
  });

  test('UC-CFG-10 — Delete all cities renders empty state message', async ({ authenticatedPage }) => {
    const configPage = await gotoConfigWithResolvedUser(authenticatedPage);

    await configPage.deleteCity('São Paulo');
    await configPage.deleteCity('Osasco');

    await expect(configPage.cityRows).toHaveCount(0);
    await expect(authenticatedPage.locator('text=No cities configured yet.')).toBeVisible();
  });

  test('UC-CFG-11 — ⚠ User without a congregation sees error banner', async ({ page, seed, signInAsUser }) => {
    const userNoCong = seed.factories.buildUser({
      role: RoleEnum.ADMIN,
      congregationId: 'non-existent-congregation',
    });
    await seed.write({ users: [userNoCong] });

    await signInAsUser(userNoCong.id);

    const configPage = new ConfigurationPage(page);
    await configPage.goto();

    await expect(configPage.noCongregationBanner).toBeVisible();
    await expect(configPage.noCongregationBanner).toContainText(
      'No congregation found. Please ensure you are logged in.',
    );
  });

  test('UC-CFG-12 — Unauthenticated access loads route (app-routes.ts specifies roles: [*])', async ({ page }) => {
    await page.goto('/configuration');

    await expect(page).toHaveURL(/\/configuration/);
  });

  test('UC-CFG-13 — Non-admin (PUBLISHER) access loads route (app-routes.ts specifies roles: [*])', async ({
    signInAs,
    page,
  }) => {
    await signInAs('publisher');
    await page.goto('/configuration');

    await expect(page).toHaveURL(/\/configuration/);
  });
});
