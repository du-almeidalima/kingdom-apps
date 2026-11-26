import { expect, test } from '../fixtures';
import { TerritoriesPage } from '../page-objects/territories.page';
import { ToastPage } from '../page-objects/toast.page';
import { downloadCsv, downloadXlsx } from '../utils/csv-download.util';
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
      'Cidade;Endereço;Observação;Link do Mapa;Ícone;Estudante da Bíblia;Instrutor da Bíblia;Última Visita;Resultado da Última Visita',
    );

    // One data row per congregation territory, sorted by city (Osasco before São Paulo).
    const all = await db.getCollectionDocs(db.collections.territories);
    const dataRows = lines.slice(1).filter((l) => l.length > 0);
    expect(dataRows).toHaveLength(all.length);
    expect(dataRows[0].startsWith('Osasco;')).toBe(true);

    // The bible-student territory (seed-territory-3) exports a `Sim` flag and
    // its raw instructor uid; dates are dd/MM/yyyy (lastVisit 2024-03-12) and the
    // last column carries the most recent visit's outcome in pt-BR.
    const studentRow = expectData(dataRows.find((l) => l.includes('Rua Harmonia, 300 - Vila Madalena')));
    expect(studentRow).toContain('Homem'); // icon label
    expect(studentRow).toContain('Sim'); // isBibleStudent → "Sim"
    expect(studentRow).toContain('seed-user-publisher-1'); // raw instructor uid
    expect(studentRow).toMatch(/12\/03\/2024;Morador contatado$/);

    // seed-territory-1's most recent visit is a REVISIT (2024-03-10).
    const revisitRow = expectData(dataRows.find((l) => l.includes('Rua das Acácias, 45 - Pinheiros')));
    expect(revisitRow).toMatch(/10\/03\/2024;Revisita$/);
  });

  test('UC-TERR-34b — Excel export downloads a valid .xlsx sorted by city', async ({ signInAs, db, page }) => {
    await signInAs('admin');

    const territoriesPage = new TerritoriesPage(page);
    await territoriesPage.goto();

    const { suggestedFilename, rows } = await downloadXlsx(page, async () => {
      await territoriesPage.overflowMenu.click();
      await territoriesPage.exportXlsxItem.click();
    });

    expect(suggestedFilename).toMatch(/^mm-territorios-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.xlsx$/);

    const toast = new ToastPage(page);
    await toast.expectText('Territórios exportados com sucesso.');

    expect(rows[0]).toEqual([
      'Cidade',
      'Endereço',
      'Observação',
      'Link do Mapa',
      'Ícone',
      'Estudante da Bíblia',
      'Instrutor da Bíblia',
      'Última Visita',
      'Resultado da Última Visita',
    ]);
    expect(rows.slice(1)).toHaveLength((await db.getCollectionDocs(db.collections.territories)).length);
    expect(rows[1][0]).toBe('Osasco'); // sorted by city

    const studentRow = expectData(rows.find((row) => row[1].includes('Rua Harmonia, 300 - Vila Madalena')));
    expect(studentRow[4]).toBe('Homem'); // icon label
    expect(studentRow[5]).toBe('Sim'); // isBibleStudent
    expect(studentRow[6]).toBe('seed-user-publisher-1'); // raw instructor uid
    expect(studentRow[7]).toBe('12/03/2024');
    expect(studentRow[8]).toBe('Morador contatado');

    const revisitRow = expectData(rows.find((row) => row[1].includes('Rua das Acácias, 45 - Pinheiros')));
    expect(revisitRow[7]).toBe('10/03/2024');
    expect(revisitRow[8]).toBe('Revisita');
  });

  test('UC-TERR-35 — overflow menu hidden for ORGANIZER, visible for ELDER', async ({ signInAs, page }) => {
    await signInAs('organizer');
    const territoriesPage = new TerritoriesPage(page);
    await territoriesPage.goto();
    // The ⋮ overflow button is gated to [APP_ADMIN, SUPERINTENDENT, ADMIN, ELDER].
    await expect(territoriesPage.overflowMenu).toHaveCount(0);

    // ELDER is also allowed to export territories, in both formats.
    await signInAs('elder');
    await territoriesPage.goto();
    await expect(territoriesPage.overflowMenu).toBeVisible();
    await territoriesPage.overflowMenu.click();
    await expect(territoriesPage.exportItem).toBeVisible();
    await expect(territoriesPage.exportXlsxItem).toBeVisible();
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
