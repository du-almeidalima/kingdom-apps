import { expect, test } from '../fixtures';
import { WorkPage } from '../page-objects/work.page';
import { WorkItemCompleteDialogPage } from '../page-objects/work-item-complete-dialog.page';
import { ConfirmDialogPage } from '../page-objects/confirm-dialog.page';
import { HistoryDialogPage } from '../page-objects/history-dialog.page';
import { stubWindowOpen, getOpenedUrls } from '../utils/window-open-stub.util';
import { DesignationStatusEnum } from '../../src/models/enums/designation-status';
import { VisitOutcomeEnum } from '../../src/models/enums/visit-outcome';
import { SeedApi } from '../fixtures/database.fixture';

/**
 * Helper: seeds one territory + one designation embedding that territory
 * with `history: []` and a future expiry. Returns all ids and seed objects.
 */
function seedActiveDesignation(
  seed: SeedApi,
  overrides?: {
    territory?: Record<string, unknown>;
    designation?: Record<string, unknown>;
    designationTerritory?: Record<string, unknown>;
  },
) {
  const territoryId = (overrides?.territory?.['id'] as string) ?? `t-${Math.random().toString(36).slice(2, 10)}`;
  const designationId = (overrides?.designation?.['id'] as string) ?? `d-${Math.random().toString(36).slice(2, 10)}`;

  const territory = seed.factories.buildTerritory({
    id: territoryId,
    congregationId: seed.ids.congregation,
    address: 'Rua das Flores, 123',
    city: 'São Paulo',
    history: [],
    ...overrides?.territory,
  });

  const designationTerritory = seed.factories.buildDesignationTerritory({
    id: territoryId,
    congregationId: seed.ids.congregation,
    address: territory.address,
    city: territory.city,
    icon: territory.icon,
    history: [],
    ...overrides?.designationTerritory,
  });

  const designation = seed.factories.buildDesignation({
    id: designationId,
    congregationId: seed.ids.congregation,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    territories: [designationTerritory],
    ...overrides?.designation,
  });

  return { territory, designation, designationTerritory, territoryId, designationId };
}

// ─── WP-10: Opening & Completing ─────────────────────────────────────────────

test.describe('Work designation — opening', () => {
  test('UC-WORK-01 — Anonymous open of active designation renders territories', async ({ page, seed, db }) => {
    const { territory, designation, designationId } = seedActiveDesignation(seed);
    await seed.write({ territories: [territory], designations: [designation] });

    const workPage = new WorkPage(page);
    await workPage.goto(designationId);

    await expect(workPage.loading).toBeHidden();
    await expect(workPage.territoriesHeading).toBeVisible();
    await expect(workPage.itemByAddress('Rua das Flores, 123')).toBeVisible();
    expect(page.url()).toContain(`/work/${designationId}`);

    const doc = await db.getDoc(db.collections.designations, designationId);
    expect(doc?.['territories'][0].status).toBe(DesignationStatusEnum.PENDING);
  });

  test('UC-WORK-02 — Non-existent id → blank page', async ({ page, db }) => {
    const workPage = new WorkPage(page);
    await workPage.goto('does-not-exist');

    await expect(workPage.territoriesHeading).toBeHidden();

    const doc = await db.getDoc(db.collections.designations, 'does-not-exist');
    expect(doc).toBeUndefined();
  });

  test('UC-WORK-03 — Encoded slash throws (⚠ defect)', async ({ page, db }) => {
    let capturedError = false;
    page.on('pageerror', () => {
      capturedError = true;
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        capturedError = true;
      }
    });

    const workPage = new WorkPage(page);
    await workPage.goto('abc%2Fdef');

    await expect(workPage.territoriesHeading).toBeHidden();
    await expect(workPage.completedHeading).toBeHidden();

    expect(capturedError).toBe(true);
    expect(await db.getCollectionDocs(db.collections.designations)).toHaveLength(1);
  });

  test('UC-WORK-05 — Frozen snapshot vs live territory', async ({ page, seed, db }) => {
    const { territory, designation, designationId, territoryId } = seedActiveDesignation(seed);
    await seed.write({ territories: [territory], designations: [designation] });

    // Mutate the live territory AFTER seeding
    await db.firestore.collection(db.collections.territories).doc(territoryId).update({ address: 'Rua Editada, 2' });

    const workPage = new WorkPage(page);
    await workPage.goto(designationId);

    // Page shows the designation snapshot, not the live territory
    await expect(workPage.itemByAddress('Rua das Flores, 123')).toBeVisible();
    await expect(workPage.itemByAddress('Rua Editada, 2')).toBeHidden();

    // Persistence: live territory has the edited address, designation still has the original
    const storedTerritory = await db.getDoc(db.collections.territories, territoryId);
    expect(storedTerritory?.['address']).toBe('Rua Editada, 2');

    const storedDesignation = await db.getDoc(db.collections.designations, designationId);
    expect(storedDesignation?.['territories'][0].address).toBe('Rua das Flores, 123');
  });

  test('UC-WORK-06 — Signed-in admin sees identical page', async ({ page, seed, signInAs, db }) => {
    const { territory, designation, designationId } = seedActiveDesignation(seed);
    await seed.write({ territories: [territory], designations: [designation] });

    await signInAs('admin');
    const workPage = new WorkPage(page);
    await workPage.goto(designationId);

    await expect(workPage.loading).toBeHidden();
    await expect(workPage.territoriesHeading).toBeVisible();
    await expect(workPage.itemByAddress('Rua das Flores, 123')).toBeVisible();
    expect((await db.getDoc(db.collections.users, seed.ids.adminUser))?.['role']).toBe('ADMIN');
  });
});

