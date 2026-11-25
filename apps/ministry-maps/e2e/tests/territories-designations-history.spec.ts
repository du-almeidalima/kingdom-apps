import { expect, test } from '../fixtures';
import { DesignationsHistoryPage } from '../page-objects/designations-history.page';
import { DesignationsHistoryDetailsPage } from '../page-objects/designations-history-details.page';
import { WorkPage } from '../page-objects/work.page';
import { WorkItemCompleteDialogPage } from '../page-objects/work-item-complete-dialog.page';
import { captureWhatsAppPopup } from '../utils/whatsapp-link.util';
import { DesignationsHeaderClosedByEnum } from '../../src/models/enums/designations-header-closed-by';
import { DesignationsHeaderStatusEnum } from '../../src/models/enums/designations-header-status';
import { VisitOutcomeEnum } from '../../src/models/enums/visit-outcome';

test.describe('Histórico de Designações', () => {
  test.use({ role: 'admin' });

  test('UC-HIST-01 — Home link opens the designations history list', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await authenticatedPage.getByRole('link', { name: 'Histórico de Designações' }).click();
    await expect(authenticatedPage).toHaveURL(/\/territories\/designations$/);
    await expect(authenticatedPage.getByTestId('designations-history-heading')).toBeVisible();
  });

  test('UC-HIST-02 — Lists congregation headers newest first with status and closure source', async ({ authenticatedPage, seed }) => {
    const oldest = seed.factories.buildDesignationsHeader({ id: 'history-old', congregationId: seed.ids.congregation, createdBy: seed.ids.adminUser, createdAt: new Date('2026-09-01T10:00:00Z'), status: DesignationsHeaderStatusEnum.IN_PROGRESS });
    const manual = seed.factories.buildDesignationsHeader({ id: 'history-user', congregationId: seed.ids.congregation, createdBy: seed.ids.adminUser, createdAt: new Date('2026-09-02T10:00:00Z'), closedAt: new Date('2026-09-02T11:00:00Z'), closedBy: DesignationsHeaderClosedByEnum.USER, status: DesignationsHeaderStatusEnum.DONE });
    const cron = seed.factories.buildDesignationsHeader({ id: 'history-cron', congregationId: seed.ids.congregation, createdBy: seed.ids.adminUser, createdAt: new Date('2026-09-03T10:00:00Z'), closedAt: new Date('2026-09-03T11:00:00Z'), closedBy: DesignationsHeaderClosedByEnum.CRON, status: DesignationsHeaderStatusEnum.DONE });
    await seed.write({ designationsHeaders: [oldest, manual, cron, seed.factories.buildDesignationsHeader({ id: 'history-other', congregationId: 'OTHER-CONGREGATION', createdAt: new Date('2026-09-04T10:00:00Z') })] });

    const history = new DesignationsHistoryPage(authenticatedPage);
    await history.goto();
    await expect(history.rows).toHaveCount(3);
    await expect(history.rows.nth(0)).toContainText('Encerrada');
    await expect(history.rows.nth(0)).toContainText('Sessão de 03/09/2026');
    await expect(history.rows.nth(0)).toContainText('Encerrada automaticamente em');
    await expect(history.rows.nth(1)).toContainText('Encerrada manualmente em');
    await expect(history.rows.nth(2)).toContainText('Em andamento');
    await expect(authenticatedPage.locator('a[href*="history-other"]')).toHaveCount(0);
  });

  test('UC-HIST-03 — Loads another 20-header page and removes the load-more button', async ({ authenticatedPage, seed }) => {
    const headers = Array.from({ length: 21 }, (_, index) => seed.factories.buildDesignationsHeader({
      id: `history-page-${index}`, congregationId: seed.ids.congregation, createdBy: seed.ids.adminUser,
      createdAt: new Date(Date.UTC(2026, 8, 21 - index, 12)),
    }));
    await seed.write({ designationsHeaders: headers });
    const history = new DesignationsHistoryPage(authenticatedPage);
    await history.goto();
    await expect(history.rows).toHaveCount(20);
    await history.loadMore.click();
    await expect(history.rows).toHaveCount(21);
    await expect(history.loadMore).toHaveCount(0);
  });

  test('UC-HIST-04 — Shows an empty state when the congregation has no headers', async ({ authenticatedPage }) => {
    const history = new DesignationsHistoryPage(authenticatedPage);
    await history.goto();
    await expect(history.emptyState).toHaveText('Nenhuma sessão de designações encontrada.');
  });

  test('UC-HIST-05 — Shows header totals, outcome counts and per-designation progress', async ({ authenticatedPage, seed }) => {
    const header = seed.factories.buildDesignationsHeader({ id: 'history-summary', congregationId: seed.ids.congregation, createdBy: seed.ids.adminUser });
    const first = seed.factories.buildDesignation({ id: 'history-D1', congregationId: seed.ids.congregation, designationHeaderId: header.id, createdAt: new Date('2026-09-01T10:00:00Z'), territories: [1, 2, 3].map((n) => seed.factories.buildDesignationTerritory({ id: `history-T${n}`, congregationId: seed.ids.congregation })) });
    const second = seed.factories.buildDesignation({ id: 'history-D2', congregationId: seed.ids.congregation, designationHeaderId: header.id, createdAt: new Date('2026-09-02T10:00:00Z'), territories: [4, 5].map((n) => seed.factories.buildDesignationTerritory({ id: `history-T${n}`, congregationId: seed.ids.congregation })) });
    await seed.write({ designationsHeaders: [header], designations: [first, second], designationsProgress: [seed.factories.buildDesignationsProgress({
      headerId: header.id, congregationId: seed.ids.congregation,
      designations: {
        [first.id]: { territoriesTotal: 3, createdAt: first.createdAt, expiresAt: first.expiresAt },
        [second.id]: { territoriesTotal: 2, createdAt: second.createdAt, expiresAt: second.expiresAt },
      },
      territories: {
        [`${first.id}_history-T1`]: { designationId: first.id, territoryId: 'history-T1', outcome: VisitOutcomeEnum.SPOKE, completedAt: new Date() },
        [`${first.id}_history-T2`]: { designationId: first.id, territoryId: 'history-T2', outcome: VisitOutcomeEnum.SPOKE, completedAt: new Date() },
        [`${second.id}_history-T4`]: { designationId: second.id, territoryId: 'history-T4', outcome: VisitOutcomeEnum.NOT_ANSWERED, completedAt: new Date() },
      },
    })] });

    const detail = new DesignationsHistoryDetailsPage(authenticatedPage);
    await detail.goto(header.id);
    await expect(detail.summaryText).toHaveText('3 de 5 territórios concluídos');
    await expect(authenticatedPage.getByTestId('designations-progress-percent')).toHaveText('60%');
    await expect(detail.outcomeCounts).toHaveCount(2);
    await expect(detail.outcomeCounts.nth(0)).toContainText('Contatados 2');
    await expect(detail.outcomeCounts.nth(1)).toContainText('Ninguém atendeu 1');
    await expect(detail.cardByIndex(0)).toContainText('Designação 1');
    await expect(detail.cardByIndex(0)).toContainText('2/3');
    await expect(detail.cardByIndex(1)).toContainText('Designação 2');
    await expect(detail.cardByIndex(1)).toContainText('1/2');
  });

  test('UC-HIST-06 — Expands territory status and re-shares its designation', async ({ authenticatedPage, seed }) => {
    const header = seed.factories.buildDesignationsHeader({ id: 'history-expand', congregationId: seed.ids.congregation, createdBy: seed.ids.adminUser });
    const designation = seed.factories.buildDesignation({ id: 'history-share-D1', congregationId: seed.ids.congregation, designationHeaderId: header.id,
      expiresAt: new Date('2020-01-01T00:00:00Z'), territories: [1, 2].map((n) => seed.factories.buildDesignationTerritory({ id: `history-share-T${n}`, congregationId: seed.ids.congregation })) });
    await seed.write({ designationsHeaders: [header], designations: [designation], designationsProgress: [seed.factories.buildDesignationsProgress({
      headerId: header.id, congregationId: seed.ids.congregation,
      designations: { [designation.id]: { territoriesTotal: 2, createdAt: designation.createdAt, expiresAt: designation.expiresAt } },
      territories: { [`${designation.id}_history-share-T1`]: { designationId: designation.id, territoryId: 'history-share-T1', outcome: VisitOutcomeEnum.SPOKE, completedAt: new Date() } },
    })] });
    const detail = new DesignationsHistoryDetailsPage(authenticatedPage);
    await detail.goto(header.id);
    await expect(detail.cardByIndex(0).getByTestId('designation-expired-badge')).toHaveText('Expirada');
    await detail.toggle(0).click();
    await expect(detail.territoryRows(0)).toHaveCount(2);
    await expect(detail.cardByIndex(0)).toContainText('Concluído');
    await expect(detail.cardByIndex(0)).toContainText('Pendente');
    const { sharedUrl } = await captureWhatsAppPopup(authenticatedPage, () => detail.shareButton(0).click());
    expect(sharedUrl).toContain(`/work/${designation.id}`);
  });

  test('UC-HIST-07 — Shows legacy progress unavailable and unknown-header not found states', async ({ authenticatedPage, seed }) => {
    const header = seed.factories.buildDesignationsHeader({ id: 'history-legacy', congregationId: seed.ids.congregation, createdBy: seed.ids.adminUser });
    await seed.write({ designationsHeaders: [header] });
    const detail = new DesignationsHistoryDetailsPage(authenticatedPage);
    await detail.goto(header.id);
    await expect(detail.unavailable).toHaveText('Progresso indisponível para esta sessão.');
    await detail.goto('history-unknown');
    await expect(detail.notFound).toHaveText('Sessão de designações não encontrada.');
  });

  test('UC-HIST-08 — Allows territory roles and redirects PUBLISHER', async ({ page, signInAs }) => {
    for (const role of ['organizer', 'admin', 'elder', 'superintendent', 'app_admin'] as const) {
      await signInAs(role);
      await page.goto('/territories/designations');
      await expect(page.getByTestId('designations-history-heading')).toBeVisible();
    }
    await signInAs('publisher');
    await page.goto('/territories/designations');
    await expect(page).toHaveURL(/\/welcome$/);
  });

  test('UC-HIST-09 — Anonymous work completion updates the open detail page live', async ({ authenticatedPage, browser, seed }) => {
    const header = seed.factories.buildDesignationsHeader({ id: 'history-live', congregationId: seed.ids.congregation, createdBy: seed.ids.adminUser });
    const territoryId = 'history-live-T1';
    const territory = seed.factories.buildTerritory({ id: territoryId, congregationId: seed.ids.congregation });
    const designation = seed.factories.buildDesignation({ id: 'history-live-D1', congregationId: seed.ids.congregation, designationHeaderId: header.id,
      expiresAt: new Date(Date.now() + 86_400_000), territories: [seed.factories.buildDesignationTerritory({ id: territoryId, congregationId: seed.ids.congregation, address: territory.address, history: [] })] });
    await seed.write({ territories: [territory], designationsHeaders: [header], designations: [designation], designationsProgress: [seed.factories.buildDesignationsProgress({
      headerId: header.id, congregationId: seed.ids.congregation,
      designations: { [designation.id]: { territoriesTotal: 1, createdAt: designation.createdAt, expiresAt: designation.expiresAt } },
    })] });

    const detail = new DesignationsHistoryDetailsPage(authenticatedPage);
    await detail.goto(header.id);
    await expect(detail.summaryText).toHaveText('0 de 1 territórios concluídos');

    const anonymousPage = await browser.newPage();
    try {
      const work = new WorkPage(anonymousPage);
      const dialog = new WorkItemCompleteDialogPage(anonymousPage);
      await work.goto(designation.id);
      await work.itemByAddress(designation.territories[0].address).getByTestId('work-item-checkbox').click();
      await dialog.submit();
      await expect(detail.summaryText).toHaveText('1 de 1 territórios concluídos');
    } finally {
      await anonymousPage.close();
    }
  });
});
