import { expect, test } from '../fixtures';
import { TerritoriesPage } from '../page-objects/territories.page';
import { SortFilterDialogPage } from '../page-objects/sort-filter-dialog.page';
import { VisitOutcomeEnum } from '../../src/models/enums/visit-outcome';

// ─── WP-14: sort/filter dialog ────────────────────────────────────────────────

test.describe('Territories page — sort/filter dialog (WP-14)', () => {
  test.use({ role: 'admin' });

  test('UC-TERR-09 — "Estudantes da Bíblia" toggle (default ON) hides bible-student territories when off', async ({
    authenticatedPage,
    db,
  }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    // City São Paulo (default): both territories visible (seed-territory-3 is bible student).
    await expect(territoriesPage.territoryItems).toHaveCount(2);
    await expect(territoriesPage.territoryByAddress('Rua Harmonia, 300 - Vila Madalena')).toBeVisible();

    const sortFilter = new SortFilterDialogPage(authenticatedPage);
    await sortFilter.open();
    await expect(sortFilter.dialog).toBeVisible();
    await sortFilter.toggleByTitle('Estudantes da Bíblia');
    await sortFilter.apply();

    // Bible-student territory disappears.
    await expect(territoriesPage.territoryByAddress('Rua Harmonia, 300 - Vila Madalena')).toHaveCount(0);
    await expect(territoriesPage.territoryItems).toHaveCount(1);

    expect((await db.getDoc(db.collections.territories, 'seed-territory-3'))?.['isBibleStudent']).toBe(true);
  });

  test('UC-TERR-10 — "Territórios que Mudaram" toggle (default OFF) reveals unresolved-moved territories', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    // Territory with an unresolved MOVED entry in recentHistory (derived from history).
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
    // Default: moved territory is hidden (includeMoved defaults to false).
    await expect(territoriesPage.territoryItems).toHaveCount(2);
    await expect(territoriesPage.territoryByAddress('Rua do Mudado, 50')).toHaveCount(0);

    const sortFilter = new SortFilterDialogPage(authenticatedPage);
    await sortFilter.open();
    await expect(sortFilter.dialog).toBeVisible();
    await sortFilter.toggleByTitle('Territórios que Mudaram');
    await sortFilter.apply();

    // Moved territory now appears.
    await expect(territoriesPage.territoryByAddress('Rua do Mudado, 50')).toBeVisible();
    await expect(territoriesPage.territoryItems).toHaveCount(3);

    const stored = await db.getDoc(db.collections.territories, moved.id);
    const rh = stored?.['recentHistory'] as Array<Record<string, unknown>>;
    expect(rh.some(h => h['visitOutcome'] === VisitOutcomeEnum.MOVED && h['isResolved'] === false)).toBe(true);
  });

  test('UC-TERR-11 — Icon <select> filter narrows the list to one TerritoryIcon', async ({ authenticatedPage, db }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();
    // São Paulo: seed-territory-1 (cp/Casal), seed-territory-3 (m/Homem).
    await expect(territoriesPage.territoryItems).toHaveCount(2);

    const sortFilter = new SortFilterDialogPage(authenticatedPage);
    await sortFilter.open();
    await expect(sortFilter.dialog).toBeVisible();
    await sortFilter.selectFilterByTitle('Ícone', 'Homem');
    await sortFilter.apply();

    await expect(territoriesPage.territoryByAddress('Rua Harmonia, 300 - Vila Madalena')).toBeVisible();
    await expect(territoriesPage.territoryItems).toHaveCount(1);

    expect((await db.getDoc(db.collections.territories, 'seed-territory-3'))?.['icon']).toBe('m');
  });

  test('UC-TERR-12 — active-filter badge counts the default toggle as active from first render (⚠ defect)', async ({
    authenticatedPage,
  }) => {
    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();

    const sortFilter = new SortFilterDialogPage(authenticatedPage);
    // ⚠ Fresh load, no interaction: badge already shows `1` because the default-on
    // `includeBibleStudent` differs from the component's unset `initialValue` input.
    await expect(sortFilter.badge).toHaveText('1');
  });

  test('UC-TERR-13 — sort/filter state persists in localStorage across reload', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    // Extra São Paulo territory: positionIndex 4 (last under SAVED_INDEX) but oldest
    // lastVisit, so the persisted LAST_VISIT sort is observable after reload.
    const extra = seed.factories.buildTerritory({
      congregationId: seed.ids.congregation,
      city: 'São Paulo',
      address: 'Rua Velha, 9',
      positionIndex: 4,
      history: [seed.factories.buildVisitHistory({ date: new Date('2024-01-01T10:00:00.000Z') })],
    });
    await seed.write({ territories: [extra] });

    const territoriesPage = new TerritoriesPage(authenticatedPage);
    await territoriesPage.goto();

    const sortFilter = new SortFilterDialogPage(authenticatedPage);
    await sortFilter.open();
    await expect(sortFilter.dialog).toBeVisible();
    await sortFilter.selectSort('Última Visita');
    await sortFilter.toggleByTitle('Territórios que Mudaram');
    await sortFilter.apply();

    // localStorage holds the persisted sort/filter state.
    const stored = await authenticatedPage.evaluate(() => localStorage.getItem('sort-filter-state'));
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)).toEqual({
      sort: 'LAST_VISIT',
      filters: { includeBibleStudent: true, includeMoved: true, icon: '' },
    });

    // Reload: list is already sorted by last visit without reopening the dialog.
    await authenticatedPage.reload();
    await expect(territoriesPage.territoryItems.nth(0)).toContainText('Rua Velha, 9');

    // Persistence sanity: the extra territory was written.
    expect((await db.getDoc(db.collections.territories, extra.id))?.['city']).toBe('São Paulo');
  });
});
