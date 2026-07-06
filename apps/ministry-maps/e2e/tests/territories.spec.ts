import { expect, test } from '../fixtures';
import { TerritoriesPage } from '../page-objects/territories.page';

test.describe('Territories page', () => {
  test('signs in as admin and loads /territories with the 3 default-seed territories', async ({
    signInAs,
    db,
    seed,
    page,
  }) => {
    await signInAs('admin');

    const territoriesPage = new TerritoriesPage(page);
    await territoriesPage.goto();

    await expect(territoriesPage.heading).toBeVisible();

    const count = await territoriesPage.count();
    expect(count).toBe(3);

    const addresses = await territoriesPage.addresses();
    expect(addresses).toContain('Rua das Acácias, 45 - Pinheiros');
    expect(addresses).toContain('Av. dos Autonomistas, 1200 - Centro');
    expect(addresses).toContain('Rua Harmonia, 300 - Vila Madalena');

    const firestoreTerritories = await db.getCollectionDocs(db.collections.territories);
    expect(firestoreTerritories).toHaveLength(3);
  });

  test('on-demand seeding reflects in the UI (extra territory → 4 items)', async ({ signInAs, db, seed, page }) => {
    const extraTerritory = seed.factories.buildTerritory({
      congregationId: seed.ids.congregation,
      city: 'Campinas',
      address: 'Rua Inventada, 999',
    });

    await seed.write({
      congregations: [],
      users: [],
      territories: [extraTerritory],
      designations: [],
    });

    await signInAs('admin');

    const territoriesPage = new TerritoriesPage(page);
    await territoriesPage.goto();

    const count = await territoriesPage.count();
    expect(count).toBe(4);

    const addresses = await territoriesPage.addresses();
    expect(addresses).toContain('Rua Inventada, 999');

    const firestoreTerritories = await db.getCollectionDocs(db.collections.territories);
    expect(firestoreTerritories).toHaveLength(4);
  });

  test('unauthenticated access to /territories redirects to /login', async ({ page }) => {
    await page.goto('/territories');

    await expect(page).toHaveURL(/\/login/);
  });
});