test.describe('Work designation — completing visits', () => {
  test('UC-WORK-07 — Complete visit SPOKE (visitOutcome: 0)', async ({ page, seed, db }) => {
    const { territory, designation, designationId, territoryId } = seedActiveDesignation(seed);
    await seed.write({ territories: [territory], designations: [designation] });

    const workPage = new WorkPage(page);
    const dialog = new WorkItemCompleteDialogPage(page);
    await workPage.goto(designationId);

    // Click checkbox to open dialog
    const row = workPage.itemByAddress('Rua das Flores, 123');
    await row.getByTestId('work-item-checkbox').click();

    // Dialog opens, 'Morador contatado' is pre-selected (SPOKE is default)
    await expect(dialog.dialog).toBeVisible();
    await expect(dialog.dialog.getByText('Concluir Visita')).toBeVisible();

    // Submit with default SPOKE
    await dialog.submit();

    // Row moves to Concluídos section
    await expect(workPage.completedHeading).toBeVisible();
    await expect(workPage.completedList.filter({ hasText: 'Rua das Flores, 123' })).toBeVisible();
    // Eraser (undo) button appears on done rows
    await expect(workPage.completedList.getByTestId('work-item-undo')).toBeVisible();

    // Persistence: subcollection gains 1 doc
    await expect(async () => {
      const historyDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territoryId,
        db.historySubcollection,
      );
      expect(historyDocs.length).toBe(1);
      expect(historyDocs[0]['visitOutcome']).toBe(VisitOutcomeEnum.SPOKE);
      expect(historyDocs[0]['isRevisit']).toBe(false);
      expect((await db.getDoc(db.collections.territories, territoryId))?.['lastVisit']).toBeTruthy();
    }).toPass();

    // Designation territory status: DONE
    await expect(async () => {
      const des = await db.getDoc(db.collections.designations, designationId);
      expect(des?.['territories'][0].status).toBe(DesignationStatusEnum.DONE);
    }).toPass();
  });

  test('UC-WORK-08 — Complete NOT_ANSWERED (visitOutcome: 1)', async ({ page, seed, db }) => {
    const { territory, designation, designationId, territoryId } = seedActiveDesignation(seed);
    await seed.write({ territories: [territory], designations: [designation] });

    const workPage = new WorkPage(page);
    const dialog = new WorkItemCompleteDialogPage(page);
    await workPage.goto(designationId);

    await workPage.itemByAddress('Rua das Flores, 123').getByTestId('work-item-checkbox').click();
    await dialog.selectOutcome('Ninguém atendeu');
    await dialog.submit();

    await expect(async () => {
      const historyDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territoryId,
        db.historySubcollection,
      );
      expect(historyDocs.length).toBe(1);
      expect(historyDocs[0]['visitOutcome']).toBe(VisitOutcomeEnum.NOT_ANSWERED);
      const designationDoc = await db.getDoc(db.collections.designations, designationId);
      expect(designationDoc?.['territories'][0].status).toBe(DesignationStatusEnum.DONE);
    }).toPass();
  });

  test('UC-WORK-09 — Complete MOVED (visitOutcome: 2)', async ({ page, seed, db }) => {
    const { territory, designation, designationId, territoryId } = seedActiveDesignation(seed);
    await seed.write({ territories: [territory], designations: [designation] });

    const workPage = new WorkPage(page);
    const dialog = new WorkItemCompleteDialogPage(page);
    await workPage.goto(designationId);

    await workPage.itemByAddress('Rua das Flores, 123').getByTestId('work-item-checkbox').click();
    await dialog.selectOutcome('Morador mudou de endereço');
    await dialog.submit();

    await expect(async () => {
      const historyDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territoryId,
        db.historySubcollection,
      );
      expect(historyDocs.length).toBe(1);
      expect(historyDocs[0]['visitOutcome']).toBe(VisitOutcomeEnum.MOVED);
      const designationDoc = await db.getDoc(db.collections.designations, designationId);
      expect(designationDoc?.['territories'][0].status).toBe(DesignationStatusEnum.DONE);
    }).toPass();
  });

  test('UC-WORK-10 — Complete ASKED_TO_NOT_VISIT_AGAIN (visitOutcome: 3)', async ({ page, seed, db }) => {
    const { territory, designation, designationId, territoryId } = seedActiveDesignation(seed);
    await seed.write({ territories: [territory], designations: [designation] });

    const workPage = new WorkPage(page);
    const dialog = new WorkItemCompleteDialogPage(page);
    await workPage.goto(designationId);

    await workPage.itemByAddress('Rua das Flores, 123').getByTestId('work-item-checkbox').click();
    await dialog.selectOutcome('Morador pediu para não ser visitado');
    await dialog.submit();

    await expect(async () => {
      const historyDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territoryId,
        db.historySubcollection,
      );
      expect(historyDocs.length).toBe(1);
      expect(historyDocs[0]['visitOutcome']).toBe(VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN);
      const designationDoc = await db.getDoc(db.collections.designations, designationId);
      expect(designationDoc?.['territories'][0].status).toBe(DesignationStatusEnum.DONE);
    }).toPass();
  });

  test('UC-WORK-11 — Revisit makes name required', async ({ page, seed, db }) => {
    const { territory, designation, designationId, territoryId } = seedActiveDesignation(seed);
    await seed.write({ territories: [territory], designations: [designation] });

    const workPage = new WorkPage(page);
    const dialog = new WorkItemCompleteDialogPage(page);
    await workPage.goto(designationId);

    await workPage.itemByAddress('Rua das Flores, 123').getByTestId('work-item-checkbox').click();
    await expect(dialog.dialog).toBeVisible();

    // Tick revisit checkbox
    await dialog.revisitCheckbox.check();

    // Name empty → submit disabled, error visible
    await expect(dialog.submitButton).toBeDisabled();
    await expect(dialog.nameError).toBeVisible();
    await expect(dialog.nameError).toHaveText('Por favor, coloque o seu nome');

    // Type name → error disappears, submit enabled
    await dialog.nameInput.fill('Roberto');
    await expect(dialog.nameError).toBeHidden();
    await expect(dialog.submitButton).toBeEnabled();

    await dialog.submit();

    await expect(async () => {
      const historyDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territoryId,
        db.historySubcollection,
      );
      expect(historyDocs.length).toBe(1);
      expect(historyDocs[0]['isRevisit']).toBe(true);
      expect(historyDocs[0]['name']).toBe('Roberto');
    }).toPass();
  });

  test('UC-WORK-12 — Name optional without revisit', async ({ page, seed, db }) => {
    const { territory, designation, designationId, territoryId } = seedActiveDesignation(seed);
    await seed.write({ territories: [territory], designations: [designation] });

    const workPage = new WorkPage(page);
    const dialog = new WorkItemCompleteDialogPage(page);
    await workPage.goto(designationId);

    await workPage.itemByAddress('Rua das Flores, 123').getByTestId('work-item-checkbox').click();
    await expect(dialog.dialog).toBeVisible();

    // Revisit unticked (default), name empty
    await expect(dialog.submitButton).toBeEnabled();
    await expect(dialog.nameError).toBeHidden();

    await dialog.submit();

    await expect(async () => {
      const historyDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territoryId,
        db.historySubcollection,
      );
      expect(historyDocs.length).toBe(1);
      expect(historyDocs[0]['isRevisit']).toBe(false);
      expect(historyDocs[0]['name']).toBe('');
    }).toPass();
  });

  test('UC-WORK-13 — Notes persisted verbatim', async ({ page, seed, db }) => {
    const { territory, designation, designationId, territoryId } = seedActiveDesignation(seed);
    await seed.write({ territories: [territory], designations: [designation] });

    const workPage = new WorkPage(page);
    const dialog = new WorkItemCompleteDialogPage(page);
    await workPage.goto(designationId);

    await workPage.itemByAddress('Rua das Flores, 123').getByTestId('work-item-checkbox').click();
    await dialog.notesTextarea.fill('Conversamos sobre a Bíblia, ficou interessado.');
    await dialog.submit();

    await expect(async () => {
      const historyDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territoryId,
        db.historySubcollection,
      );
      expect(historyDocs.length).toBe(1);
      expect(historyDocs[0]['notes']).toBe('Conversamos sobre a Bíblia, ficou interessado.');
    }).toPass();
  });

  test('UC-WORK-14 — Empty notes persists empty string', async ({ page, seed, db }) => {
    const { territory, designation, designationId, territoryId } = seedActiveDesignation(seed);
    await seed.write({ territories: [territory], designations: [designation] });

    const workPage = new WorkPage(page);
    const dialog = new WorkItemCompleteDialogPage(page);
    await workPage.goto(designationId);

    await workPage.itemByAddress('Rua das Flores, 123').getByTestId('work-item-checkbox').click();
    // Leave notes empty
    await dialog.submit();

    await expect(async () => {
      const historyDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territoryId,
        db.historySubcollection,
      );
      expect(historyDocs.length).toBe(1);
      expect(historyDocs[0]['notes']).toBe('');
    }).toPass();

    // Check history dialog on completed row shows 'Sem observações'
    const historyDialogPage = new HistoryDialogPage(page);
    const doneRow = workPage.completedList.filter({ hasText: 'Rua das Flores, 123' });
    await doneRow.getByTestId('work-item-history').click();
    await expect(historyDialogPage.dialog).toBeVisible();
    await expect(historyDialogPage.dialog.getByText('Sem observações')).toBeVisible();
    await historyDialogPage.close();
  });
});

