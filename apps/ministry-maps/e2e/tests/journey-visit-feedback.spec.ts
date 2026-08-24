import { expect, test } from '../fixtures';
import { WorkPage } from '../page-objects/work.page';
import { WorkItemCompleteDialogPage } from '../page-objects/work-item-complete-dialog.page';
import { TerritoriesPage } from '../page-objects/territories.page';
import { HistoryDialogPage } from '../page-objects/history-dialog.page';
import { StatisticsPage } from '../page-objects/statistics.page';
import { DesignationStatusEnum } from '../../src/models/enums/designation-status';
import { VisitOutcomeEnum } from '../../src/models/enums/visit-outcome';

/**
 * J-02 — Publisher completes a territory; an Elder verifies history, badge and statistics.
 *
 * Composes UC-WORK-01/07/11/13 + UC-TERR-26/28/29 + UC-STAT-01/02/04/10/11/12.
 * The feedback loop that justifies the whole write-back path: work done in the
 * field becomes visible to the congregation's leadership.
 *
 * Identities: anonymous (publisher holding the link) → ELDER. The harness now
 * supports `signInAs('elder')` (WP-01), so the real elder identity is used.
 *
 * Seed block is copied from `docs/journeys/j-02-visit-feedback-loop-to-elder.md`.
 */
