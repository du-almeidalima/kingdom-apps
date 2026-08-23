import { expect, test } from '../fixtures';
import { StatisticsPage } from '../page-objects/statistics.page';
import { RoleEnum } from '../../src/models/enums/role';
import { VisitOutcomeEnum } from '../../src/models/enums/visit-outcome';

// ─── WP-20 + WP-21: territories statistics (static, counting rules, periods, boundaries) ───

test.describe('Territories statistics (WP-20 + WP-21)', () => {
  test.use({ role: 'admin' });

  // ════════════════════════════════════════════════════════════════════════════
  // WP-20 — Static totals & counting rules
  // ════════════════════════════════════════════════════════════════════════════

  test.describe('WP-20 — static totals & counting rules', () => {
    test('UC-STAT-01 — Displays static totals for all cities (⚠ peopleQuantity: 0 counts as 1)', async ({
      authenticatedPage,
      seed,
      db,
    }) => {
      const statisticsPage = new StatisticsPage(authenticatedPage);
      await statisticsPage.goto();

      // Default selected city is "Todas" → all 3 baseline territories.
      await expect(statisticsPage.generalHeading).toBeVisible();
      await expect(statisticsPage.tileTerritories).toContainText('Territórios: 3');
      await expect(statisticsPage.tilePeople).toContainText('Pessoas: 3');
      await expect(statisticsPage.tileBibleStudies).toContainText('Estudos bíblicos: 1');
      await expect(statisticsPage.tileMoved).toContainText('Mudaram: 0');

      // Persistence: 3 docs; sum of `peopleQuantity` (defaulting to 1 if missing or 0) === 3;
      // exactly 1 doc has `isBibleStudent: true`.
      const territories = await db.getCollectionDocs(db.collections.territories);
      expect(territories).toHaveLength(3);
      const peopleSum = territories.reduce<number>(
        (sum, t) => sum + (t['peopleQuantity'] ? t['peopleQuantity'] : 1),
        0,
      );
      expect(peopleSum).toBe(3);
      expect(territories.filter(t => t['isBibleStudent'] === true)).toHaveLength(1);

      // ⚠ Edge case (suspected defect): a territory with `peopleQuantity: 0`
      // is counted as 1 person by the BO (`cur.peopleQuantity ? cur.peopleQuantity : 1`).
      const zeroPeople = seed.factories.buildTerritory({
        congregationId: seed.ids.congregation,
        city: 'São Paulo',
        address: 'Rua do Povo Zero, 1',
        peopleQuantity: 0,
        history: [],
      });
      await seed.write({ territories: [zeroPeople] });
      await statisticsPage.reload();

      await expect(statisticsPage.tileTerritories).toContainText('Territórios: 4');
      await expect(statisticsPage.tilePeople).toContainText('Pessoas: 4');
    });

    test('UC-STAT-02 — Filters static totals by city (and restores via "Todas")', async ({
      authenticatedPage,
      db,
    }) => {
      const statisticsPage = new StatisticsPage(authenticatedPage);
      await statisticsPage.goto();

      // Select "São Paulo" — 2 of the 3 baseline territories live there.
      await statisticsPage.selectCity('São Paulo');
      await expect(statisticsPage.tileTerritories).toContainText('Territórios: 2');
      await expect(statisticsPage.tilePeople).toContainText('Pessoas: 2');
      await expect(statisticsPage.tileBibleStudies).toContainText('Estudos bíblicos: 1');
      await expect(statisticsPage.tileMoved).toContainText('Mudaram: 0');

      const saoPaulo = await db.queryWhere(
        db.collections.territories,
        'city',
        '==',
        'São Paulo',
      );
      expect(saoPaulo).toHaveLength(2);

      // Edge case: switching back to "Todas" restores the UC-STAT-01 totals.
      await statisticsPage.showAllCities();
      await expect(statisticsPage.tileTerritories).toContainText('Territórios: 3');
      await expect(statisticsPage.tilePeople).toContainText('Pessoas: 3');
    });

    test('UC-STAT-03 — "Mudaram" count is derived from unresolved-MOVED entries in the fetched history', async ({
      authenticatedPage,
      seed,
      db,
    }) => {
      // Seed a territory whose latest visit is an unresolved MOVED entry.
      const moved = seed.factories.buildTerritory({
        congregationId: seed.ids.congregation,
        city: 'São Paulo',
        address: 'Rua do Mudado, 50',
        history: [
          seed.factories.buildVisitHistory({
            visitOutcome: VisitOutcomeEnum.MOVED,
            isResolved: false,
            date: new Date(),
            notes: 'Morador se mudou.',
          }),
        ],
      });
      await seed.write({ territories: [moved] });

      const statisticsPage = new StatisticsPage(authenticatedPage);
      await statisticsPage.goto();

      // Baseline contributes 0; the new territory contributes 1.
      await expect(statisticsPage.tileMoved).toContainText('Mudaram: 1');

      const stored = await db.getDoc(db.collections.territories, moved.id);
      const rh = stored?.['recentHistory'] as Array<Record<string, unknown>>;
      expect(
        rh.some(h => h['visitOutcome'] === VisitOutcomeEnum.MOVED && h['isResolved'] === false),
      ).toBe(true);
      // The subcollection doc carries the stamps that power the single collection-group query.
      const historyDocs = await db.getSubcollectionDocs(db.collections.territories, moved.id, db.historySubcollection);
      expect(historyDocs[0]['congregationId']).toBe(seed.ids.congregation);
      expect(historyDocs[0]['territoryId']).toBe(moved.id);
    });

    test('UC-STAT-03b — "Mudaram" counts an unresolved MOVED beyond the last 5 visits (gap #21)', async ({
      authenticatedPage,
      seed,
    }) => {
      // Six visits within the last year: five newer ones fill `recentHistory` and push the
      // unresolved MOVED out of it. The count must come from the fetched full history, so the
      // move still contributes 1.
      const now = Date.now();
      const visits = Array.from({ length: 5 }, (_, i) =>
        seed.factories.buildVisitHistory({
          visitOutcome: VisitOutcomeEnum.NOT_ANSWERED,
          date: new Date(now - (i + 1) * 7 * 86_400_000),
        })
      );
      visits.push(
        seed.factories.buildVisitHistory({
          visitOutcome: VisitOutcomeEnum.MOVED,
          isResolved: false,
          date: new Date(now - 60 * 86_400_000),
          notes: 'Morador se mudou há dois meses.',
        })
      );

      const movedBeyondRecent = seed.factories.buildTerritory({
        congregationId: seed.ids.congregation,
        city: 'São Paulo',
        address: 'Rua do Mudado Antigo, 51',
        history: visits,
      });
      await seed.write({ territories: [movedBeyondRecent] });

      const statisticsPage = new StatisticsPage(authenticatedPage);
      await statisticsPage.goto();

      await expect(statisticsPage.tileMoved).toContainText('Mudaram: 1');
    });

    test('UC-STAT-10 — Visit count includes only outcomes SPOKE (0) and REVISIT (4)', async ({
      authenticatedPage,
      seed,
      db,
    }) => {
      // One territory with 5 visits today, one per outcome.
      const territory = seed.factories.buildTerritory({
        congregationId: seed.ids.congregation,
        city: 'São Paulo',
        address: 'Rua dos Cinco Resultados, 5',
        history: [
          seed.factories.buildVisitHistory({ visitOutcome: VisitOutcomeEnum.SPOKE, date: new Date() }),
          seed.factories.buildVisitHistory({
            visitOutcome: VisitOutcomeEnum.NOT_ANSWERED,
            date: new Date(),
          }),
          seed.factories.buildVisitHistory({ visitOutcome: VisitOutcomeEnum.MOVED, date: new Date() }),
          seed.factories.buildVisitHistory({
            visitOutcome: VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN,
            date: new Date(),
          }),
          seed.factories.buildVisitHistory({
            visitOutcome: VisitOutcomeEnum.REVISIT,
            date: new Date(),
          }),
        ],
      });
      await seed.write({ territories: [territory] });

      const statisticsPage = new StatisticsPage(authenticatedPage);
      await statisticsPage.goto();

      // Default period is "Este Mês" (THIS_MONTH = 1st of current month); all 5
      // visits happened today so date >= baseDate, but only outcomes 0 and 4
      // increment `visitCount` → 2. Baseline visits live in 2024 → excluded.
      await expect(statisticsPage.tileVisits).toContainText('Visitas: 2');

      const subDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territory.id,
        db.historySubcollection,
      );
      expect(subDocs).toHaveLength(5);
    });

    test('UC-STAT-11 — Revisit count increments only when `isRevisit: true` (regardless of outcome)', async ({
      authenticatedPage,
      seed,
      db,
    }) => {
      // Two visits today: (A) outcome SPOKE with `isRevisit: true`; (B) outcome
      // REVISIT with `isRevisit: false`. Only A increments `revisitCount`.
      const territory = seed.factories.buildTerritory({
        congregationId: seed.ids.congregation,
        city: 'São Paulo',
        address: 'Rua da Revisita Booleana, 7',
        history: [
          seed.factories.buildVisitHistory({
            visitOutcome: VisitOutcomeEnum.SPOKE,
            isRevisit: true,
            date: new Date(),
          }),
          seed.factories.buildVisitHistory({
            visitOutcome: VisitOutcomeEnum.REVISIT,
            isRevisit: false,
            date: new Date(),
          }),
        ],
      });
      await seed.write({ territories: [territory] });

      const statisticsPage = new StatisticsPage(authenticatedPage);
      await statisticsPage.goto();

      await expect(statisticsPage.tileRevisits).toContainText('Revisitas: 1');

      const subDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territory.id,
        db.historySubcollection,
      );
      expect(subDocs).toHaveLength(2);
    });

    test('UC-STAT-12 — Statistics read from the full history subcollection (not recentHistory)', async ({
      authenticatedPage,
      seed,
      db,
    }) => {
      // Seed 7 visits today — all SPOKE — so the BO must source them from the
      // subcollection (the parent's `recentHistory` only keeps the last 5).
      const history = Array.from({ length: 7 }, () =>
        seed.factories.buildVisitHistory({
          visitOutcome: VisitOutcomeEnum.SPOKE,
          date: new Date(),
        }),
      );
      const territory = seed.factories.buildTerritory({
        congregationId: seed.ids.congregation,
        city: 'São Paulo',
        address: 'Rua das Sete Visitas, 7',
        history,
      });
      await seed.write({ territories: [territory] });

      const statisticsPage = new StatisticsPage(authenticatedPage);
      await statisticsPage.goto();

      await expect(statisticsPage.tileVisits).toContainText('Visitas: 7');

      const subDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territory.id,
        db.historySubcollection,
      );
      expect(subDocs).toHaveLength(7);

      const parent = await db.getDoc(db.collections.territories, territory.id);
      const rh = parent?.['recentHistory'] as Array<unknown> | undefined;
      expect(rh).toHaveLength(5);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // WP-21 — Periods & boundaries
  // ════════════════════════════════════════════════════════════════════════════

  test.describe('WP-21 — periods & boundaries', () => {
    test('UC-STAT-04 — Period "Este Mês" (THIS_MONTH, default) counts visits from the 1st of the current month', async ({
      authenticatedPage,
      seed,
      db,
    }) => {
      // Visit today + a visit on the last day of the previous month. Only today's qualifies.
      const lastDayPrevMonth = new Date();
      lastDayPrevMonth.setDate(0); // day 0 of the current month === last day of previous month
      lastDayPrevMonth.setHours(12, 0, 0, 0);

      const territory = seed.factories.buildTerritory({
        congregationId: seed.ids.congregation,
        city: 'São Paulo',
        address: 'Rua do Mês Atual, 1',
        history: [
          seed.factories.buildVisitHistory({
            visitOutcome: VisitOutcomeEnum.SPOKE,
            isRevisit: true,
            date: new Date(),
          }),
          seed.factories.buildVisitHistory({
            visitOutcome: VisitOutcomeEnum.SPOKE,
            date: lastDayPrevMonth,
          }),
        ],
      });
      await seed.write({ territories: [territory] });

      const statisticsPage = new StatisticsPage(authenticatedPage);
      await statisticsPage.goto();

      await expect(statisticsPage.periodHeading).toBeVisible();
      // "Este Mês" is the default selection — no need to touch the period select.
      await expect(statisticsPage.tileVisits).toContainText('Visitas: 1');
      await expect(statisticsPage.tileRevisits).toContainText('Revisitas: 1');

      const firstDayOfCurrentMonth = new Date();
      firstDayOfCurrentMonth.setDate(1);
      firstDayOfCurrentMonth.setHours(0, 0, 0, 0);
      const subDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territory.id,
        db.historySubcollection,
      );
      const qualifying = subDocs.filter(d => {
        const visitDate = (d['date'] as { toDate: () => Date }).toDate();
        return visitDate >= firstDayOfCurrentMonth;
      });
      expect(qualifying).toHaveLength(1);
    });

    test('UC-STAT-05 — Period "1 Mês" covers the current month plus the entirety of the previous month', async ({
      authenticatedPage,
      seed,
      db,
    }) => {
      const fifteenthPrevMonth = new Date();
      fifteenthPrevMonth.setMonth(fifteenthPrevMonth.getMonth() - 1, 15);
      fifteenthPrevMonth.setHours(12, 0, 0, 0);

      const territory = seed.factories.buildTerritory({
        congregationId: seed.ids.congregation,
        city: 'São Paulo',
        address: 'Rua do Janelão, 30',
        history: [
          // Today — SPOKE, not a revisit.
          seed.factories.buildVisitHistory({
            visitOutcome: VisitOutcomeEnum.SPOKE,
            date: new Date(),
          }),
          // 15th of previous month — SPOKE + revisit; both fall inside this window.
          seed.factories.buildVisitHistory({
            visitOutcome: VisitOutcomeEnum.SPOKE,
            isRevisit: true,
            date: fifteenthPrevMonth,
          }),
        ],
      });
      await seed.write({ territories: [territory] });

      const statisticsPage = new StatisticsPage(authenticatedPage);
      await statisticsPage.goto();
      await statisticsPage.selectPeriodByLabel('1 Mês');

      await expect(statisticsPage.tileVisits).toContainText('Visitas: 2');
      await expect(statisticsPage.tileRevisits).toContainText('Revisitas: 1');

      const firstDayPrevMonth = new Date();
      firstDayPrevMonth.setMonth(firstDayPrevMonth.getMonth() - 1, 1);
      firstDayPrevMonth.setHours(0, 0, 0, 0);
      const subDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territory.id,
        db.historySubcollection,
      );
      const qualifying = subDocs.filter(d => {
        const visitDate = (d['date'] as { toDate: () => Date }).toDate();
        return visitDate >= firstDayPrevMonth;
      });
      expect(qualifying).toHaveLength(2);
    });

    test('UC-STAT-06 — Period "3 Meses" — REVISIT (4) outcome counts as a visit', async ({
      authenticatedPage,
      seed,
      db,
    }) => {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      twoMonthsAgo.setHours(12, 0, 0, 0);

      const territory = seed.factories.buildTerritory({
        congregationId: seed.ids.congregation,
        city: 'São Paulo',
        address: 'Rua dos Três Meses, 3',
        history: [
          seed.factories.buildVisitHistory({
            visitOutcome: VisitOutcomeEnum.REVISIT,
            isRevisit: true,
            date: new Date(),
          }),
          seed.factories.buildVisitHistory({
            visitOutcome: VisitOutcomeEnum.REVISIT,
            isRevisit: true,
            date: twoMonthsAgo,
          }),
        ],
      });
      await seed.write({ territories: [territory] });

      const statisticsPage = new StatisticsPage(authenticatedPage);
      await statisticsPage.goto();
      await statisticsPage.selectPeriodByLabel('3 Meses');

      // Both REVISIT outcomes count as visits; both are flagged revisits.
      await expect(statisticsPage.tileVisits).toContainText('Visitas: 2');
      await expect(statisticsPage.tileRevisits).toContainText('Revisitas: 2');

      const firstDayThreeMonthsAgo = new Date();
      firstDayThreeMonthsAgo.setMonth(firstDayThreeMonthsAgo.getMonth() - 3, 1);
      firstDayThreeMonthsAgo.setHours(0, 0, 0, 0);
      const subDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territory.id,
        db.historySubcollection,
      );
      const qualifying = subDocs.filter(d => {
        const visitDate = (d['date'] as { toDate: () => Date }).toDate();
        return visitDate >= firstDayThreeMonthsAgo;
      });
      expect(qualifying).toHaveLength(2);
    });

    test('UC-STAT-07 — Period "6 meses" includes a visit 5 months ago', async ({
      authenticatedPage,
      seed,
      db,
    }) => {
      const fiveMonthsAgo = new Date();
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
      fiveMonthsAgo.setHours(12, 0, 0, 0);

      const territory = seed.factories.buildTerritory({
        congregationId: seed.ids.congregation,
        city: 'São Paulo',
        address: 'Rua dos Seis Meses, 6',
        history: [
          seed.factories.buildVisitHistory({
            visitOutcome: VisitOutcomeEnum.SPOKE,
            date: fiveMonthsAgo,
          }),
        ],
      });
      await seed.write({ territories: [territory] });

      const statisticsPage = new StatisticsPage(authenticatedPage);
      await statisticsPage.goto();
      await statisticsPage.selectPeriodByLabel('6 meses');

      await expect(statisticsPage.tileVisits).toContainText('Visitas: 1');

      const firstDaySixMonthsAgo = new Date();
      firstDaySixMonthsAgo.setMonth(firstDaySixMonthsAgo.getMonth() - 6, 1);
      firstDaySixMonthsAgo.setHours(0, 0, 0, 0);
      const subDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territory.id,
        db.historySubcollection,
      );
      const qualifying = subDocs.filter(d => {
        const visitDate = (d['date'] as { toDate: () => Date }).toDate();
        return visitDate >= firstDaySixMonthsAgo;
      });
      expect(qualifying).toHaveLength(1);
    });

    test('UC-STAT-08 — Period "1 ano" includes a visit 11 months ago', async ({
      authenticatedPage,
      seed,
      db,
    }) => {
      const elevenMonthsAgo = new Date();
      elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);
      elevenMonthsAgo.setHours(12, 0, 0, 0);

      const territory = seed.factories.buildTerritory({
        congregationId: seed.ids.congregation,
        city: 'São Paulo',
        address: 'Rua do Ano Passado, 12',
        history: [
          seed.factories.buildVisitHistory({
            visitOutcome: VisitOutcomeEnum.SPOKE,
            date: elevenMonthsAgo,
          }),
        ],
      });
      await seed.write({ territories: [territory] });

      const statisticsPage = new StatisticsPage(authenticatedPage);
      await statisticsPage.goto();
      await statisticsPage.selectPeriodByLabel('1 ano');

      await expect(statisticsPage.tileVisits).toContainText('Visitas: 1');

      const firstDayCurrentMonthLastYear = new Date();
      firstDayCurrentMonthLastYear.setFullYear(firstDayCurrentMonthLastYear.getFullYear() - 1);
      firstDayCurrentMonthLastYear.setDate(1);
      firstDayCurrentMonthLastYear.setHours(0, 0, 0, 0);
      const subDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territory.id,
        db.historySubcollection,
      );
      const qualifying = subDocs.filter(d => {
        const visitDate = (d['date'] as { toDate: () => Date }).toDate();
        return visitDate >= firstDayCurrentMonthLastYear;
      });
      expect(qualifying).toHaveLength(1);
    });

    test('UC-STAT-09 — Period "Este Ano" (YEAR_TO_DATE) includes a visit on Jan 1st', async ({
      authenticatedPage,
      seed,
      db,
    }) => {
      const jan1 = new Date(new Date().getFullYear(), 0, 1, 12, 0, 0, 0);

      const territory = seed.factories.buildTerritory({
        congregationId: seed.ids.congregation,
        city: 'São Paulo',
        address: 'Rua do Ano Novo, 1',
        history: [
          seed.factories.buildVisitHistory({
            visitOutcome: VisitOutcomeEnum.SPOKE,
            date: jan1,
          }),
        ],
      });
      await seed.write({ territories: [territory] });

      const statisticsPage = new StatisticsPage(authenticatedPage);
      await statisticsPage.goto();
      await statisticsPage.selectPeriodByLabel('Este Ano');

      await expect(statisticsPage.tileVisits).toContainText('Visitas: 1');

      const firstDayOfCurrentYear = new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0);
      const subDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territory.id,
        db.historySubcollection,
      );
      const qualifying = subDocs.filter(d => {
        const visitDate = (d['date'] as { toDate: () => Date }).toDate();
        return visitDate >= firstDayOfCurrentYear;
      });
      expect(qualifying).toHaveLength(1);
    });

    test('UC-STAT-13 — Empty congregation renders clean zero totals', async ({
      seed,
      signInAsUser,
      db,
      page,
    }) => {
      // With zero territories, `FirebaseTerritoryDatasourceService.getAllByCongregation
      //   ({ getHistory: true })` guards the empty snapshot and returns `of([])` immediately —
      //   no history query is issued. `isLoading` flips to false and the page renders every
      //   tile with zero totals.
      const congregation = seed.factories.buildCongregation({ cities: ['Guarulhos'] });
      const admin = seed.factories.buildUser({
        role: RoleEnum.ADMIN,
        congregationId: congregation.id,
      });
      await seed.write({ congregations: [congregation], users: [admin] });

      await signInAsUser(admin.id);
      await page.goto('/territories/statistics');

      await expect(page.getByTestId('statistics-heading')).toBeVisible();
      // Loading cleared: the filter is enabled and both sections render with zeros.
      await expect(page.getByTestId('statistics-city-filter')).toBeEnabled();
      await expect(page.getByTestId('statistics-loading')).toHaveCount(0);
      await expect(page.getByTestId('statistics-static-section')).toBeVisible();
      await expect(page.getByTestId('statistics-dynamic-section')).toBeVisible();
      await expect(page.getByTestId('statistic-tile-territories')).toContainText('Territórios: 0');
      await expect(page.getByTestId('statistic-tile-bible-studies')).toContainText('Estudos bíblicos: 0');
      await expect(page.getByTestId('statistic-tile-moved')).toContainText('Mudaram: 0');

      const scoped = await db.queryWhere(
        db.collections.territories,
        'congregationId',
        '==',
        congregation.id,
      );
      expect(scoped).toHaveLength(0);
    });

    test('UC-STAT-14 — Loading state gates the static/dynamic sections (mechanism assertion)', async ({
      authenticatedPage,
    }) => {
      // The page wraps both sections in `@if (isLoading) { <statistics-loading> }
      // @else { <static-section/> <dynamic-section/> }`, and binds the city
      // select's `[disabled]` to `isLoading`. After navigation completes, the
      // spinner branch must be gone, the loaded sections must be present, and
      // the city filter must be enabled — proving the conditional mechanism is
      // wired (load started → finished) and the disabled binding tracks it.
      const statisticsPage = new StatisticsPage(authenticatedPage);
      await authenticatedPage.goto('/territories/statistics');

      // Once the observable resolves, the spinner branch is removed from the DOM.
      await expect(statisticsPage.loading).toHaveCount(0);
      await expect(statisticsPage.staticSection).toBeVisible();
      await expect(statisticsPage.dynamicSection).toBeVisible();
      // `[disabled]=false` does not emit a `disabled` attribute — its absence
      // proves the binding resolved to false once data arrived.
      await expect(statisticsPage.cityFilter).not.toHaveAttribute('disabled');
    });

    test('UC-STAT-15 — Organizer can view the statistics page', async ({ signInAs, page, db }) => {
      await signInAs('organizer');
      await page.goto('/territories/statistics');

      const statisticsPage = new StatisticsPage(page);
      await expect(statisticsPage.heading).toBeVisible();
      await expect(statisticsPage.staticSection).toBeVisible();

      const organizer = await db.getDoc(db.collections.users, 'seed-user-organizer');
      expect(organizer?.['role']).toBe('ORGANIZER');
    });

    test('UC-STAT-18 — Territory with no history contributes zero visits and zero revisits', async ({
      authenticatedPage,
      seed,
      db,
    }) => {
      const territory = seed.factories.buildTerritory({
        congregationId: seed.ids.congregation,
        city: 'São Paulo',
        address: 'Rua Sem Histórico, 0',
        history: [],
      });
      await seed.write({ territories: [territory] });

      const statisticsPage = new StatisticsPage(authenticatedPage);
      await statisticsPage.goto();

      await expect(statisticsPage.tileVisits).toContainText('Visitas: 0');
      await expect(statisticsPage.tileRevisits).toContainText('Revisitas: 0');

      const subDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territory.id,
        db.historySubcollection,
      );
      expect(subDocs).toHaveLength(0);
    });

    test('UC-STAT-19 — Visits outside the selected period are excluded (Este Mês vs 2 months ago)', async ({
      authenticatedPage,
      seed,
      db,
    }) => {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      twoMonthsAgo.setHours(12, 0, 0, 0);

      const territory = seed.factories.buildTerritory({
        congregationId: seed.ids.congregation,
        city: 'São Paulo',
        address: 'Rua Fora do Período, 2',
        history: [
          seed.factories.buildVisitHistory({
            visitOutcome: VisitOutcomeEnum.SPOKE,
            date: twoMonthsAgo,
          }),
        ],
      });
      await seed.write({ territories: [territory] });

      const statisticsPage = new StatisticsPage(authenticatedPage);
      await statisticsPage.goto();
      // Default period is "Este Mês" — visit 2 months ago falls before the 1st
      // of the current month, so it must be excluded.
      await expect(statisticsPage.tileVisits).toContainText('Visitas: 0');

      const firstDayOfCurrentMonth = new Date();
      firstDayOfCurrentMonth.setDate(1);
      firstDayOfCurrentMonth.setHours(0, 0, 0, 0);
      const subDocs = await db.getSubcollectionDocs(
        db.collections.territories,
        territory.id,
        db.historySubcollection,
      );
      const excluded = subDocs.filter(d => {
        const visitDate = (d['date'] as { toDate: () => Date }).toDate();
        return visitDate < firstDayOfCurrentMonth;
      });
      expect(excluded).toHaveLength(1);
    });
  });
});