// ─── WP-11: Cancel, Edit, Undo ───────────────────────────────────────────────

test.describe('Work designation — cancel, edit, undo', () => {
  test('UC-WORK-15 — Cancel keeps PENDING', async ({ page, seed, db }) => {
    const { territory, designation, designationId, territoryId } = seedActiveDesignation(seed);
    await seed.write({ territories: [territory], designations: [designation] });

    const workPage = new WorkPage(page);
    const dialog = new WorkItemCompleteDialogPage(page);
    await workPage.goto(designationId);

    const row = workPage.itemByAddress('Rua das Flores, 123');
    await row.getByTestId('work-item-checkbox').click();
    await expect(dialog.dialog).toBeVisible();

    // Make some changes in the dialog
    await dialog.selectOutcome('Ninguém atendeu');
    await dialog.notesTextarea.fill('Some notes');

    // Cancel
    await dialog.cancel();

    // Row stays in Territórios section, checkbox unchecked
    await expect(workPage.itemByAddress('Rua das Flores, 123')).toBeVisible();
    await expect(workPage.completedHeading).toBeHidden();

    // Persistence: subcollection empty, status PENDING
    const historyDocs = await db.getSubcollectionDocs(db.collections.territories, territoryId, db.historySubcollection);
    expect(historyDocs.length).toBe(0);

    const des = await db.getDoc(db.collections.designations, designationId);
    expect(des?.['territories'][0].status).toBe(DesignationStatusEnum.PENDING);
    expect((await db.getDoc(db.collections.territories, territoryId))?.['lastVisit']).toBeNull();
  });

  test('UC-WORK-16 — Edit preserves id/date, changes notes', async ({ page, seed, db }) => {
    const knownHistoryId = 'history-edit-test';
    const knownDate = new Date('2024-06-15T10:00:00.000Z');

    const historyEntry = seed.factories.buildVisitHistory({
      id: knownHistoryId,
      date: knownDate,
      notes: 'Original notes',
      visitOutcome: VisitOutcomeEnum.SPOKE,
    });

    const territoryId = `t-edit-${Math.random().toString(36).slice(2, 8)}`;
    const designationId = `d-edit-${Math.random().toString(36).slice(2, 8)}`;

    const territory = seed.factories.buildTerritory({
      id: territoryId,
      congregationId: seed.ids.congregation,
      address: 'Rua Editável, 42',
      history: [historyEntry],
    });

    const designation = seed.factories.buildDesignation({
      id: designationId,
      congregationId: seed.ids.congregation,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      territories: [
        seed.factories.buildDesignationTerritory({
          id: territoryId,
          congregationId: seed.ids.congregation,
          address: 'Rua Editável, 42',
          icon: territory.icon,
          status: DesignationStatusEnum.DONE,
          history: [historyEntry],
          lastVisit: knownDate,
        }),
      ],
    });

    await seed.write({ territories: [territory], designations: [designation] });

    const workPage = new WorkPage(page);
    const dialog = new WorkItemCompleteDialogPage(page);
    await workPage.goto(designationId);

    // Click edit (pencil) on the done row
    const doneRow = workPage.completedList.filter({ hasText: 'Rua Editável, 42' });
    await doneRow.getByTestId('work-item-edit').click();

    // Dialog title should be 'Editar Visita', submit label 'Atualizar'
    await expect(dialog.dialog.getByText('Editar Visita')).toBeVisible();
    await expect(dialog.submitButton).toHaveText('Atualizar');

    // Change notes
    await dialog.notesTextarea.clear();
    await dialog.notesTextarea.fill('Updated notes');
    await dialog.submit();

    // Persistence: same id and date, notes changed
    await expect(async () => {
      const historyDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territoryId,
        db.historySubcollection,
      );
      expect(historyDocs.length).toBe(1);
      expect(historyDocs[0]['id']).toBe(knownHistoryId);
      expect(historyDocs[0]['notes']).toBe('Updated notes');
      const storedDate = historyDocs[0]['date'] as { toDate: () => Date };
      expect(storedDate.toDate().toISOString()).toBe(knownDate.toISOString());
    }).toPass();
  });

  test('UC-WORK-17 — Undo via Apagar Visita', async ({ page, seed, db }) => {
    const historyEntry = seed.factories.buildVisitHistory({
      notes: 'Visita concluída',
      visitOutcome: VisitOutcomeEnum.SPOKE,
    });

    const territoryId = `t-undo-${Math.random().toString(36).slice(2, 8)}`;
    const designationId = `d-undo-${Math.random().toString(36).slice(2, 8)}`;

    const territory = seed.factories.buildTerritory({
      id: territoryId,
      congregationId: seed.ids.congregation,
      address: 'Rua Reversível, 99',
      history: [historyEntry],
    });

    const designation = seed.factories.buildDesignation({
      id: designationId,
      congregationId: seed.ids.congregation,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      territories: [
        seed.factories.buildDesignationTerritory({
          id: territoryId,
          congregationId: seed.ids.congregation,
          address: 'Rua Reversível, 99',
          icon: territory.icon,
          status: DesignationStatusEnum.DONE,
          history: [historyEntry],
          lastVisit: historyEntry.date,
        }),
      ],
    });

    await seed.write({ territories: [territory], designations: [designation] });

    const workPage = new WorkPage(page);
    const confirmDialog = new ConfirmDialogPage(page);
    await workPage.goto(designationId);

    // Click eraser (undo) on the done row
    const doneRow = workPage.completedList.filter({ hasText: 'Rua Reversível, 99' });
    await doneRow.getByTestId('work-item-undo').click();

    // Confirm dialog with 'Apagar Visita' title
    await expect(confirmDialog.dialog).toBeVisible();
    await expect(confirmDialog.title).toContainText('Apagar Visita');
    await confirmDialog.confirm();

    // Row moves back to Territórios
    await expect(workPage.itemByAddress('Rua Reversível, 99').getByTestId('work-item-checkbox')).toBeVisible();

    // Persistence: subcollection empty, designation status PENDING, lastVisit null
    await expect(async () => {
      const historyDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territoryId,
        db.historySubcollection,
      );
      expect(historyDocs.length).toBe(0);
      expect((await db.getDoc(db.collections.territories, territoryId))?.['lastVisit']).toBeNull();
    }).toPass();

    await expect(async () => {
      const des = await db.getDoc(db.collections.designations, designationId);
      expect(des?.['territories'][0].status).toBe(DesignationStatusEnum.PENDING);
    }).toPass();
  });
});

