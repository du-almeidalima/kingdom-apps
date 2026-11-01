import { expect, test } from '../fixtures';
import { CongregationPage } from '../page-objects/congregation.page';
import { TerritoriesPage } from '../page-objects/territories.page';
import { ToastPage } from '../page-objects/toast.page';
import { dragRowByMouse } from '../utils/cdk-drag.util';
import { RoleEnum } from '../../src/models/enums/role';

test.describe('Congregation Administration (/congregation)', () => {
  test.use({ role: 'admin' });

  test('UC-CFG-01 — Renders congregation name and cities in pt-BR and hides Add Congregation for ADMIN', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    const configPage = new CongregationPage(authenticatedPage);
    await configPage.goto();

    await expect(configPage.heading).toHaveText('Administrar Congregação');
    await expect(configPage.congregationName).toHaveText('Congregação Jardim Primavera');
    await expect(configPage.editNameButton).toBeVisible();
    await expect(configPage.congregationNameInput).toHaveCount(0);

    await configPage.editNameButton.click();
    await expect(configPage.congregationNameInput).toHaveValue('Congregação Jardim Primavera');
    await expect(configPage.saveNameButton).toBeDisabled();
    await configPage.cancelNameButton.click();
    await expect(configPage.addCongregationButton).toHaveCount(0);

    await expect(configPage.cityRows).toHaveCount(2);
    await expect(configPage.rowByName('São Paulo')).toBeVisible();
    await expect(configPage.rowByName('Osasco')).toBeVisible();

    const congDoc = await db.getDoc(db.collections.congregations, seed.ids.congregation);
    expect(congDoc?.['cities']).toEqual(['São Paulo', 'Osasco']);
  });

  test('UC-CFG-02 — Edits and saves congregation name immediately with empty/unchanged guard', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    const configPage = new CongregationPage(authenticatedPage);
    const toast = new ToastPage(authenticatedPage);
    await configPage.goto();

    await configPage.editNameButton.click();
    await expect(configPage.saveNameButton).toBeDisabled();

    await configPage.congregationNameInput.fill('   ');
    await expect(configPage.saveNameButton).toBeDisabled();

    await configPage.congregationNameInput.fill('Congregação Nova Primavera');
    await expect(configPage.saveNameButton).toBeEnabled();

    await configPage.saveNameButton.click();
    await toast.expectText('Nome da congregação atualizado com sucesso!');

    await expect(configPage.congregationName).toHaveText('Congregação Nova Primavera');
    await expect(configPage.editNameButton).toBeVisible();

    await expect
      .poll(async () => (await db.getDoc(db.collections.congregations, seed.ids.congregation))?.['name'])
      .toBe('Congregação Nova Primavera');
  });

  test('UC-CFG-03 — Adds a city immediately and rejects empty or duplicate names with pt-BR toasts', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    const configPage = new CongregationPage(authenticatedPage);
    const toast = new ToastPage(authenticatedPage);
    await configPage.goto();

    // Empty city rejected
    await configPage.addCity('   ');
    await toast.expectText('O nome da cidade não pode estar vazio.');

    // Duplicate city (case-insensitive) rejected
    await configPage.addCity('são paulo');
    await toast.expectText('O nome da cidade deve ser único.');

    // Valid new city persisted immediately
    await configPage.addCity('Guarulhos');
    await toast.expectText('Cidade adicionada com sucesso!');
    await expect(configPage.rowByName('Guarulhos')).toBeVisible();
    await expect(configPage.cityRows).toHaveCount(3);

    await expect
      .poll(async () => (await db.getDoc(db.collections.congregations, seed.ids.congregation))?.['cities'])
      .toEqual(['São Paulo', 'Osasco', 'Guarulhos']);
  });

  test('UC-CFG-04 — Inline city rename allows one row at a time, supports cancel, and cascades rename on save', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    const configPage = new CongregationPage(authenticatedPage);
    const toast = new ToastPage(authenticatedPage);
    await configPage.goto();

    await configPage.editCity('São Paulo');
    const input = configPage.cityInput();
    await expect(input).toHaveValue('São Paulo');

    // Only one row in edit mode at a time
    await expect(configPage.editButton(configPage.rowByName('Osasco'))).toBeDisabled();
    await expect(configPage.deleteButton(configPage.rowByName('Osasco'))).toBeDisabled();

    // Cancel restores original name
    await input.fill('Nome Descartado');
    await configPage.cancelCityButton().click();
    await expect(configPage.rowByName('São Paulo')).toBeVisible();

    // Rename and save immediately
    await configPage.editCity('São Paulo');
    await configPage.cityInput().fill('Sampa');
    await configPage.saveCityButton().click();

    await toast.expectText('Cidade atualizada com sucesso!');
    await expect(configPage.rowByName('Sampa')).toBeVisible();

    await expect
      .poll(async () => (await db.getDoc(db.collections.congregations, seed.ids.congregation))?.['cities'])
      .toEqual(['Sampa', 'Osasco']);
    await expect
      .poll(async () => (await db.getDoc(db.collections.territories, seed.ids.territories[0]))?.['city'])
      .toBe('Sampa');
  });

  test('UC-CFG-05 — Drag-and-drop reorders cities and immediately persists new order and refreshes /territories', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    const configPage = new CongregationPage(authenticatedPage);
    await configPage.goto();

    await expect(configPage.cityRows.nth(0)).toContainText('São Paulo');
    await expect(configPage.cityRows.nth(1)).toContainText('Osasco');

    const sourceHandle = configPage.dragHandle('Osasco');
    const targetRow = configPage.rowByName('São Paulo');
    await dragRowByMouse(authenticatedPage, sourceHandle, targetRow);

    await expect(configPage.cityRows.nth(0)).toContainText('Osasco');
    await expect(configPage.cityRows.nth(1)).toContainText('São Paulo');

    await expect
      .poll(async () => (await db.getDoc(db.collections.congregations, seed.ids.congregation))?.['cities'])
      .toEqual(['Osasco', 'São Paulo']);

    // SPA navigation to /territories reflects new city order immediately without reload
    await authenticatedPage.evaluate(() => {
      window.history.pushState({}, '', '/territories');
      window.dispatchEvent(new Event('popstate'));
    });
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await expect(territoriesPage.list).toBeVisible();
    expect(await territoriesPage.cityOptions()).toEqual(['Osasco', 'São Paulo', 'Todas']);
  });

  test('UC-CFG-06 — Remove city with Transfer moves territories with sequential positionIndex values', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    const configPage = new CongregationPage(authenticatedPage);
    const toast = new ToastPage(authenticatedPage);
    await configPage.goto();

    // São Paulo has seed-territory-1 (positionIndex 0) and seed-territory-3 (positionIndex 2).
    // Osasco has seed-territory-2 (positionIndex 1), so next positionIndex in Osasco is 2.
    await configPage.openRemoveCityDialog('São Paulo');
    await expect(configPage.removeCityDialog).toBeVisible();
    await expect(configPage.removeCityTargetSelect).toHaveValue('Osasco');
    await expect(configPage.summary).toContainText('2 territórios');

    await configPage.removeCityConfirmButton.click();
    await toast.expectText('Cidade removida com sucesso!');
    await expect(configPage.rowByName('São Paulo')).toHaveCount(0);

    await expect
      .poll(async () => (await db.getDoc(db.collections.congregations, seed.ids.congregation))?.['cities'])
      .toEqual(['Osasco']);

    await expect(async () => {
      const t1 = await db.getDoc(db.collections.territories, seed.ids.territories[0]);
      const t2 = await db.getDoc(db.collections.territories, seed.ids.territories[1]);
      const t3 = await db.getDoc(db.collections.territories, seed.ids.territories[2]);

      expect(t1?.['city']).toBe('Osasco');
      expect(t3?.['city']).toBe('Osasco');
      expect(t2?.['positionIndex']).toBe(1);
      expect(t1?.['positionIndex']).toBe(2);
      expect(t3?.['positionIndex']).toBe(3);
    }).toPass();
  });

  test('UC-CFG-07 — Remove city with Delete removes territories and their history subcollections, and disables transfer when only 1 city remains', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    const configPage = new CongregationPage(authenticatedPage);
    const toast = new ToastPage(authenticatedPage);
    await configPage.goto();

    await configPage.openRemoveCityDialog('São Paulo');
    await expect(configPage.removeCityDialog).toBeVisible();
    await expect(configPage.summary).toContainText('2 territórios');

    await configPage.removeCityDeleteOption.click();
    await expect(configPage.summary).toContainText('serão excluídos permanentemente');
    await configPage.removeCityConfirmButton.click();
    await toast.expectText('Cidade removida com sucesso!');

    await expect(async () => {
      expect(await db.getDoc(db.collections.territories, seed.ids.territories[0])).toBeUndefined();
      expect(await db.getDoc(db.collections.territories, seed.ids.territories[2])).toBeUndefined();
      expect(
        await db.getSubcollectionDocs(db.collections.territories, seed.ids.territories[0], db.historySubcollection),
      ).toHaveLength(0);
      expect(
        await db.getSubcollectionDocs(db.collections.territories, seed.ids.territories[2], db.historySubcollection),
      ).toHaveLength(0);
      expect(await db.getDoc(db.collections.territories, seed.ids.territories[1])).toBeDefined();
    }).toPass();

    // Now only Osasco remains — opening remove dialog disables the transfer option
    await configPage.openRemoveCityDialog('Osasco');
    await expect(configPage.removeCityDialog).toBeVisible();
    await expect(configPage.removeCityTransferOption).toBeDisabled();
    await configPage.removeCityConfirmButton.click();

    await expect(configPage.cityRows).toHaveCount(0);
    await expect(configPage.emptyCitiesState).toBeVisible();
  });

  test('UC-CFG-08 — APP_ADMIN can create a new Congregation via Add Congregation dialog and switch active congregation', async ({
    page,
    signInAs,
    seed,
    db,
  }) => {
    await signInAs('app_admin');
    const configPage = new CongregationPage(page);
    const toast = new ToastPage(page);
    await configPage.goto();

    await expect(configPage.addCongregationButton).toBeVisible();
    await configPage.addCongregationButton.click();

    await expect(configPage.addCongregationDialog).toBeVisible();
    await expect(configPage.addCongregationSubmitButton).toBeDisabled();

    await configPage.addCongregationNameInput.fill('Congregação Vale Verde');
    await configPage.addCongregationLocationInput.fill('Campinas, SP');

    // Add cities via Enter and button, and remove a mistake chip
    await configPage.addCongregationCityInput.fill('Campinas');
    await configPage.addCongregationCityInput.press('Enter');
    await expect(configPage.addCongregationDialog).toBeVisible();

    await configPage.addCongregationCityInput.fill('Cidade Errada');
    await configPage.addCongregationAddCityButton.click();

    await configPage.addCongregationCityInput.fill('Valinhos');
    await configPage.addCongregationAddCityButton.click();

    await expect(configPage.addCongregationChipsList.getByTestId('chip')).toHaveCount(3);
    await configPage.addCongregationDialog.getByRole('button', { name: 'Remover Cidade Errada' }).click();
    await expect(configPage.addCongregationChipsList.getByTestId('chip')).toHaveCount(2);

    // Update settings
    await configPage.addCongregationExpiryDaysInput.fill('30');
    await configPage.addCongregationBlockExpiredCheckbox.check();

    await expect(configPage.addCongregationSubmitButton).toBeEnabled();
    await configPage.addCongregationSubmitButton.click();

    await toast.expectText('Congregação criada com sucesso!');
    await expect(configPage.addCongregationDialog).toHaveCount(0);

    // Active congregation on /congregation immediately reflects the newly created congregation
    await expect(configPage.congregationName).toHaveText('Congregação Vale Verde');
    await expect(configPage.rowByName('Campinas')).toBeVisible();
    await expect(configPage.rowByName('Valinhos')).toBeVisible();

    await expect(async () => {
      const congregations = await db.getCollectionDocs(db.collections.congregations);
      const created = congregations.find((c) => c['name'] === 'Congregação Vale Verde');
      expect(created).toBeDefined();
      expect(created?.['locatedOn']).toBe('Campinas, SP');
      expect(created?.['cities']).toEqual(['Campinas', 'Valinhos']);
      expect(created?.['settings']).toEqual({
        designationAccessExpiryDays: 30,
        shouldDesignationBlockAfterExpired: true,
      });

      const appAdminSnap = await db.getDocSnapshot(db.collections.users, seed.ids.appAdminUser);
      expect(appAdminSnap.data()?.['congregation'].path).toBe(`${db.collections.congregations}/${created?.['id']}`);
    }).toPass();
  });

  test('UC-CFG-11 — User without a congregation sees pt-BR error banner', async ({ page, seed, signInAsUser }) => {
    const userNoCong = seed.factories.buildUser({
      role: RoleEnum.ADMIN,
      congregationId: 'non-existent-congregation',
    });
    await seed.write({ users: [userNoCong] });

    await signInAsUser(userNoCong.id);

    const configPage = new CongregationPage(page);
    await configPage.goto();

    await expect(configPage.noCongregationBanner).toBeVisible();
    await expect(configPage.noCongregationBanner).toContainText(
      'Nenhuma congregação encontrada. Verifique se você está autenticado.',
    );
  });

  test('UC-CFG-12 — Unauthenticated access redirects to /login', async ({ page }) => {
    await page.goto('/congregation');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('UC-CFG-13 — Non-admin access is blocked (PUBLISHER redirects to /welcome; ORGANIZER/ELDER/SUPERINTENDENT denied)', async ({
    signInAs,
    page,
  }) => {
    await signInAs('publisher');
    await page.goto('/congregation');
    await expect(page).toHaveURL(/\/welcome$/);

    for (const role of ['organizer', 'elder', 'superintendent'] as const) {
      await signInAs(role);
      await page.goto('/congregation');
      await expect(page.getByTestId('config-heading')).toHaveCount(0);
    }
  });
});
