import { expect, test } from '../fixtures';
import { TerritoriesPage } from '../page-objects/territories.page';
import { TerritoryAlertsPage } from '../page-objects/territory-alerts.page';
import { HistoryDialogPage } from '../page-objects/history-dialog.page';
import { SortFilterDialogPage } from '../page-objects/sort-filter-dialog.page';
import { VisitOutcomeEnum } from '../../src/models/enums/visit-outcome';

// ─── WP-16: alert badges, history dialog, resolution dialogs ──────────────────

test.describe('Territories page — alerts (WP-16)', () => {
  test.use({ role: 'admin' });

  // ── Alert badges ────────────────────────────────────────────────────────────

  test('UC-TERR-23 — "Estudante" badge for bible-study territories', async ({ authenticatedPage, db }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    // seed-territory-3 is a bible student with a non-empty note.
    const row = territoriesPage.territoryByAddress('Rua Harmonia, 300 - Vila Madalena');
    const badge = row.getByTestId('territory-alert-badge').filter({ hasText: 'Estudante' });
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('title', 'Essa pessoa é um estudante da Bíblia');

    expect((await db.getDoc(db.collections.territories, 'seed-territory-3'))?.['isBibleStudent']).toBe(true);
  });

  test('UC-TERR-24 — "Mudou" badge for an unresolved MOVED entry', async ({ authenticatedPage, seed, db }) => {
    const moved = seed.factories.buildTerritory({
      congregationId: seed.ids.congregation,
      city: 'São Paulo',
      address: 'Rua do Mudado, 50',
      note: 'Morador se mudou.',
      history: [
        seed.factories.buildVisitHistory({
          visitOutcome: VisitOutcomeEnum.MOVED,
          isResolved: false,
          date: new Date(),
          notes: 'A casa estava vazia.',
        }),
      ],
    });
    await seed.write({ territories: [moved] });

    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    // An unresolved-MOVED territory is filtered out by default (includeMoved=false);
    // enable the toggle so the row (and its badge) renders.
    const sortFilter = new SortFilterDialogPage(authenticatedPage);
    await sortFilter.open();
    await sortFilter.toggleByTitle('Territórios que Mudaram');
    await sortFilter.apply();

    const row = territoriesPage.territoryByAddress('Rua do Mudado, 50');
    const badge = row.getByTestId('territory-alert-badge').filter({ hasText: 'Mudou' });
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('title', 'Essa pessoa se mudou');

    const stored = await db.getDoc(db.collections.territories, moved.id);
    const rh = stored?.['recentHistory'] as Array<Record<string, unknown>>;
    expect(rh.some((h) => h['visitOutcome'] === VisitOutcomeEnum.MOVED && h['isResolved'] === false)).toBe(true);
  });

  test('UC-TERR-25 — "Não quer visitas" badge (24-month window)', async ({ authenticatedPage, seed, db }) => {
    const tenMonthsAgo = new Date();
    tenMonthsAgo.setMonth(tenMonthsAgo.getMonth() - 10);
    const stopVisit = seed.factories.buildTerritory({
      congregationId: seed.ids.congregation,
      city: 'São Paulo',
      address: 'Rua do Recusa, 11',
      note: 'Pediu para não voltar.',
      history: [
        seed.factories.buildVisitHistory({
          visitOutcome: VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN,
          isResolved: false,
          date: tenMonthsAgo,
          notes: 'Não quer visitas.',
        }),
      ],
    });
    await seed.write({ territories: [stopVisit] });

    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();

    const row = territoriesPage.territoryByAddress('Rua do Recusa, 11');
    const badge = row.getByTestId('territory-alert-badge').filter({ hasText: 'Não quer visitas' });
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute(
      'title',
      'Essa pessoa disse que não quer ser visitada por uma Testemunha de Jeová',
    );

    const stored = await db.getDoc(db.collections.territories, stopVisit.id);
    const rh = stored?.['recentHistory'] as Array<Record<string, unknown>>;
    expect(rh.some((h) => h['visitOutcome'] === VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN)).toBe(true);
  });

  test('UC-TERR-26 — "Revisita" badge for any isRevisit entry', async ({ authenticatedPage, db }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    // seed-territory-3 has a recentHistory entry with isRevisit: true + a non-empty note.
    const row = territoriesPage.territoryByAddress('Rua Harmonia, 300 - Vila Madalena');
    const badge = row.getByTestId('territory-alert-badge').filter({ hasText: 'Revisita' });
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('title', 'Essa pessoa foi marcada como revisita recentemente');

    const stored = await db.getDoc(db.collections.territories, 'seed-territory-3');
    const rh = stored?.['recentHistory'] as Array<Record<string, unknown>>;
    expect(rh.some((h) => h['isRevisit'] === true)).toBe(true);
  });

  test('UC-TERR-27 — alert badges only render when note is non-empty (⚠ defect)', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    const noNote = seed.factories.buildTerritory({
      congregationId: seed.ids.congregation,
      city: 'São Paulo',
      address: 'Rua Sem Nota, 9',
      note: '',
      isBibleStudent: true,
      history: [
        seed.factories.buildVisitHistory({
          visitOutcome: VisitOutcomeEnum.MOVED,
          isResolved: false,
          date: new Date(),
          notes: 'Se mudou.',
        }),
      ],
    });
    await seed.write({ territories: [noNote] });

    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    // The unresolved MOVED entry would hide the territory by default; enable the
    // toggle so the row RENDERS, then assert it carries no badge despite the
    // qualifying alert data (the note-gating defect).
    const sortFilter = new SortFilterDialogPage(authenticatedPage);
    await sortFilter.open();
    await sortFilter.toggleByTitle('Territórios que Mudaram');
    await sortFilter.apply();

    // ⚠ Qualifying data present (isBibleStudent + unresolved MOVED) but NO badge renders.
    const row = territoriesPage.territoryByAddress('Rua Sem Nota, 9');
    await expect(row).toBeVisible();
    await expect(row.getByTestId('territory-alert-badge')).toHaveCount(0);

    const stored = await db.getDoc(db.collections.territories, noNote.id);
    expect(stored?.['note']).toBe('');
    expect(stored?.['isBibleStudent']).toBe(true);
    const rh = stored?.['recentHistory'] as Array<Record<string, unknown>>;
    expect(rh.some((h) => h['visitOutcome'] === VisitOutcomeEnum.MOVED && h['isResolved'] === false)).toBe(true);
  });

  // ── Visit-history dialog ────────────────────────────────────────────────────

  test('UC-TERR-28 — "Histórico" loads the entire history subcollection, unordered (⚠ defect)', async ({
    authenticatedPage,
    db,
  }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    // seed-territory-1 has 2 history docs.
    await territoriesPage.openItemMenu('Rua das Acácias, 45 - Pinheiros');
    await territoriesPage.menuItem('Histórico').click();

    const historyDialog = new HistoryDialogPage(authenticatedPage);
    await expect(historyDialog.dialog).toBeVisible();
    await expect(historyDialog.dialog.getByText('Histórico de Visitas')).toBeVisible();
    // Assert as a set (count), never order — the query has no orderBy.
    await expect(historyDialog.rows).toHaveCount(2);
    await historyDialog.close();

    expect(
      await db.getSubcollectionDocs(db.collections.territories, 'seed-territory-1', db.historySubcollection),
    ).toHaveLength(2);
  });

  test('UC-TERR-29 — "Histórico" menu item is always visible, even with zero visits', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    const empty = seed.factories.buildTerritory({
      congregationId: seed.ids.congregation,
      city: 'São Paulo',
      address: 'Rua Sem Visitas, 3',
      history: [],
    });
    await seed.write({ territories: [empty] });

    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    await territoriesPage.openItemMenu('Rua Sem Visitas, 3');
    // Histórico is ungated — still listed.
    await territoriesPage.menuItem('Histórico').click();

    const historyDialog = new HistoryDialogPage(authenticatedPage);
    await expect(historyDialog.dialog).toBeVisible();
    await expect(historyDialog.rows).toHaveCount(0);
    await expect(historyDialog.closeButton).toBeVisible();
    await historyDialog.close();

    expect(await db.getSubcollectionDocs(db.collections.territories, empty.id, db.historySubcollection)).toHaveLength(
      0,
    );
  });

  // ── Resolution dialogs ──────────────────────────────────────────────────────

  test('UC-TERR-30 — resolve "Mudou": Remover Marcação marks resolved in both stores', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    const moved = seed.factories.buildTerritory({
      congregationId: seed.ids.congregation,
      city: 'São Paulo',
      address: 'Rua do Mudado, 50',
      note: 'Morador se mudou.',
      history: [
        seed.factories.buildVisitHistory({
          visitOutcome: VisitOutcomeEnum.MOVED,
          isResolved: false,
          date: new Date(),
          notes: 'A casa estava vazia, confirmado.',
        }),
      ],
    });
    await seed.write({ territories: [moved] });

    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    // The unresolved MOVED entry hides the territory by default — enable the toggle.
    const sortFilter = new SortFilterDialogPage(authenticatedPage);
    await sortFilter.open();
    await sortFilter.toggleByTitle('Territórios que Mudaram');
    await sortFilter.apply();

    await territoriesPage.openItemMenu('Rua do Mudado, 50');
    await territoriesPage.menuItem('Mudou').click();

    const alerts = new TerritoryAlertsPage(authenticatedPage);
    await expect(alerts.dialog).toBeVisible();
    await expect(alerts.title).toHaveText('Morador Mudou');
    await expect(
      alerts.dialog.getByText('Recentemente um publicador reportou que esse morador não está mais nesse endereço:'),
    ).toBeVisible();
    await expect(alerts.dialog.getByText('O que você quer fazer?')).toBeVisible();
    // Three radio options rendered.
    await expect(
      alerts.dialog.getByTestId('alert-resolve-radio').filter({ hasText: 'Remover Marcação' }),
    ).toBeVisible();
    await expect(alerts.dialog.getByTestId('alert-resolve-radio').filter({ hasText: 'Apagar Endereço' })).toBeVisible();
    await expect(alerts.dialog.getByTestId('alert-resolve-radio').filter({ hasText: 'Editar Endereço' })).toBeVisible();

    // Default "Remover Marcação" is selected → Salvar.
    await alerts.save();

    // Persistence: matching entry isResolved:true in BOTH recentHistory and subcollection.
    await expect(async () => {
      const stored = await db.getDoc(db.collections.territories, moved.id);
      const rh = stored?.['recentHistory'] as Array<Record<string, unknown>>;
      const movedEntry = rh.find((h) => h['visitOutcome'] === VisitOutcomeEnum.MOVED);
      expect(movedEntry?.['isResolved']).toBe(true);
    }).toPass();
    await expect(async () => {
      const sub = await db.getSubcollectionDocs(db.collections.territories, moved.id, db.historySubcollection);
      const movedDoc = sub.find((h) => h['visitOutcome'] === VisitOutcomeEnum.MOVED) as
        Record<string, unknown> | undefined;
      expect(movedDoc?.['isResolved']).toBe(true);
    }).toPass();
  });

  test('UC-TERR-31 — resolving "Revisita" preserves unrelated recentHistory entries (fixed)', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    // Two recentHistory entries: (A) isRevisit, (B) unresolved MOVED.
    const both = seed.factories.buildTerritory({
      congregationId: seed.ids.congregation,
      city: 'São Paulo',
      address: 'Rua Dupla, 77',
      note: 'Tem revisita e mudou.',
      history: [
        seed.factories.buildVisitHistory({
          visitOutcome: VisitOutcomeEnum.SPOKE,
          isRevisit: true,
          date: new Date(),
          notes: 'Aceitou revisita.',
        }),
        seed.factories.buildVisitHistory({
          visitOutcome: VisitOutcomeEnum.MOVED,
          isResolved: false,
          date: new Date(Date.now() - 86_400_000),
          notes: 'Se mudou.',
        }),
      ],
    });
    await seed.write({ territories: [both] });

    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    // The unresolved MOVED entry hides the territory by default — enable the toggle.
    const sortFilter = new SortFilterDialogPage(authenticatedPage);
    await sortFilter.open();
    await sortFilter.toggleByTitle('Territórios que Mudaram');
    await sortFilter.apply();

    await territoriesPage.openItemMenu('Rua Dupla, 77');
    await territoriesPage.menuItem('Revisita').click();

    const alerts = new TerritoryAlertsPage(authenticatedPage);
    await expect(alerts.dialog).toBeVisible();
    await expect(alerts.title).toHaveText('Revisita');
    await expect(
      alerts.dialog.getByText('Um ou mais publicadores marcaram que esse território está sendo revisitado: '),
    ).toBeVisible();
    await alerts.save();

    // Fixed (2026-08): resolution merges the updated subset back into the full recentHistory —
    // the unrelated MOVED entry must survive, and the revisit entry loses its isRevisit flag.
    await expect(async () => {
      const stored = await db.getDoc(db.collections.territories, both.id);
      const recentHistory = stored?.['recentHistory'] as Array<Record<string, unknown>>;
      expect(recentHistory).toHaveLength(2);
      const revisitEntry = recentHistory.find((h) => h['notes'] === 'Aceitou revisita.');
      expect(revisitEntry?.['isRevisit']).toBe(false);
      const movedEntry = recentHistory.find((h) => h['notes'] === 'Se mudou.');
      expect(movedEntry?.['isResolved']).toBe(false);
    }).toPass();
    // The subcollection keeps both docs; only the revisit doc was rewritten (isRevisit cleared).
    const subDocs = await db.getSubcollectionDocs(db.collections.territories, both.id, db.historySubcollection);
    expect(subDocs).toHaveLength(2);
    const revisitDoc = subDocs.find((h) => h['notes'] === 'Aceitou revisita.') as Record<string, unknown> | undefined;
    expect(revisitDoc?.['isRevisit']).toBe(false);
  });

  test('UC-TERR-32 — resolve "Não Visitar" clears the badge', async ({ authenticatedPage, seed, db }) => {
    const tenMonthsAgo = new Date();
    tenMonthsAgo.setMonth(tenMonthsAgo.getMonth() - 10);
    const stopVisit = seed.factories.buildTerritory({
      congregationId: seed.ids.congregation,
      city: 'São Paulo',
      address: 'Rua do Recusa, 11',
      note: 'Pediu para não voltar.',
      history: [
        seed.factories.buildVisitHistory({
          visitOutcome: VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN,
          isResolved: false,
          date: tenMonthsAgo,
          notes: 'Não quer visitas.',
        }),
      ],
    });
    await seed.write({ territories: [stopVisit] });

    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    await territoriesPage.openItemMenu('Rua do Recusa, 11');
    await territoriesPage.menuItem('Não Visitar').click();

    const alerts = new TerritoryAlertsPage(authenticatedPage);
    await expect(alerts.dialog).toBeVisible();
    await expect(alerts.title).toHaveText('Parar de Visitar');
    await expect(
      alerts.dialog.getByText('Um ou mais publicadores marcaram que esse território pediu para não ser visitado: '),
    ).toBeVisible();
    await alerts.save();

    // Matching entry's isResolved becomes true in both stores.
    await expect(async () => {
      const stored = await db.getDoc(db.collections.territories, stopVisit.id);
      const rh = stored?.['recentHistory'] as Array<Record<string, unknown>>;
      const entry = rh.find((h) => h['visitOutcome'] === VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN);
      expect(entry?.['isResolved']).toBe(true);
    }).toPass();
    await expect(async () => {
      const sub = await db.getSubcollectionDocs(db.collections.territories, stopVisit.id, db.historySubcollection);
      const doc = sub.find((h) => h['visitOutcome'] === VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN) as
        Record<string, unknown> | undefined;
      expect(doc?.['isResolved']).toBe(true);
    }).toPass();
  });
});
