import { expect, test } from '../fixtures';
import { CongregationPage } from '../page-objects/congregation.page';
import { TerritoriesPage } from '../page-objects/territories.page';
import { ToastPage } from '../page-objects/toast.page';
import { WorkPage } from '../page-objects/work.page';
import { WorkItemCompleteDialogPage } from '../page-objects/work-item-complete-dialog.page';
import { DesignationStatusEnum } from '../../src/models/enums/designation-status';

/**
 * J-05 — City rename cascade, immediate client-state refresh, safe visit write-backs,
 * and final city removal with territory transfer.
 */
test('J-05 — City rename cascades to territories, refreshes client state without reload, preserves renamed city on Designation visit write-back, and transfers territories on city removal', async ({
  page,
  signInAs,
  db,
  seed,
}) => {
  // Seed an active designation created BEFORE the city rename so we can verify
  // completing a visit after the rename does not overwrite the territory's new city.
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const preRenameDesignation = seed.factories.buildDesignation({
    id: 'j05-pre-rename-designation',
    congregationId: seed.ids.congregation,
    createdBy: seed.ids.adminUser,
    expiresAt: futureDate,
    territories: [
      {
        ...seed.factories.buildDesignationTerritory({
          id: seed.ids.territories[0],
          congregationId: seed.ids.congregation,
          city: 'São Paulo',
          address: 'Rua das Acácias, 45 - Pinheiros',
          status: DesignationStatusEnum.PENDING,
        }),
        history: [],
      },
    ],
  });
  await seed.write({ designations: [preRenameDesignation] });

  await signInAs('admin');

  async function spaNavigate(url: string): Promise<void> {
    await page.evaluate((u) => {
      window.history.pushState({}, '', u);
      window.dispatchEvent(new Event('popstate'));
    }, url);
  }

  const toast = new ToastPage(page);
  const configPage = new CongregationPage(page);

  // ── Leg 1 — Rename `São Paulo` → `São Paulo Centro` ─────────────────────────
  await configPage.goto();
  await expect(configPage.heading).toBeVisible();
  await expect(configPage.congregationName).toHaveText('Congregação Jardim Primavera');
  await expect(configPage.cityRows).toHaveCount(2);

  await configPage.editCity('São Paulo');
  const spInput = configPage.cityInput();
  await expect(spInput).toHaveValue('São Paulo');
  await spInput.fill('São Paulo Centro');
  await configPage.saveCityButton().click();

  await toast.expectText('Cidade atualizada com sucesso!');
  await expect(configPage.rowByName('São Paulo Centro')).toBeVisible();

  await expect
    .poll(async () => (await db.getDoc(db.collections.congregations, seed.ids.congregation))?.['cities'])
    .toEqual(['São Paulo Centro', 'Osasco']);
  await expect
    .poll(async () => (await db.getDoc(db.collections.territories, seed.ids.territories[0]))?.['city'])
    .toBe('São Paulo Centro');
  await expect
    .poll(async () => (await db.getDoc(db.collections.territories, seed.ids.territories[2]))?.['city'])
    .toBe('São Paulo Centro');
  expect((await db.getDoc(db.collections.territories, seed.ids.territories[1]))?.['city']).toBe('Osasco');

  // ── Leg 2 — SPA navigate to `/territories` without reload (immediate state sync)
  await spaNavigate('/territories');
  const territoriesPage = new TerritoriesPage(page);
  await expect(territoriesPage.list).toBeVisible();

  expect(await territoriesPage.cityOptions()).toEqual(['São Paulo Centro', 'Osasco', 'Todas']);
  await territoriesPage.selectCity('São Paulo Centro');
  await expect(territoriesPage.territoryByAddress('Rua das Acácias, 45 - Pinheiros')).toBeVisible();
  await expect(territoriesPage.territoryByAddress('Rua Harmonia, 300 - Vila Madalena')).toBeVisible();

  // ── Leg 3 — Work a pre-rename Designation and verify city is NOT rolled back
  const workPage = new WorkPage(page);
  const completeDialog = new WorkItemCompleteDialogPage(page);
  await workPage.goto(preRenameDesignation.id);

  await workPage.itemByAddress('Rua das Acácias, 45 - Pinheiros').getByTestId('work-item-checkbox').click();
  await expect(completeDialog.dialog).toBeVisible();
  await completeDialog.notesTextarea.fill('Visita após renomear cidade');
  await completeDialog.submit();

  await expect(async () => {
    const territoryDoc = await db.getDoc(db.collections.territories, seed.ids.territories[0]);
    expect(territoryDoc?.['city']).toBe('São Paulo Centro');
    const historyDocs = await db.getSubcollectionDocs(
      db.collections.territories,
      seed.ids.territories[0],
      db.historySubcollection,
    );
    expect(historyDocs.some((h) => h['notes'] === 'Visita após renomear cidade')).toBe(true);
  }).toPass();

  // ── Leg 4 — Remove `Osasco` and transfer its territory to `São Paulo Centro`
  await configPage.goto();
  await configPage.openRemoveCityDialog('Osasco');
  await expect(configPage.removeCityDialog).toBeVisible();
  await expect(configPage.removeCityTargetSelect).toHaveValue('São Paulo Centro');
  await configPage.removeCityConfirmButton.click();

  await toast.expectText('Cidade removida com sucesso!');
  await expect(configPage.rowByName('Osasco')).toHaveCount(0);

  await expect
    .poll(async () => (await db.getDoc(db.collections.congregations, seed.ids.congregation))?.['cities'])
    .toEqual(['São Paulo Centro']);
  await expect
    .poll(async () => (await db.getDoc(db.collections.territories, seed.ids.territories[1]))?.['city'])
    .toBe('São Paulo Centro');
  await expect
    .poll(async () => (await db.getDoc(db.collections.territories, seed.ids.territories[1]))?.['positionIndex'])
    .toBe(3);

  // SPA navigate to /territories — Osasco is gone and transferred territory is listed under São Paulo Centro
  await spaNavigate('/territories');
  await expect(territoriesPage.list).toBeVisible();
  expect(await territoriesPage.cityOptions()).toEqual(['São Paulo Centro', 'Todas']);
  await territoriesPage.selectCity('São Paulo Centro');
  await expect(territoriesPage.territoryByAddress('Av. dos Autonomistas, 1200 - Centro')).toBeVisible();
});
