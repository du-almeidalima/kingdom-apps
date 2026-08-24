import { expect, test } from '../fixtures';
import { TerritoriesPage } from '../page-objects/territories.page';
import { AssignTerritoriesPage } from '../page-objects/assign-territories.page';
import { StatisticsPage } from '../page-objects/statistics.page';
import { ToastPage } from '../page-objects/toast.page';
import { downloadCsv } from '../utils/csv-download.util';
import { RoleEnum } from '../../src/models/enums/role';

/**
 * J-08 — Empty-system journey: a brand-new congregation with one city and zero
 * territories across list, assign, statistics and CSV export.
 *
 * Composes UC-TERR-03/34 + UC-ASSIGN-03 + UC-STAT-13. Nothing may crash, and
 * every "you can't do that yet" must be a graceful absence, not an error. The
 * app has no empty-state copy on these screens — the journey asserts the
 * **absence of errors** (no toast/banner/stuck spinner) rather than presence of
 * empty-state text.
 *
 * Seed block is copied from `docs/journeys/j-08-empty-system.md`. The whole
 * journey is write-free.
 */
test('J-08 — Empty congregation: list, assign, statistics and CSV export all behave gracefully', async ({
  page,
  seed,
  signInAsUser,
  db,
}) => {
  // ── Seed: second congregation, one city, one admin, ZERO territories ───────
  const congregation = seed.factories.buildCongregation({
    id: 'j08-congregation',
    name: 'Congregação Vila Nova',
    cities: ['Campinas'],
  });
  const admin = seed.factories.buildUser({
    id: 'j08-admin',
    name: 'Felipe Ramos',
    email: 'felipe.ramos@example.com',
    role: RoleEnum.ADMIN,
    congregationId: 'j08-congregation',
  });
  await seed.write({ congregations: [congregation], users: [admin] });

  await signInAsUser('j08-admin');

  // ── Leg 1 — `/territories` renders an empty, stable list (UC-TERR-03) ──────
  const territoriesPage = new TerritoriesPage(page);
  await territoriesPage.goto();

  await expect(territoriesPage.heading).toBeVisible();
  // The congregation's own cities — NOT the baseline's São Paulo/Osasco.
  expect(await territoriesPage.cityOptions()).toEqual(['Campinas', 'Todas']);
  // The list container is present with ZERO rows, and no baseline territory leaks in.
  await expect(territoriesPage.territoryItems).toHaveCount(0);
  await expect(territoriesPage.territoryByAddress('Rua das Acácias, 45 - Pinheiros')).toHaveCount(0);

  // ⟶ HAND-OFF (Firestore): scoping — UC-TERR-01's core guarantee in its purest form.
  expect(await db.queryWhere(db.collections.territories, 'congregationId', '==', 'j08-congregation')).toHaveLength(0);
  expect(await db.getCollectionDocs(db.collections.territories)).toHaveLength(3); // baseline untouched

  // ── Leg 2 — `/territories/assign` renders but cannot submit (UC-ASSIGN-03) ─
  const assignPage = new AssignTerritoriesPage(page);
  await assignPage.goto();

  await expect(assignPage.heading).toHaveText('Designar Território');
  expect(await assignPage.cityFilter.locator('option').allTextContents()).toEqual(['Campinas', 'Todas']);
  await expect(assignPage.checkboxes).toHaveCount(0);
  await expect(assignPage.fab).toBeDisabled(); // permanently — nothing to submit

  // ⟶ HAND-OFF (Firestore): no new designation.
  expect(await db.getCollectionDocs(db.collections.designations)).toHaveLength(1); // baseline only

  // ── Leg 3 — `/territories/statistics` renders clean zero totals (UC-STAT-13) ─
  // With zero territories, `getAllByCongregation({ getHistory: true })` returns `of([])`
  // immediately (empty-snapshot guard), so the loading state clears and every tile renders 0.
  const statisticsPage = new StatisticsPage(page);
  await statisticsPage.goto();

  await expect(statisticsPage.heading).toBeVisible();
  await expect(statisticsPage.loading).toHaveCount(0);
  await expect(statisticsPage.staticSection).toBeVisible();
  await expect(statisticsPage.dynamicSection).toBeVisible();
  await expect(statisticsPage.tileTerritories).toContainText('Territórios: 0');
  await expect(statisticsPage.tilePeople).toContainText('Pessoas: 0');
  await expect(statisticsPage.tileBibleStudies).toContainText('Estudos bíblicos: 0');
  await expect(statisticsPage.tileMoved).toContainText('Mudaram: 0');
  // The city <select> still offers the congregation's cities once loading clears.
  await expect(statisticsPage.cityFilter).toBeEnabled();
  expect(await statisticsPage.cityFilter.locator('option').allTextContents()).toEqual(['Campinas', 'Todas']);

  // ── Leg 4 — CSV export of an empty territory set (UC-TERR-34 with n = 0) ───
  await territoriesPage.goto();

  const { suggestedFilename, content } = await downloadCsv(page, async () => {
    await territoriesPage.overflowMenu.click();
    await territoriesPage.exportItem.click();
  });

  expect(suggestedFilename).toMatch(/^mm-territorios-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.csv$/);
  const toast = new ToastPage(page);
  await toast.expectText('Territórios exportados com sucesso.');

  // BOM prefix + header-only (zero data rows).
  expect(content.startsWith('\uFEFF')).toBe(true);
  const body = content.slice(1);
  const lines = body.split('\r\n');
  expect(lines[0]).toBe(
    'Cidade;Endereço;Observação;Link do Mapa;Ícone;Estudante da Bíblia;Instrutor da Bíblia;Última Visita',
  );
  const dataRows = lines.slice(1).filter((l) => l.length > 0);
  expect(dataRows).toHaveLength(0);

  // ── FINAL SWEEP (Firestore) — the whole journey was write-free ────────────
  expect(await db.getCollectionDocs(db.collections.congregations)).toHaveLength(2);
  expect(await db.getCollectionDocs(db.collections.territories)).toHaveLength(3); // all baseline
  expect(await db.getCollectionDocs(db.collections.designations)).toHaveLength(1); // baseline only
});