// ─── Conditional affordances ─────────────────────────────────────────────────

test.describe('Work designation — conditional affordances', () => {
  test('UC-WORK-18 — History button present only with embedded history', async ({ page, seed, db }) => {
    const historyEntry = seed.factories.buildVisitHistory({
      notes: 'Primeiro contato',
      visitOutcome: VisitOutcomeEnum.SPOKE,
    });

    const t1Id = `t-nohist-${Math.random().toString(36).slice(2, 8)}`;
    const t2Id = `t-hist-${Math.random().toString(36).slice(2, 8)}`;
    const designationId = `d-hist-${Math.random().toString(36).slice(2, 8)}`;

    const t1 = seed.factories.buildTerritory({
      id: t1Id,
      congregationId: seed.ids.congregation,
      address: 'Rua Sem Histórico, 1',
      history: [],
    });
    const t2 = seed.factories.buildTerritory({
      id: t2Id,
      congregationId: seed.ids.congregation,
      address: 'Rua Com Histórico, 2',
      history: [historyEntry],
    });

    const designation = seed.factories.buildDesignation({
      id: designationId,
      congregationId: seed.ids.congregation,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      territories: [
        seed.factories.buildDesignationTerritory({
          id: t1Id,
          congregationId: seed.ids.congregation,
          address: 'Rua Sem Histórico, 1',
          history: [],
        }),
        seed.factories.buildDesignationTerritory({
          id: t2Id,
          congregationId: seed.ids.congregation,
          address: 'Rua Com Histórico, 2',
          history: [historyEntry],
        }),
      ],
    });

    await seed.write({ territories: [t1, t2], designations: [designation] });

    const workPage = new WorkPage(page);
    const historyDialog = new HistoryDialogPage(page);
    await workPage.goto(designationId);

    // Row without history has NO history button
    const row1 = workPage.itemByAddress('Rua Sem Histórico, 1');
    await expect(row1.getByTestId('work-item-history')).toHaveCount(0);

    // Row with history HAS history button
    const row2 = workPage.itemByAddress('Rua Com Histórico, 2');
    await expect(row2.getByTestId('work-item-history')).toBeVisible();

    // Click history, dialog opens
    await row2.getByTestId('work-item-history').click();
    await expect(historyDialog.dialog).toBeVisible();
    await expect(historyDialog.rows).toHaveCount(1);
    await historyDialog.close();

    const storedDesignation = await db.getDoc(db.collections.designations, designationId);
    expect(storedDesignation).toBeDefined();
    const storedTerritories = (storedDesignation as Record<string, unknown>)['territories'] as Array<
      Record<string, unknown>
    >;
    expect(storedTerritories.find((territory) => territory['id'] === t1Id)?.['history']).toEqual([]);
    expect((storedTerritories.find((territory) => territory['id'] === t2Id)?.['history'] as unknown[]).length).toBe(1);
  });

  test('UC-WORK-19 — Maps button gated by mapsLink (Chromium _self)', async ({ page, seed, db }) => {
    const t1Id = `t-nomaps-${Math.random().toString(36).slice(2, 8)}`;
    const t2Id = `t-maps-${Math.random().toString(36).slice(2, 8)}`;
    const designationId = `d-maps-${Math.random().toString(36).slice(2, 8)}`;
    const mapsUrl = 'https://maps.google.com/?q=-23.5,-46.6';

    const t1 = seed.factories.buildTerritory({
      id: t1Id,
      congregationId: seed.ids.congregation,
      address: 'Rua Sem Mapa, 10',
      mapsLink: '',
      history: [],
    });
    const t2 = seed.factories.buildTerritory({
      id: t2Id,
      congregationId: seed.ids.congregation,
      address: 'Rua Com Mapa, 20',
      mapsLink: mapsUrl,
      history: [],
    });

    const designation = seed.factories.buildDesignation({
      id: designationId,
      congregationId: seed.ids.congregation,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      territories: [
        seed.factories.buildDesignationTerritory({
          id: t1Id,
          congregationId: seed.ids.congregation,
          address: 'Rua Sem Mapa, 10',
          history: [],
        }),
        seed.factories.buildDesignationTerritory({
          id: t2Id,
          congregationId: seed.ids.congregation,
          address: 'Rua Com Mapa, 20',
          mapsLink: mapsUrl,
          history: [],
        }),
      ],
    });

    await seed.write({ territories: [t1, t2], designations: [designation] });

    // Stub window.open BEFORE navigating
    await stubWindowOpen(page);

    const workPage = new WorkPage(page);
    await workPage.goto(designationId);

    // Row without mapsLink has NO maps button
    const row1 = workPage.itemByAddress('Rua Sem Mapa, 10');
    await expect(row1.getByTestId('work-item-maps')).toHaveCount(0);

    // Row with mapsLink HAS maps button
    const row2 = workPage.itemByAddress('Rua Com Mapa, 20');
    await expect(row2.getByTestId('work-item-maps')).toBeVisible();

    // Click maps button, assert recorded URL
    await row2.getByTestId('work-item-maps').click();
    const openedUrls = await getOpenedUrls(page);
    expect(openedUrls.length).toBeGreaterThanOrEqual(1);
    expect(openedUrls.some((url) => url.includes('maps.google.com'))).toBe(true);

    const storedDesignation = await db.getDoc(db.collections.designations, designationId);
    expect(storedDesignation).toBeDefined();
    const storedTerritories = (storedDesignation as Record<string, unknown>)['territories'] as Array<
      Record<string, unknown>
    >;
    expect(storedTerritories.find((territory) => territory['id'] === t1Id)?.['mapsLink']).toBeUndefined();
    expect(storedTerritories.find((territory) => territory['id'] === t2Id)?.['mapsLink']).toBe(mapsUrl);
  });
});

