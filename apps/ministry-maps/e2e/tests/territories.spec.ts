import { expect, test } from '../fixtures';
import { TerritoriesPage } from '../page-objects/territories.page';

test.describe('Territories page', () => {
  test('signs in as admin and loads /territories with the 3 default-seed territories', async ({
    signInAs,
    db,
    page,
  }) => {
    await signInAs('admin');

    const territoriesPage = new TerritoriesPage(page);
    await territoriesPage.goto();

    await expect(territoriesPage.heading).toBeVisible();

    // The default city ('São Paulo', 2 territories) differs from "Todas"
    // (3 territories), so `toHaveCount` after `showAllCities()` is a sound
    // signal that the filter actually applied (not a stale pre-filter render).
    await territoriesPage.showAllCities();
    await expect(territoriesPage.territoryItems).toHaveCount(3);

    await expect(territoriesPage.territoryByAddress('Rua das Acácias, 45 - Pinheiros')).toBeVisible();
    await expect(territoriesPage.territoryByAddress('Av. dos Autonomistas, 1200 - Centro')).toBeVisible();
    await expect(territoriesPage.territoryByAddress('Rua Harmonia, 300 - Vila Madalena')).toBeVisible();

    const firestoreTerritories = await db.getCollectionDocs(db.collections.territories);
    expect(firestoreTerritories).toHaveLength(3);
  });

  test('on-demand seeding reflects in the UI (extra territory → 4 items)', async ({ signInAs, db, seed, page }) => {
    const extraTerritory = seed.factories.buildTerritory({
      congregationId: seed.ids.congregation,
      city: 'Campinas',
      address: 'Rua Inventada, 999',
    });

    await seed.write({ territories: [extraTerritory] });

    await signInAs('admin');

    const territoriesPage = new TerritoriesPage(page);
    await territoriesPage.goto();

    await territoriesPage.showAllCities();
    await expect(territoriesPage.territoryItems).toHaveCount(4);
    await expect(territoriesPage.territoryByAddress('Rua Inventada, 999')).toBeVisible();

    const firestoreTerritories = await db.getCollectionDocs(db.collections.territories);
    expect(firestoreTerritories).toHaveLength(4);
  });

  test('unauthenticated access to /territories redirects to /login', async ({ page }) => {
    await page.goto('/territories');

    await expect(page).toHaveURL(/\/login/);
  });
});
