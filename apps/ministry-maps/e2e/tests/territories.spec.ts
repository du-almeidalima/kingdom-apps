import { expect, test } from '../fixtures';
import { TerritoriesPage } from '../page-objects/territories.page';
import { SortFilterDialogPage } from '../page-objects/sort-filter-dialog.page';
import { RoleEnum } from '../../src/models/enums/role';

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

// ─── WP-13: list / search / sort extensions ──────────────────────────────────

test.describe('Territories page — list scope and filters (WP-13)', () => {
  test.use({ role: 'admin' });

  test('UC-TERR-01 — list shows only the signed-in user\'s congregation territories', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    // Foreign territory belonging to a different congregation.
    const foreign = seed.factories.buildTerritory({
      congregationId: 'other-congregation',
      city: 'São Paulo',
      address: 'Rua Estrangeira, 1',
    });
    await seed.write({ territories: [foreign] });

    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();

    // Foreign territory never appears, in any city filter state.
    await territoriesPage.showAllCities();
    await expect(territoriesPage.territoryItems).toHaveCount(3);
    await expect(territoriesPage.territoryByAddress('Rua Estrangeira, 1')).toHaveCount(0);

    // Persistence: congregation-scoped query returns exactly the 3 baseline; full collection has 4.
    const own = await db.queryWhere(
      db.collections.territories,
      'congregationId',
      '==',
      seed.ids.congregation,
    );
    expect(own).toHaveLength(3);
    const all = await db.getCollectionDocs(db.collections.territories);
    expect(all).toHaveLength(4);
  });

  test('UC-TERR-02 — city select mirrors congregation.cities; "Todas" is last and sorts alphabetically', async ({
    authenticatedPage,
    db,
  }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();

    // Options in order: cities (in array order) then `Todas`.
    const options = await territoriesPage.cityOptions();
    expect(options).toEqual(['São Paulo', 'Osasco', 'Todas']);

    // Default first city (São Paulo) pre-selected → its 2 territories, ordered by positionIndex.
    await expect(territoriesPage.territoryItems).toHaveCount(2);
    await expect(territoriesPage.territoryItems.nth(0)).toContainText('Rua das Acácias, 45 - Pinheiros');
    await expect(territoriesPage.territoryItems.nth(1)).toContainText('Rua Harmonia, 300 - Vila Madalena');

    // "Todas" sorts alphabetically by city → Osasco's single territory renders first.
    await territoriesPage.showAllCities();
    await expect(territoriesPage.territoryItems).toHaveCount(3);
    await expect(territoriesPage.territoryItems.nth(0)).toContainText('Av. dos Autonomistas, 1200 - Centro');

    const cong = await db.getDoc(db.collections.congregations, 'seed-congregation');
    expect(cong?.['cities']).toEqual(['São Paulo', 'Osasco']);
  });

  test('UC-TERR-03 — empty city yields zero rows', async ({ authenticatedPage, seed, db }) => {
    // Extend the baseline congregation with a city that has no territories.
    await db.firestore
      .collection(db.collections.congregations)
      .doc(seed.ids.congregation)
      .update({ cities: ['São Paulo', 'Osasco', 'Guarulhos'] });

    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    await territoriesPage.selectCity('Guarulhos');

    // The list container still renders but holds zero rows.
    await expect(territoriesPage.list).toBeVisible();
    await expect(territoriesPage.territoryItems).toHaveCount(0);

    expect(await db.queryWhere(db.collections.territories, 'city', '==', 'Guarulhos')).toHaveLength(0);
  });

  test('UC-TERR-04 — empty congregation (cities: []) collapses the filter (⚠ defect)', async ({
    seed,
    signInAsUser,
    db,
    page,
  }) => {
    const congregation = seed.factories.buildCongregation({ cities: [] });
    const admin = seed.factories.buildUser({
      role: RoleEnum.ADMIN,
      congregationId: congregation.id,
    });
    await seed.write({ congregations: [congregation], users: [admin] });

    await signInAsUser(admin.id);

    const territoriesPage = new TerritoriesPage(page);
    await page.goto('/territories');

    // ⚠ Today's reality: `filteredTerritories$` errors inside the `map()` of
    // `territoriesFilterPipe` (`undefined.toLowerCase()`), which aborts rendering of the
    // whole page content — the heading, the city `<select>` AND the list are all absent
    // (the router outlet renders an empty `<main>`).
    await expect(territoriesPage.heading).toHaveCount(0);
    await expect(territoriesPage.cityFilter).toHaveCount(0);
    await expect(territoriesPage.list).toHaveCount(0);

    const cong = await db.getDoc(db.collections.congregations, congregation.id);
    expect(cong?.['cities']).toEqual([]);
    expect(await db.getCollectionDocs(db.collections.territories)).toHaveLength(3);
  });

  test('UC-TERR-05 — multi-word search AND-matches across address and note', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    const extra = seed.factories.buildTerritory({
      congregationId: seed.ids.congregation,
      city: 'São Paulo',
      address: 'Rua das Flores, 123 - Vila Mariana',
      note: 'Prédio com portaria, falar com o porteiro.',
    });
    await seed.write({ territories: [extra] });

    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    await territoriesPage.showAllCities();

    await territoriesPage.search('flores porteiro');
    await expect(territoriesPage.territoryByAddress('Rua das Flores, 123 - Vila Mariana')).toBeVisible();
    await expect(territoriesPage.territoryItems).toHaveCount(1);

    // A word matching neither field yields zero results.
    await territoriesPage.search('flores inexistente');
    await expect(territoriesPage.territoryItems).toHaveCount(0);

    const stored = await db.getDoc(db.collections.territories, extra.id);
    expect(stored?.['address']).toBe('Rua das Flores, 123 - Vila Mariana');
    expect(String(stored?.['note'])).toContain('porteiro');
  });

  test('UC-TERR-06 — search is case-insensitive but accent-sensitive', async ({
    authenticatedPage,
    db,
  }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    await territoriesPage.showAllCities();

    // Uppercase with correct accent → matches (case folded on both sides).
    await territoriesPage.search('ACÁCIAS');
    await expect(territoriesPage.territoryByAddress('Rua das Acácias, 45 - Pinheiros')).toBeVisible();

    // No accent → zero results (accents are never normalised).
    await territoriesPage.search('acacias');
    await expect(territoriesPage.territoryItems).toHaveCount(0);

    expect((await db.getDoc(db.collections.territories, 'seed-territory-1'))?.['address']).toBe(
      'Rua das Acácias, 45 - Pinheiros',
    );
  });

  test('UC-TERR-07 — "Ordem de Cadastro" sorts by saved positionIndex', async ({ authenticatedPage, db }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    // Default city (São Paulo) + default sort (SAVED_INDEX).
    await expect(territoriesPage.territoryItems).toHaveCount(2);
    // positionIndex 0 above positionIndex 2.
    await expect(territoriesPage.territoryItems.nth(0)).toContainText('Rua das Acácias, 45 - Pinheiros');
    await expect(territoriesPage.territoryItems.nth(1)).toContainText('Rua Harmonia, 300 - Vila Madalena');

    expect((await db.getDoc(db.collections.territories, 'seed-territory-1'))?.['positionIndex']).toBe(0);
    expect((await db.getDoc(db.collections.territories, 'seed-territory-3'))?.['positionIndex']).toBe(2);
  });

  test('UC-TERR-08 — "Última Visita" sorts by lastVisit', async ({ authenticatedPage, seed, db }) => {
    // Seed an extra São Paulo territory whose positionIndex (4) puts it LAST under
    // SAVED_INDEX but whose lastVisit (oldest) puts it FIRST under LAST_VISIT, so the
    // sort change is genuinely observable.
    const extra = seed.factories.buildTerritory({
      congregationId: seed.ids.congregation,
      city: 'São Paulo',
      address: 'Rua Antiga, 7',
      positionIndex: 4,
      history: [
        seed.factories.buildVisitHistory({
          date: new Date('2024-01-01T10:00:00.000Z'),
        }),
      ],
    });
    await seed.write({ territories: [extra] });

    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();

    // Default SAVED_INDEX → extra (index 4) is last.
    await expect(territoriesPage.territoryItems).toHaveCount(3);
    await expect(territoriesPage.territoryItems.nth(2)).toContainText('Rua Antiga, 7');

    // Switch sort to "Última Visita" (ascending) → extra (oldest) floats to the top.
    const sortFilter = new SortFilterDialogPage(authenticatedPage);
    await sortFilter.open();
    await expect(sortFilter.dialog).toBeVisible();
    await sortFilter.selectSort('Última Visita');
    await sortFilter.apply();

    await expect(territoriesPage.territoryItems.nth(0)).toContainText('Rua Antiga, 7');

    const t1 = await db.getDoc(db.collections.territories, 'seed-territory-1');
    const t3 = await db.getDoc(db.collections.territories, 'seed-territory-3');
    expect(t1?.['lastVisit']).toBeTruthy();
    expect(t3?.['lastVisit']).toBeTruthy();
  });

  test('UC-TERR-33 — no "open in Maps" affordance on this screen (⚠ defect)', async ({
    authenticatedPage,
    db,
  }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    await territoriesPage.showAllCities();

    // A territory-list-item never renders a maps link/button.
    const firstRow = territoriesPage.territoryItems.nth(0);
    await expect(firstRow.locator('a[href*="maps"], a[href*="goo.gl"]')).toHaveCount(0);

    // mapsLink is modelled and round-trips, but there is nothing to click here.
    const t1 = await db.getDoc(db.collections.territories, 'seed-territory-1');
    expect(t1?.['mapsLink']).toBeTruthy();
  });
});