// ─── Expiry ──────────────────────────────────────────────────────────────────

test.describe('Work designation — expiry', () => {
  test('UC-WORK-20 — Expired + blocking → all disabled', async ({ page, seed, db }) => {
    const { territory, designation, designationId } = seedActiveDesignation(seed, {
      designation: {
        expiresAt: new Date('2020-01-01'),
        settings: { shouldDesignationBlockAfterExpired: true },
      },
    });
    await seed.write({ territories: [territory], designations: [designation] });

    const workPage = new WorkPage(page);
    await workPage.goto(designationId);

    // Expired note visible
    await expect(workPage.expiredNote).toBeVisible();
    await expect(workPage.expiredNote).toContainText('Essa designação está desabilitada');

    // Checkbox disabled
    const checkbox = workPage.itemByAddress('Rua das Flores, 123').getByTestId('work-item-checkbox');
    await expect(checkbox).toBeDisabled();

    // Persistence: no writes happened — subcollection empty
    const historyDocs = await db.getSubcollectionDocs(
      db.collections.territories,
      designation.territories[0].id,
      db.historySubcollection,
    );
    expect(historyDocs.length).toBe(0);
  });

  test('UC-WORK-21 — Expired + non-blocking (⚠ defect)', async ({ page, seed, db }) => {
    const mapsUrl = 'https://maps.google.com/?q=-23.5,-46.6';

    const { territory, designation, designationId } = seedActiveDesignation(seed, {
      territory: { mapsLink: mapsUrl },
      designation: {
        expiresAt: new Date('2020-01-01'),
        settings: { shouldDesignationBlockAfterExpired: false },
      },
      designationTerritory: { mapsLink: mapsUrl },
    });
    await seed.write({ territories: [territory], designations: [designation] });

    const workPage = new WorkPage(page);
    await workPage.goto(designationId);

    // Expired note STILL visible (isDisabled check — expiresAt < now)
    await expect(workPage.expiredNote).toBeVisible();

    // Checkbox STILL disabled (defect: isDisabled is true regardless of blocking)
    const row = workPage.itemByAddress('Rua das Flores, 123');
    const checkbox = row.getByTestId('work-item-checkbox');
    await expect(checkbox).toBeDisabled();

    // BUT maps button NOT disabled (only maps responds to shouldDesignationBlockAfterExpired)
    const mapsButton = row.getByTestId('work-item-maps');
    await expect(mapsButton).toBeVisible();
    await expect(mapsButton).toBeEnabled();

    expect(
      await db.getSubcollectionDocs(db.collections.territories, designation.territories[0].id, db.historySubcollection),
    ).toHaveLength(0);
  });
});

