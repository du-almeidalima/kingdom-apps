import { expect, test } from '../fixtures';
import { StatisticsPage } from '../page-objects/statistics.page';
import { VisitOutcomeEnum } from '../../src/models/enums/visit-outcome';

/**
 * J-07 — Statistics reconciliation across period boundaries and city scopes.
 *
 * Composes UC-STAT-01/02/04..12/19 + the boundary note at the top of
 * `docs/features/territories-statistics.md`. Proves the dynamic metrics reconcile
 * 1:1 with the real `history` subcollections for every period option and for
 * single-city vs "Todas" scopes, using dates planted precisely on period
 * boundaries (all computed from the test's own clock — absolute 2024 baseline
 * dates fall outside every dynamic window).
 *
 * Seed block is copied verbatim from `docs/journeys/j-07-statistics-reconciliation.md`.
 * The whole journey is a pure read model — zero writes.
 */
test('J-07 — Statistics reconcile per period and per city against the history subcollections', async ({
  authenticatedPage,
  seed,
  db,
}) => {
  // ── Seed: clock-relative visits on period boundaries ──────────────────────
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const visits = [
    // IN — every period's window (today)
    seed.factories.buildVisitHistory({
      id: 'j07-v-today',
      visitOutcome: VisitOutcomeEnum.SPOKE,
      isRevisit: true,
      date: now,
    }),
    // IN — this month, ON its first day (boundary-inclusive)
    seed.factories.buildVisitHistory({
      id: 'j07-v-month-1st',
      visitOutcome: VisitOutcomeEnum.SPOKE,
      isRevisit: false,
      date: firstOfThisMonth,
    }),
    // IN — previous month; OUT of "Este Mês" (boundary-exclusive)
    seed.factories.buildVisitHistory({
      id: 'j07-v-prev-mid',
      visitOutcome: VisitOutcomeEnum.REVISIT,
      isRevisit: false,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 15),
    }),
    // OUT — 28th of month −2; only inside "3 Meses"+ windows
    seed.factories.buildVisitHistory({
      id: 'j07-v-old',
      visitOutcome: VisitOutcomeEnum.SPOKE,
      isRevisit: false,
      date: new Date(now.getFullYear(), now.getMonth() - 2, 28),
    }),
  ];
  await seed.write({
    territories: [
      seed.factories.buildTerritory({
        id: 'j07-territory-sp',
        congregationId: seed.ids.congregation,
        city: 'São Paulo',
        history: visits,
      }),
      seed.factories.buildTerritory({
        id: 'j07-territory-os',
        congregationId: seed.ids.congregation,
        city: 'Osasco',
        history: [
          seed.factories.buildVisitHistory({
            id: 'j07-v-os',
            visitOutcome: VisitOutcomeEnum.SPOKE,
            isRevisit: true,
            date: now,
          }),
        ],
      }),
    ],
  });

  const statisticsPage = new StatisticsPage(authenticatedPage);
  await statisticsPage.goto();

  // ── Leg 1 — Baseline contributes nothing to dynamic metrics (UC-STAT-19) ───
  // With Osasco selected + Este Mês, the counts come solely from j07-territory-os
  // (the baseline Osasco visit is from 2024 → excluded).
  await statisticsPage.selectCity('Osasco');
  await expect(statisticsPage.tileVisits).toContainText('Visitas: 1');
  await expect(statisticsPage.tileRevisits).toContainText('Revisitas: 1');

  // ── Leg 2 — Reconcile each period for São Paulo (UC-STAT-04/05/06) ────────
  await statisticsPage.selectCity('São Paulo');

  // Este Mês: v-today + v-month-1st (boundary-inclusive) = 2 visits; 1 revisita.
  // UC-STAT-04: window starts on the 1st of the current month.
  await statisticsPage.selectPeriodByLabel('Este Mês');
  await expect(statisticsPage.tileVisits).toContainText('Visitas: 2');
  await expect(statisticsPage.tileRevisits).toContainText('Revisitas: 1');

  // 1 Mês: + v-prev-mid (outcome REVISIT counts as a visit, UC-STAT-10; not a revisita, UC-STAT-11) = 3 visits.
  await statisticsPage.selectPeriodByLabel('1 Mês');
  await expect(statisticsPage.tileVisits).toContainText('Visitas: 3');
  await expect(statisticsPage.tileRevisits).toContainText('Revisitas: 1');

  // 3 Meses: + v-old (28th of month −2) = 4 visits.
  await statisticsPage.selectPeriodByLabel('3 Meses');
  await expect(statisticsPage.tileVisits).toContainText('Visitas: 4');
  await expect(statisticsPage.tileRevisits).toContainText('Revisitas: 1');

  // ⟶ HAND-OFF (Firestore, per row — UC-STAT-12): the UI number reconciles with
  // the subcollection filtered to the same window.
  const spHistoryDocs = await db.getSubcollectionDocs(
    db.collections.territories,
    'j07-territory-sp',
    db.historySubcollection,
  );
  expect(spHistoryDocs).toHaveLength(4);

  // ── Leg 3 — City scoping vs "Todas" (UC-STAT-02) ──────────────────────────
  // Osasco, Este Mês → only j07-territory-os's visit.
  await statisticsPage.selectCity('Osasco');
  await statisticsPage.selectPeriodByLabel('Este Mês');
  await expect(statisticsPage.tileVisits).toContainText('Visitas: 1');
  await expect(statisticsPage.tileRevisits).toContainText('Revisitas: 1');

  // "Todas", Este Mês → 2 São Paulo + 1 Osasco = 3 visits; 1 + 1 = 2 revisitas.
  await statisticsPage.showAllCities();
  await expect(statisticsPage.tileVisits).toContainText('Visitas: 3');
  await expect(statisticsPage.tileRevisits).toContainText('Revisitas: 2');

  // ⟶ HAND-OFF (Firestore): static section under "Todas" — UC-STAT-01.
  await expect(statisticsPage.tileTerritories).toContainText('Territórios: 5'); // 3 baseline + 2 planted
  await expect(statisticsPage.tileBibleStudies).toContainText('Estudos bíblicos: 1'); // baseline seed-territory-3 only
  await expect(statisticsPage.tileMoved).toContainText('Mudaram: 0');
  // Under São Paulo: 2 baseline (seed-territory-1/-3) + 1 planted = 3.
  await statisticsPage.selectCity('São Paulo');
  await expect(statisticsPage.tileTerritories).toContainText('Territórios: 3');

  // ── Leg 4 — The out-of-window boundary stays out (UC-STAT-19) ─────────────
  // Este Mês SP: v-prev-mid (15th of last month) excluded → 2, not 3.
  await statisticsPage.selectPeriodByLabel('Este Mês');
  await expect(statisticsPage.tileVisits).toContainText('Visitas: 2');
  // 1 Mês: the same visit is now included → 3, proving the boundary is firstOfPrevMonth.
  await statisticsPage.selectPeriodByLabel('1 Mês');
  await expect(statisticsPage.tileVisits).toContainText('Visitas: 3');

  // ── FINAL SWEEP (Firestore) — no write happened anywhere ──────────────────
  expect(await db.getCollectionDocs(db.collections.territories)).toHaveLength(5);
  for (const tid of ['j07-territory-sp', 'j07-territory-os']) {
    const docs = await db.getSubcollectionDocs(db.collections.territories, tid, db.historySubcollection);
    expect(docs.length).toBe(tid === 'j07-territory-sp' ? 4 : 1);
  }
});
