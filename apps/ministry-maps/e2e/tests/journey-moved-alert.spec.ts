import { expect, test } from '../fixtures';
import { WorkPage } from '../page-objects/work.page';
import { WorkItemCompleteDialogPage } from '../page-objects/work-item-complete-dialog.page';
import { TerritoriesPage } from '../page-objects/territories.page';
import { StatisticsPage } from '../page-objects/statistics.page';
import { SortFilterDialogPage } from '../page-objects/sort-filter-dialog.page';
import { TerritoryAlertsPage } from '../page-objects/territory-alerts.page';
import { VisitOutcomeEnum } from '../../src/models/enums/visit-outcome';
import { DesignationStatusEnum } from '../../src/models/enums/designation-status';

/**
 * J-04 — Publisher reports "moved"; the alert appears on `/territories`; leadership resolves it.
 *
 * Composes UC-WORK-09/23 + UC-TERR-10/24/27/30 + UC-STAT-03 + UC-AUTH-22.
 *
 * Identities: anonymous (publisher) → ADMIN. The journey doc notes an ORGANIZER
 * cannot perform the resolution leg (EDIT_ALLOWED excludes it — UC-TERR-36: the
 * list-item edit/alert menu is hidden for ORGANIZER), so the resolution belongs
 * to an ADMIN/ELDER. `signInAs('admin')` is used throughout the leadership legs.
 *
 * Seed block is adapted from `docs/journeys/j-04-moved-alert-resolution.md`:
 * the `note` is set on the designation snapshot too, because the work write-back
 * (work-page.component.ts handleTerritoryUpdated) overwrites the territory doc
 * with the designation snapshot fields — an empty snapshot note would clobber
 * the seeded note and hide the Mudou badge (UC-TERR-27).
 */