test('J-02 — Visit feedback loop to elder: history, badge and statistics reconcile', async ({
  page,
  signInAs,
  seed,
  db,
}) => {
  // ── Seed: one territory + one active designation embedding it ──────────────
  const territory = seed.factories.buildTerritory({
    id: 'j02-territory',
    congregationId: seed.ids.congregation,
    city: 'São Paulo',
    address: 'Rua do Feedback, 77 - Bela Vista',
    note: 'Casa com portão azul.', // non-empty note REQUIRED — badges only render with a note (UC-TERR-27)
    history: [],
  });
  const designation = seed.factories.buildDesignation({
    id: 'j02-designation',
    congregationId: seed.ids.congregation,
    createdBy: seed.ids.adminUser,
    expiresAt: new Date(Date.now() + 7 * 86_400_000), // active
    territories: [
      seed.factories.buildDesignationTerritory({
        id: 'j02-territory',
        congregationId: seed.ids.congregation,
        city: 'São Paulo',
        address: 'Rua do Feedback, 77 - Bela Vista',
        note: 'Casa com portão azul.', // REQUIRED on the snapshot too — the work write-back
        // (work-page.component.ts L79) overwrites the territory doc with the
        // designation territory fields, so an empty snapshot note would clobber
        // the seeded note and hide the badge (UC-TERR-27).
        history: [], // REQUIRED (UC-WORK-04)
      }),
    ],
  });
  await seed.write({ territories: [territory], designations: [designation] });

  const workPage = new WorkPage(page);
  const dialog = new WorkItemCompleteDialogPage(page);

  // ── Leg 1 — Anonymous publisher completes the visit with a revisit ─────────
  // UC-WORK-01
  await workPage.goto('j02-designation');
  await expect(workPage.loading).toBeHidden();
  await expect(workPage.itemByAddress('Rua do Feedback, 77 - Bela Vista')).toBeVisible();

  // UC-WORK-07/11/13: checkbox → dialog → Morador contatado → revisit → name → notes.
  await workPage.itemByAddress('Rua do Feedback, 77 - Bela Vista').getByTestId('work-item-checkbox').click();
  await expect(dialog.dialog).toBeVisible();
  await dialog.revisitCheckbox.check();
  await dialog.nameInput.fill('Ana');
  await dialog.notesTextarea.fill('Voltarei na próxima semana.');
  await dialog.submit();

  // Row moves under Concluídos.
  await expect(workPage.completedList.filter({ hasText: 'Rua do Feedback, 77 - Bela Vista' })).toBeVisible();

  // ⟶ HAND-OFF (Firestore, fire-and-forget — wrap in expect.poll/toPass).
  await expect
    .poll(async () => {
      const docs = await db.getSubcollectionDocs(db.collections.territories, 'j02-territory', db.historySubcollection);
      return docs.length;
    })
    .toBe(1);
  const historyDocs = await db.getSubcollectionDocs(
    db.collections.territories,
    'j02-territory',
    db.historySubcollection,
  );
  expect(historyDocs[0]['visitOutcome']).toBe(VisitOutcomeEnum.SPOKE);
  expect(historyDocs[0]['isRevisit']).toBe(true);
  expect(historyDocs[0]['name']).toBe('Ana');
  expect(historyDocs[0]['notes']).toBe('Voltarei na próxima semana.');
  expect(historyDocs[0]['isResolved']).toBeUndefined(); // the work dialog never writes it
  // Territory parent updated.
  const tDoc = await db.getDoc(db.collections.territories, 'j02-territory');
  expect(tDoc?.['lastVisit']).toBeTruthy();
  expect((tDoc?.['recentHistory'] as Array<Record<string, unknown>>).length).toBe(1);
  // Designation snapshot flipped to DONE.
  await expect
    .poll(async () => (await db.getDoc(db.collections.designations, 'j02-designation'))?.['territories'][0]['status'])
    .toBe(DesignationStatusEnum.DONE);

  // ── Leg 2 — Elder verifies on `/territories` (UC-TERR-26/28/29) ────────────
  await signInAs('elder');
  const territoriesPage = new TerritoriesPage(page);
  await territoriesPage.goto();

  // UC-TERR-26: Revisita badge (note is non-empty → UC-TERR-27).
  const row = territoriesPage.territoryByAddress('Rua do Feedback, 77 - Bela Vista');
  const revisitBadge = row.getByTestId('territory-alert-badge').filter({ hasText: 'Revisita' });
  await expect(revisitBadge).toBeVisible();
  await expect(revisitBadge).toHaveAttribute('title', 'Essa pessoa foi marcada como revisita recentemente');

  // UC-TERR-28/29: open Histórico → dialog shows the visit.
  await territoriesPage.openItemMenu('Rua do Feedback, 77 - Bela Vista');
  await territoriesPage.menuItem('Histórico').click();

  const historyDialog = new HistoryDialogPage(page);
  await expect(historyDialog.dialog).toBeVisible();
  await expect(historyDialog.rows).toHaveCount(1);
  await expect(historyDialog.dialog.getByText('Voltarei na próxima semana.')).toBeVisible();
  await expect(historyDialog.dialog.getByText('Revisita')).toBeVisible();
  // Footer carries the publisher name (date format is locale-dependent; assert the name).
  await expect(historyDialog.dialog.getByText('Ana', { exact: true })).toBeVisible();
  await historyDialog.close();

  // ⟶ HAND-OFF (Firestore): the badge reads recentHistory, not the subcollection.
  const rhDoc = await db.getDoc(db.collections.territories, 'j02-territory');
  expect((rhDoc?.['recentHistory'] as Array<Record<string, unknown>>).some((h) => h['isRevisit'] === true)).toBe(true);

  // ── Leg 3 — Elder verifies on `/territories/statistics` (UC-STAT-*) ────────
  const statisticsPage = new StatisticsPage(page);
  await statisticsPage.goto();

  // UC-STAT-01 (default city = Todas): 3 baseline + j02 = 4.
  await expect(statisticsPage.tileTerritories).toContainText('Territórios: 4');
  await expect(statisticsPage.tileBibleStudies).toContainText('Estudos bíblicos: 1');
  await expect(statisticsPage.tileMoved).toContainText('Mudaram: 0');
  // UC-STAT-04/10/11 (default period Este Mês, visit today): SPOKE counts as a
  // visit, isRevisit counts as a revisita. Baseline 2024 visits contribute 0.
  await expect(statisticsPage.tileVisits).toContainText('Visitas: 1');
  await expect(statisticsPage.tileRevisits).toContainText('Revisitas: 1');

  // UC-STAT-02: city scoping — the visit belongs to a São Paulo territory.
  await statisticsPage.selectCity('Osasco');
  await expect(statisticsPage.tileVisits).toContainText('Visitas: 0');
  await expect(statisticsPage.tileRevisits).toContainText('Revisitas: 0');

  // ⟶ FINAL SWEEP (Firestore): the numbers reconcile 1:1 with the subcollection.
  const finalDocs = await db.getSubcollectionDocs(db.collections.territories, 'j02-territory', db.historySubcollection);
  expect(finalDocs).toHaveLength(1);
});
