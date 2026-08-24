import { expect, test } from '../fixtures';
import { TerritoriesPage } from '../page-objects/territories.page';
import { ToastPage } from '../page-objects/toast.page';
import { downloadCsv } from '../utils/csv-download.util';
import { expectData } from '../utils/firestore-assert.util';

// ─── WP-17: CSV export + overflow role gating ─────────────────────────────────

test.describe('Territories page — export & role gating (WP-17)', () => {
  test('UC-TERR-34 — export downloads a pt-BR CSV, sorted by city', async ({ signInAs, db, page }) => {
    await signInAs('admin');

    const territoriesPage = new TerritoriesPage(page);
    await territoriesPage.goto();

    // Open the overflow menu and export. The ⋮ trigger carries `territories-overflow-menu`,
    // the item carries `territories-export-item`.
    const { suggestedFilename, content } = await downloadCsv(page, async () => {
      await territoriesPage.overflowMenu.click();
      await territoriesPage.exportItem.click();
    });

    // Filename pattern (UTC timestamp, : and T → -).
    expect(suggestedFilename).toMatch(/^mm-territorios-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.csv$/);

    // Success toast.
    const toast = new ToastPage(page);
    await toast.expectText('Territórios exportados com sucesso.');

    // BOM prefix.
    expect(content.startsWith('\uFEFF')).toBe(true);

    // Strip the BOM before splitting so the header row compares cleanly.
    const body = content.slice(1);
    const lines = body.split('\r\n');
    // Header row exactly.
    expect(lines[0]).toBe(
      'Cidade;Endereço;Observação;Link do Mapa;Ícone;Estudante da Bíblia;Instrutor da Bíblia;Última Visita',
    );

    // One data row per congregation territory, sorted by city (Osasco before São Paulo).
    const all = await db.getCollectionDocs(db.collections.territories);
    const dataRows = lines.slice(1).filter((l) => l.length > 0);
    expect(dataRows).toHaveLength(all.length);
    expect(dataRows[0].startsWith('Osasco;')).toBe(true);

    // The bible-student territory (seed-territory-3) exports a `Sim` flag and
    // its raw instructor uid; dates are dd/MM/yyyy (lastVisit 2024-03-12).
    const studentRow = expectData(dataRows.find((l) => l.includes('Rua Harmonia, 300 - Vila Madalena')));
    expect(studentRow).toContain('Homem'); // icon label
    expect(studentRow).toContain('Sim'); // isBibleStudent → "Sim"
    expect(studentRow).toContain('seed-user-publisher-1'); // raw instructor uid
    expect(studentRow).toMatch(/12\/03\/2024$/);
  });

  test('UC-TERR-35 — export/overflow menu hidden for ORGANIZER and ELDER', async ({ signInAs, db, page }) => {
    for (const role of ['organizer', 'elder'] as const) {
      await signInAs(role);
      const territoriesPage = new TerritoriesPage(page);
      await territoriesPage.goto();
      // The ⋮ overflow button is gated to [APP_ADMIN, SUPERINTENDENT, ADMIN].
      await expect(territoriesPage.overflowMenu).toHaveCount(0);

      expect(
        (await db.getDoc(db.collections.users, role === 'organizer' ? 'seed-user-organizer' : 'seed-user-elder'))?.[
          'role'
        ],
      ).toBe(role === 'organizer' ? 'ORGANIZER' : 'ELDER');
    }
  });

  test('UC-TERR-36 — list-item menu excludes ORGANIZER (only Histórico visible)', async ({ signInAs, page }) => {
    await signInAs('organizer');
    const territoriesPage = new TerritoriesPage(page);
    await territoriesPage.goto();
    await territoriesPage.showAllCities();

    // Open the item menu on any row.
    await territoriesPage.openItemMenu('Av. dos Autonomistas, 1200 - Centro');
    // Histórico is ungated and visible…
    await expect(territoriesPage.menuItem('Histórico')).toBeVisible();
    // …while Editar and Apagar (EDIT_ALLOWED = ADMIN/ELDER/SUPERINTENDENT) are absent.
    await expect(territoriesPage.menuItem('Editar')).toHaveCount(0);
    await expect(territoriesPage.menuItem('Apagar')).toHaveCount(0);
  });
});
