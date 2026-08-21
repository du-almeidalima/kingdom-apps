import { expect, test } from '../fixtures';
import { ConfigurationPage } from '../page-objects/configuration.page';
import { TerritoriesPage } from '../page-objects/territories.page';
import { ToastPage } from '../page-objects/toast.page';

/**
 * J-05 — City rename cascade, and the orphaned-territory consequence of a city delete.
 *
 * Composes UC-CFG-01/03/08/09/10/11 + UC-TERR-02. Configuration writes cascade into
 * territories (rename), with two documented rough edges this journey locks in as
 * today's behaviour: (1) the in-memory `UserStateService` is **stale** after a
 * save until a full reload (UC-CFG-11, ⚠), so SPA-navigating to `/territories`
 * shows the old city names; (2) deleting a city is **never** translated into a
 * territory update, leaving an invisible-but-alive orphan (UC-CFG-10, ⚠).
 *
 * `/configuration` is the app's only English-language screen — every string is
 * asserted verbatim and intentionally not pt-BR.
 *
 * Seed: default baseline (`cities: ['São Paulo', 'Osasco']`; seed-territory-1/-3
 * in São Paulo, seed-territory-2 in Osasco).
 */
test('J-05 — City rename cascades to territories; city delete leaves an orphan (⚠ ×2)', async ({
  page,
  signInAs,
  db,
  seed,
}) => {
  await signInAs('admin');

  // Helper: navigate to /configuration with UserStateService fully hydrated.
  // Direct `page.goto('/configuration')` can race the user-state subscription;
  // landing on /home first guarantees the in-memory user is populated, then a
  // client-side popstate navigation preserves it (same pattern as
  // `configuration.spec.ts`'s `gotoConfigWithResolvedUser`).
  async function gotoConfig(): Promise<ConfigurationPage> {
    await page.goto('/home');
    await expect(page).toHaveURL(/\/(home|welcome)/, { timeout: 15000 });
    await expect(
      page.getByTestId('welcome-heading').or(page.getByTestId('home-heading')),
    ).toBeVisible({ timeout: 15000 });
    await page.evaluate(() => {
      window.history.pushState({}, '', '/configuration');
      window.dispatchEvent(new Event('popstate'));
    });
    await expect(page).toHaveURL(/\/configuration/, { timeout: 15000 });
    return new ConfigurationPage(page);
  }

  // Client-side (SPA) navigation that preserves the in-memory UserStateService —
  // a full `page.goto` would re-bootstrap and re-fetch the user from Firestore.
  async function spaNavigate(url: string): Promise<void> {
    await page.evaluate((u) => {
      window.history.pushState({}, '', u);
      window.dispatchEvent(new Event('popstate'));
    }, url);
  }

  const toast = new ToastPage(page);

  // ── Leg 1 — Rename `São Paulo` → `São Paulo Centro` (UC-CFG-01/03/08/09) ────
  const configPage = await gotoConfig();
  await expect(configPage.heading).toBeVisible();
  await expect(configPage.congregationNameSubtitle).toHaveText('Congregação Jardim Primavera');
  await expect(configPage.cityRows).toHaveCount(2);

  await configPage.editCity('São Paulo');
  const spInput = configPage.cityInput().first();
  await expect(spInput).toHaveValue('São Paulo');
  await configPage.fillCityInput(spInput, '');
  await configPage.fillCityInput(spInput, 'São Paulo Centro');
  await configPage.save();

  await toast.expectText('Cities updated successfully!');
  await expect(configPage.rowByName('São Paulo Centro')).toBeVisible();

  // ⟶ HAND-OFF (Firestore): batch rename landed.
  await expect
    .poll(async () => (await db.getDoc(db.collections.congregations, seed.ids.congregation))?.['cities'])
    .toEqual(['São Paulo Centro', 'Osasco']);
  await expect
    .poll(async () => (await db.getDoc(db.collections.territories, seed.ids.territories[0]))?.['city'])
    .toBe('São Paulo Centro');
  await expect
    .poll(async () => (await db.getDoc(db.collections.territories, seed.ids.territories[2]))?.['city'])
    .toBe('São Paulo Centro');
  // Osasco territory untouched (different city).
  expect((await db.getDoc(db.collections.territories, seed.ids.territories[1]))?.['city']).toBe('Osasco');

  // ── Leg 2 — Stale `/territories` filter, then the reload fix (UC-CFG-11 ⚠) ──
  // SPA-navigate (no reload) so the in-memory congregation stays stale.
  await spaNavigate('/territories');
  const territoriesPage = new TerritoriesPage(page);
  await expect(territoriesPage.list).toBeVisible();

  // ⚠ Stale: the select still offers the OLD names — ConfigurationBO never
  // called UserStateService.setUser(...).
  expect(await territoriesPage.cityOptions()).toEqual(['São Paulo', 'Osasco', 'Todas']);

  // Reload re-fetches the user from Firestore → fresh names.
  await page.reload();
  await expect(territoriesPage.list).toBeVisible();
  expect(await territoriesPage.cityOptions()).toEqual(['São Paulo Centro', 'Osasco', 'Todas']);

  // UC-TERR-02: selecting the renamed city lists both renamed territories.
  await territoriesPage.selectCity('São Paulo Centro');
  await expect(territoriesPage.territoryByAddress('Rua das Acácias, 45 - Pinheiros')).toBeVisible();
  await expect(territoriesPage.territoryByAddress('Rua Harmonia, 300 - Vila Madalena')).toBeVisible();

  // ── Leg 3 — Delete `Osasco`; the orphaned territory keeps its stale city ────
  // (UC-CFG-10 ⚠). Fixed (2026-08): a delete-only change now counts in hasChanges(),
  // so the deletion can be saved on its own — no more trailing-space workaround.
  const configPage2 = await gotoConfig();
  await configPage2.deleteCity('Osasco');
  await expect(configPage2.rowByName('Osasco')).toHaveCount(0);

  await configPage2.save();
  await toast.expectText('Cities updated successfully!');

  // ⟶ HAND-OFF (Firestore): congregation lost Osasco, but seed-territory-2 keeps
  // its stale `city: 'Osasco'` (delete never cascades to territories — UC-CFG-10 ⚠).
  await expect
    .poll(async () => (await db.getDoc(db.collections.congregations, seed.ids.congregation))?.['cities'])
    .toEqual(['São Paulo Centro']);
  await expect
    .poll(async () => (await db.getDoc(db.collections.territories, seed.ids.territories[1]))?.['city'])
    .toBe('Osasco');
  // The orphan's history subcollection is fully intact.
  expect(
    await db.getSubcollectionDocs(db.collections.territories, seed.ids.territories[1], db.historySubcollection),
  ).toHaveLength(1);

  // ── Leg 4 — The orphan is unreachable in the UI but alive in the data ──────
  await page.goto('/territories');
  await page.reload();
  await expect(territoriesPage.list).toBeVisible();

  // City select offers only São Paulo Centro and Todas (Osasco is gone).
  expect(await territoriesPage.cityOptions()).toEqual(['São Paulo Centro', 'Todas']);
  // The orphan (Av. dos Autonomistas) is unreachable via its (now-deleted) city:
  // it is NOT listed under the only selectable city.
  await territoriesPage.selectCity('São Paulo Centro');
  await expect(territoriesPage.territoryByAddress('Av. dos Autonomistas, 1200 - Centro')).toHaveCount(0);
  // The "Todas" view fetches every congregation territory, so the orphan still
  // shows up there even though its city matches no <option> (observed reality —
  // the pipe does not filter it out of the all-cities list).
  await territoriesPage.showAllCities();
  await expect(territoriesPage.territoryByAddress('Av. dos Autonomistas, 1200 - Centro')).toBeVisible();

  // Contrast with the backend: the orphan is unreachable via city selection, but
  // it is alive in Firestore (not deleted).
  expect(
    await db.queryWhere(db.collections.territories, 'congregationId', '==', seed.ids.congregation),
  ).toHaveLength(3);

  // ── FINAL SWEEP (Firestore) ────────────────────────────────────────────────
  expect((await db.getDoc(db.collections.congregations, seed.ids.congregation))?.['cities']).toEqual([
    'São Paulo Centro',
  ]);
  const allTerritories = await db.getCollectionDocs(db.collections.territories);
  expect(allTerritories).toHaveLength(3);
  expect(allTerritories.map((t) => t['city']).sort()).toEqual(['Osasco', 'São Paulo Centro', 'São Paulo Centro']);
  // No history doc was lost at any point in the journey.
  for (const tid of seed.ids.territories) {
    const historyDocs = await db.getSubcollectionDocs(db.collections.territories, tid, db.historySubcollection);
    expect(historyDocs.length).toBeGreaterThanOrEqual(1);
  }
});