// ─── Completion state ────────────────────────────────────────────────────────

test.describe('Work designation — completion state', () => {
  test('UC-WORK-22 — Parabéns! all-done', async ({ page, seed, db }) => {
    const { territory, designation, designationId } = seedActiveDesignation(seed);
    await seed.write({ territories: [territory], designations: [designation] });

    const workPage = new WorkPage(page);
    const dialog = new WorkItemCompleteDialogPage(page);
    await workPage.goto(designationId);

    // Complete the single territory
    await workPage.itemByAddress('Rua das Flores, 123').getByTestId('work-item-checkbox').click();
    await dialog.submit();

    // All-done message
    await expect(workPage.allDone).toBeVisible();
    await expect(workPage.allDone).toHaveText('Parabéns!');
    await expect(
      page.getByText('Todos os territórios foram concluidos, que Jeová abençoe seu trabalho!'),
    ).toBeVisible();

    // Persistence: all territories DONE
    await expect(async () => {
      const des = await db.getDoc(db.collections.designations, designationId);
      const allDone = des?.['territories'].every(
        (t: Record<string, unknown>) => t['status'] === DesignationStatusEnum.DONE,
      );
      expect(allDone).toBe(true);
    }).toPass();
  });

  test('UC-WORK-23 — recentHistory overwrite (⚠ defect)', async ({ page, seed, db }) => {
    const territoryId = `t-recent-${Math.random().toString(36).slice(2, 8)}`;
    const designationId = `d-recent-${Math.random().toString(36).slice(2, 8)}`;

    // Seed territory with 5 pre-existing visits
    const existingHistory = Array.from({ length: 5 }, (_, i) =>
      seed.factories.buildVisitHistory({
        notes: `Pre-existing visit ${i + 1}`,
        date: new Date(Date.UTC(2024, 0, 15 - i)),
      }),
    );

    const territory = seed.factories.buildTerritory({
      id: territoryId,
      congregationId: seed.ids.congregation,
      address: 'Rua Histórica, 500',
      history: existingHistory,
    });

    // Designation embeds with history: [] (designation-level only)
    const designation = seed.factories.buildDesignation({
      id: designationId,
      congregationId: seed.ids.congregation,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      territories: [
        seed.factories.buildDesignationTerritory({
          id: territoryId,
          congregationId: seed.ids.congregation,
          address: 'Rua Histórica, 500',
          icon: territory.icon,
          history: [],
        }),
      ],
    });

    await seed.write({ territories: [territory], designations: [designation] });

    const workPage = new WorkPage(page);
    const dialog = new WorkItemCompleteDialogPage(page);
    await workPage.goto(designationId);

    // Complete the visit (6th overall, 1st in designation)
    await workPage.itemByAddress('Rua Histórica, 500').getByTestId('work-item-checkbox').click();
    await dialog.submit();

    // Persistence: subcollection has 6 docs (5 pre-existing + 1 new)
    await expect(async () => {
      const historyDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territoryId,
        db.historySubcollection,
      );
      expect(historyDocs.length).toBe(6);
    }).toPass();

    // DEFECT: recentHistory is overwritten to length 1 (only the designation-level history)
    // because the app passes designation.history (which only has the 1 new entry) to territory.update,
    // which slices the last 5 from that array.
    await expect(async () => {
      const territoryDoc = await db.getDoc(db.collections.territories, territoryId);
      expect(territoryDoc?.['recentHistory']?.length).toBe(1);
    }).toPass();
  });
});

// ─── Defect: missing history crashes read ────────────────────────────────────
// UC-WORK-04 MUST be the LAST test — it leaves a broken observable.

test.describe('Work designation — missing history crash', () => {
  test('UC-WORK-04 — Missing history crashes read (⚠ defect)', async ({ page, seed, db }) => {
    const designationId = `d-crash-${Math.random().toString(36).slice(2, 8)}`;

    // Seed designation WITHOUT history override → buildDesignationTerritory defaults
    // don't include history key, triggering the crash
    const designation = seed.factories.buildDesignation({
      id: designationId,
      congregationId: seed.ids.congregation,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      territories: [
        seed.factories.buildDesignationTerritory({
          congregationId: seed.ids.congregation,
        }),
      ],
    });

    await seed.write({ designations: [designation] });

    const workPage = new WorkPage(page);
    await workPage.goto(designationId);

    // Loading stays visible — the observable errors out before isLoading can be set to false
    await expect(workPage.loading).toBeVisible({ timeout: 5000 });
    expect((await db.getDoc(db.collections.designations, designationId))?.['territories'][0].status).toBe(
      DesignationStatusEnum.PENDING,
    );
  });
});
