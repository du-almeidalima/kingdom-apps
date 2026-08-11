import { expect, test } from '../fixtures';
import { TerritoriesPage } from '../page-objects/territories.page';
import { TerritoryManageDialogPage } from '../page-objects/territory-manage-dialog.page';
import { SortFilterDialogPage } from '../page-objects/sort-filter-dialog.page';
import { dragRowByMouse } from '../utils/cdk-drag.util';

// ─── WP-15: create / edit / delete / reorder ──────────────────────────────────

test.describe('Territories page — CRUD and reorder (WP-15)', () => {
  test.use({ role: 'admin' });

  test('UC-TERR-14 — required-field validation blocks submit', async ({ authenticatedPage, db }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();

    await territoriesPage.addButton.click();
    const dialog = new TerritoryManageDialogPage(authenticatedPage);
    await expect(dialog.dialog).toBeVisible();
    await expect(dialog.title).toHaveText('Adicionar Território');
    await expect(dialog.submitButton).toHaveText('Adicionar');

    // Endereço empty → submit disabled.
    await expect(dialog.submitButton).toBeDisabled();

    // Typing any address enables it.
    await dialog.addressInput.fill('Rua Nova, 100');
    await expect(dialog.submitButton).toBeEnabled();

    // No document written while invalid.
    expect(await db.getCollectionDocs(db.collections.territories)).toHaveLength(3);
  });

  test('UC-TERR-15 — city prefills from the currently selected city filter', async ({ authenticatedPage, db }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    await territoriesPage.selectCity('Osasco');

    await territoriesPage.addButton.click();
    const dialog = new TerritoryManageDialogPage(authenticatedPage);
    await expect(dialog.dialog).toBeVisible();
    // Cidade pre-set to the page filter.
    await expect(dialog.citySelect).toHaveValue('Osasco');

    await dialog.addressInput.fill('Rua de Osasco, 200');
    await dialog.submit();

    // New doc carries the prefilled city.
    await expect(async () => {
      const osascoDocs = await db.queryWhere(db.collections.territories, 'city', '==', 'Osasco');
      expect(osascoDocs.some((t) => t['address'] === 'Rua de Osasco, 200')).toBe(true);
    }).toPass();
  });

  test('UC-TERR-16 — bible-student toggle reveals the instructor field; re-check clears it (⚠ defect)', async ({
    authenticatedPage,
    db,
  }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();

    await territoriesPage.addButton.click();
    const dialog = new TerritoryManageDialogPage(authenticatedPage);
    await expect(dialog.dialog).toBeVisible();

    // Instructor only renders while the checkbox is checked.
    await expect(dialog.instructorInput).toHaveCount(0);
    await dialog.bibleStudentCheckbox.check();
    await expect(dialog.instructorInput).toBeVisible();

    await dialog.instructorInput.fill('João');
    // Untick then re-tick → ⚠ the field is wiped (reset on the true transition).
    await dialog.bibleStudentCheckbox.uncheck();
    await dialog.bibleStudentCheckbox.check();
    await expect(dialog.instructorInput).toHaveValue('');

    await dialog.addressInput.fill('Rua Estudo, 16');
    await dialog.submit();
    await expect(async () => {
      const territories = await db.queryWhere(db.collections.territories, 'address', '==', 'Rua Estudo, 16');
      expect(territories).toHaveLength(1);
      expect(territories[0]['isBibleStudent']).toBe(true);
      expect(territories[0]['bibleInstructor']).toBeNull();
    }).toPass();
  });

  test('UC-TERR-17 — positionIndex is allocated as max+1 per city on create', async ({ authenticatedPage, db }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    // São Paulo baseline max positionIndex is 2.
    await territoriesPage.addButton.click();
    const dialog = new TerritoryManageDialogPage(authenticatedPage);
    await expect(dialog.dialog).toBeVisible();
    await dialog.addressInput.fill('Rua Index, 300');
    await dialog.submit();

    // Allocation query: max+1 → 3.
    await expect(async () => {
      const sp = await db.queryWhere(db.collections.territories, 'city', '==', 'São Paulo');
      const created = sp.find((t) => t['address'] === 'Rua Index, 300');
      expect(created?.['positionIndex']).toBe(3);
    }).toPass();
  });

  test('UC-TERR-18 — create vs edit dialog: title and submit label differ', async ({ authenticatedPage, db }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();

    // Create mode.
    await territoriesPage.addButton.click();
    const dialog = new TerritoryManageDialogPage(authenticatedPage);
    await expect(dialog.title).toHaveText('Adicionar Território');
    await expect(dialog.submitButton).toHaveText('Adicionar');
    await dialog.cancel();
    await expect(dialog.dialog).toHaveCount(0);

    // Edit mode.
    await territoriesPage.openItemMenu('Rua das Acácias, 45 - Pinheiros');
    await territoriesPage.menuItem('Editar').click();
    await expect(dialog.dialog).toBeVisible();
    await expect(dialog.title).toHaveText('Editar Território');
    await expect(dialog.submitButton).toHaveText('Salvar');

    // This label-only flow does not write anything.
    expect(await db.getCollectionDocs(db.collections.territories)).toHaveLength(3);
  });

  test('UC-TERR-19 — edit dialog pre-fills existing values and persists a merged diff', async ({
    authenticatedPage,
    db,
  }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    await territoriesPage.selectCity('Osasco');

    await territoriesPage.openItemMenu('Av. dos Autonomistas, 1200 - Centro');
    await territoriesPage.menuItem('Editar').click();
    const dialog = new TerritoryManageDialogPage(authenticatedPage);
    await expect(dialog.dialog).toBeVisible();
    // Pre-filled values.
    await expect(dialog.citySelect).toHaveValue('Osasco');
    await expect(dialog.addressInput).toHaveValue('Av. dos Autonomistas, 1200 - Centro');
    await expect(dialog.iconSelect).toHaveValue('w');

    // Change only the address.
    await dialog.addressInput.fill('Av. dos Autonomistas, 1200 - Centro (fundos)');
    await dialog.submit();

    // List re-renders (live listener) with the new address.
    await expect(territoriesPage.territoryByAddress('Av. dos Autonomistas, 1200 - Centro (fundos)')).toBeVisible();

    await expect(async () => {
      const stored = await db.getDoc(db.collections.territories, 'seed-territory-2');
      expect(stored?.['address']).toBe('Av. dos Autonomistas, 1200 - Centro (fundos)');
      // Unchanged fields retain their original values (merged diff).
      expect(stored?.['city']).toBe('Osasco');
      expect(stored?.['icon']).toBe('w');
      expect(stored?.['positionIndex']).toBe(1);
    }).toPass();
  });

  test('UC-TERR-20 — delete confirmation, doc removal, and orphaned history (⚠ defect)', async ({
    authenticatedPage,
    db,
  }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    // seed-territory-1 carries 2 history subcollection docs.
    await territoriesPage.openItemMenu('Rua das Acácias, 45 - Pinheiros');
    await territoriesPage.menuItem('Apagar').click();

    // Confirmation dialog (bespoke component, no testid — located by title/button id).
    await expect(authenticatedPage.getByRole('heading', { name: 'Excluir Território' })).toBeVisible();
    await expect(authenticatedPage.getByText('Você realmente deseja excluir este território?')).toBeVisible();
    await expect(authenticatedPage.getByText('Essa ação não poderá ser desfeita')).toBeVisible();
    await authenticatedPage.locator('#territory-delete-dialog-confirm-btn').click();

    // Item disappears from the list.
    await expect(territoriesPage.territoryByAddress('Rua das Acácias, 45 - Pinheiros')).toHaveCount(0);

    // Parent doc gone; ⚠ orphaned history subcollection survives (no cascade).
    await expect(async () => {
      expect(await db.getDoc(db.collections.territories, 'seed-territory-1')).toBeUndefined();
    }).toPass();
    const orphaned = await db.getSubcollectionDocs(
      db.collections.territories,
      'seed-territory-1',
      db.historySubcollection
    );
    expect(orphaned).toHaveLength(2);
  });

  test('UC-TERR-21 — reordering persists positionIndex via a batched transaction', async ({
    authenticatedPage,
    db,
  }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    // São Paulo, default sort SAVED_INDEX → drag enabled.
    await expect(territoriesPage.territoryItems).toHaveCount(2);
    // Before: Acácias (index 0) above Harmonia (index 2).
    await expect(territoriesPage.territoryItems.nth(0)).toContainText('Rua das Acácias, 45 - Pinheiros');

    const sourceHandle = territoriesPage.dragHandle('Rua das Acácias, 45 - Pinheiros');
    const targetRow = territoriesPage.territoryByAddress('Rua Harmonia, 300 - Vila Madalena');
    await dragRowByMouse(authenticatedPage, sourceHandle, targetRow);

    // List re-renders with the new order (Harmonia now first).
    await expect(territoriesPage.territoryItems.nth(0)).toContainText('Rua Harmonia, 300 - Vila Madalena');

    // moveItemInArray recomputes positionIndex by new array index → Harmonia=0, Acácias=1.
    await expect(async () => {
      expect((await db.getDoc(db.collections.territories, 'seed-territory-3'))?.['positionIndex']).toBe(0);
      expect((await db.getDoc(db.collections.territories, 'seed-territory-1'))?.['positionIndex']).toBe(1);
    }).toPass();
  });

  test('UC-TERR-22 — drag handle is gated by city scope and sort mode', async ({ authenticatedPage, db }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();

    // "Todas" → no drag handle renders at all.
    await territoriesPage.showAllCities();
    await expect(territoriesPage.dragHandle('Av. dos Autonomistas, 1200 - Centro')).toHaveCount(0);

    // Back to São Paulo, switch sort to "Última Visita" → handle disabled + verbatim typo title.
    await territoriesPage.selectCity('São Paulo');
    const sortFilter = new SortFilterDialogPage(authenticatedPage);
    await sortFilter.open();
    await sortFilter.selectSort('Última Visita');
    await sortFilter.apply();

    const handle = territoriesPage.dragHandle('Rua das Acácias, 45 - Pinheiros');
    await expect(handle).toBeVisible();
    // `cdkDragHandleDisabled` disables CDK dragging but does not add a native
    // `disabled` attribute to the button. The grey icon + title are the DOM
    // affordances exposed by this implementation.
    await expect(handle.locator('svg')).toHaveCSS('fill', 'rgb(141, 141, 141)');
    await expect(handle).toHaveAttribute('title', 'Para ordernar manualmente, use a ordenação Ordem de Cadastro');

    // Scope/sort gating is client-only and must not mutate territory records.
    expect((await db.getDoc(db.collections.territories, 'seed-territory-1'))?.['positionIndex']).toBe(0);
    expect((await db.getDoc(db.collections.territories, 'seed-territory-3'))?.['positionIndex']).toBe(2);
  });
});