test('J-04 — Moved alert: report → observe → resolve → verify gone', async ({ page, signInAs, seed, db }) => {
  // ── Seed: one territory + one active designation embedding it ──────────────
  const territory = seed.factories.buildTerritory({
    id: 'j04-territory',
    congregationId: seed.ids.congregation,
    city: 'São Paulo',
    address: 'Rua da Mudança, 404 - Moema',
    note: 'Portaria 24h.', // non-empty note REQUIRED for badges (UC-TERR-27)
    history: [],
  });
  const designation = seed.factories.buildDesignation({
    id: 'j04-designation',
    congregationId: seed.ids.congregation,
    createdBy: seed.ids.adminUser,
    expiresAt: new Date(Date.now() + 7 * 86_400_000),
    territories: [
      seed.factories.buildDesignationTerritory({
        id: 'j04-territory',
        congregationId: seed.ids.congregation,
        city: 'São Paulo',
        address: 'Rua da Mudança, 404 - Moema',
        note: 'Portaria 24h.', // on the snapshot too — write-back overwrites the territory note
        history: [],
      }),
    ],
  });
  await seed.write({ territories: [territory], designations: [designation] });

  const workPage = new WorkPage(page);
  const dialog = new WorkItemCompleteDialogPage(page);

  // ── Leg 1 — Publisher records "Morador mudou de endereço" (UC-WORK-09) ─────
  await workPage.goto('j04-designation');
  await expect(workPage.loading).toBeHidden();

  await workPage.itemByAddress('Rua da Mudança, 404 - Moema').getByTestId('work-item-checkbox').click();
  await expect(dialog.dialog).toBeVisible();
  await dialog.selectOutcome('Morador mudou de endereço');
  await dialog.submit();

  await expect(workPage.completedList.filter({ hasText: 'Rua da Mudança, 404 - Moema' })).toBeVisible();

  // ⟶ HAND-OFF (Firestore, expect.poll — fire-and-forget write-back).
  await expect
    .poll(
      async () =>
        (await db.getSubcollectionDocs(db.collections.territories, 'j04-territory', db.historySubcollection)).length,
    )
    .toBe(1);
  const historyDocs = await db.getSubcollectionDocs(
    db.collections.territories,
    'j04-territory',
    db.historySubcollection,
  );
  expect(historyDocs[0]['visitOutcome']).toBe(VisitOutcomeEnum.MOVED);
  expect(historyDocs[0]['isResolved']).toBeUndefined(); // the work dialog never writes it
  // UC-WORK-23: designation embedded history started empty → write-back overwrote
  // recentHistory down to just the new entry (assert 1, not 5).
  await expect
    .poll(async () => (await db.getDoc(db.collections.territories, 'j04-territory'))?.['recentHistory']?.length)
    .toBe(1);

  // ── Leg 2 — Admin observes the alert and the moved count ───────────────────
  await signInAs('admin');

  const statisticsPage = new StatisticsPage(page);
  await statisticsPage.goto();
  // UC-STAT-03: unresolved MOVED in recentHistory (baseline contributes 0).
  await expect(statisticsPage.tileMoved).toContainText('Mudaram: 1');

  const territoriesPage = new TerritoriesPage(page);
  await territoriesPage.goto();
  // UC-TERR-10: the moved territory is absent from the default list.
  await expect(territoriesPage.territoryByAddress('Rua da Mudança, 404 - Moema')).toHaveCount(0);

  // Reveal it via the toggle.
  const sortFilter = new SortFilterDialogPage(page);
  await sortFilter.open();
  await sortFilter.toggleByTitle('Territórios que Mudaram');
  await sortFilter.apply();

  // UC-TERR-24/27: Mudou badge (note is non-empty).
  const row = territoriesPage.territoryByAddress('Rua da Mudança, 404 - Moema');
  const movedBadge = row.getByTestId('territory-alert-badge').filter({ hasText: 'Mudou' });
  await expect(movedBadge).toBeVisible();
  await expect(movedBadge).toHaveAttribute('title', 'Essa pessoa se mudou');

  // ⟶ HAND-OFF (Firestore): the badge's data source.
  const rhBefore = (await db.getDoc(db.collections.territories, 'j04-territory'))?.['recentHistory'] as Array<
    Record<string, unknown>
  >;
  expect(rhBefore[0]['visitOutcome']).toBe(VisitOutcomeEnum.MOVED);
  expect(rhBefore[0]['isResolved']).toBeFalsy();

  // ── Leg 3 — Admin resolves the "Mudou" alert (UC-TERR-30) ──────────────────
  await territoriesPage.openItemMenu('Rua da Mudança, 404 - Moema');
  await territoriesPage.menuItem('Mudou').click();

  const alerts = new TerritoryAlertsPage(page);
  await expect(alerts.dialog).toBeVisible();
  await expect(alerts.title).toHaveText('Morador Mudou');
  await expect(
    alerts.dialog.getByText('Recentemente um publicador reportou que esse morador não está mais nesse endereço:'),
  ).toBeVisible();
  await expect(alerts.dialog.getByText('O que você quer fazer?')).toBeVisible();
  // Default "Remover Marcação" → Salvar.
  await alerts.save();

  // Badge disappears (the list is manually re-fetched — UC-TERR-30).
  await expect(movedBadge).toHaveCount(0);

  // ⟶ HAND-OFF (Firestore): resolution wrote BOTH representations.
  await expect
    .poll(async () => {
      const sub = await db.getSubcollectionDocs(db.collections.territories, 'j04-territory', db.historySubcollection);
      return sub.find((h) => h['visitOutcome'] === VisitOutcomeEnum.MOVED)?.['isResolved'];
    })
    .toBe(true);
  await expect
    .poll(async () => {
      const rh = (await db.getDoc(db.collections.territories, 'j04-territory'))?.['recentHistory'] as Array<
        Record<string, unknown>
      >;
      return rh.find((h) => h['visitOutcome'] === VisitOutcomeEnum.MOVED)?.['isResolved'];
    })
    .toBe(true);

  // ── Leg 4 — Verify the badge and the count are gone ───────────────────────
  // A resolved MOVED no longer triggers the "hide unless toggled" filter — reload
  // (resets the filter to default) and the territory renders in the default list.
  await page.reload();
  await expect(territoriesPage.list).toBeVisible();
  await expect(territoriesPage.territoryByAddress('Rua da Mudança, 404 - Moema')).toBeVisible();
  await expect(
    territoriesPage.territoryByAddress('Rua da Mudança, 404 - Moema').getByTestId('territory-alert-badge'),
  ).toHaveCount(0);

  // UC-STAT-03: resolved entries do not count.
  await statisticsPage.goto();
  await expect(statisticsPage.tileMoved).toContainText('Mudaram: 0');

  // ── FINAL SWEEP (Firestore) ────────────────────────────────────────────────
  const desDoc = await db.getDoc(db.collections.designations, 'j04-designation');
  expect(desDoc?.['territories'][0]['status']).toBe(DesignationStatusEnum.DONE); // leg 1, never touched by resolution
  const finalSub = await db.getSubcollectionDocs(db.collections.territories, 'j04-territory', db.historySubcollection);
  expect(finalSub).toHaveLength(1);
  expect(finalSub[0]['visitOutcome']).toBe(VisitOutcomeEnum.MOVED);
  expect(finalSub[0]['isResolved']).toBe(true);
});
