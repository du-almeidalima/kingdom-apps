import { expect, test } from '../fixtures';
import { NotificationQueuePage } from '../page-objects/notification-queue.page';
import { ProfilePage } from '../page-objects/profile.page';
import { WorkPage } from '../page-objects/work.page';

const TERMS_TITLE = 'Termos de uso atualizados';
const ELDER_ONLY_TITLE = 'Reunião de anciãos atualizada';
const LONG_CONTENT = [
  '## Termos de uso',
  ...Array.from(
    { length: 30 },
    (_, index) => `Parágrafo ${index + 1}: leia com atenção as condições de uso do aplicativo.`,
  ),
].join('\n\n');

test.describe('App-wide notifications', () => {
  test('UC-NOTIF-01 — App Admin publishes; a User acknowledges it once, re-reads it in Profile; App Admin sees the acknowledgment', async ({
    signInAs,
    page,
    db,
    seed,
  }) => {
    await signInAs('app_admin');
    await page.goto('/notifications/new');
    await page.getByTestId('notification-title-input').fill(TERMS_TITLE);
    await page.getByTestId('notification-content-input').fill(LONG_CONTENT);
    await page.getByTestId('notification-publish-button').click();
    await expect(page).toHaveURL(/\/notifications$/);

    const [published] = await db.getCollectionDocs('notifications');
    expect(published?.['status']).toBe('ACTIVE');
    const notificationId = published?.['id'] as string;

    await signInAs('admin');
    await page.goto('/home');
    const queue = new NotificationQueuePage(page);
    await expect(queue.sheet).toBeVisible();
    await expect(queue.title).toHaveText(TERMS_TITLE);
    await expect(queue.counter).toHaveCount(0);
    await expect(page.getByTestId(/^(dialog|bottom-sheet)-close$/)).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(queue.sheet).toBeVisible();

    await expect(queue.acknowledge).toBeDisabled();
    await expect(queue.acknowledge).toHaveText('Role até o fim para continuar');
    await queue.scrollToBottom();
    await expect(queue.acknowledge).toBeEnabled();
    await expect(queue.acknowledge).toHaveText('Entendi');
    await queue.acknowledge.click();
    await expect(queue.sheet).toBeHidden();

    const history = await db.getSubcollectionDocs(db.collections.users, seed.ids.adminUser, 'notifications');
    expect(history.map((item) => item['id'])).toEqual([notificationId]);
    const summary = (await db.firestore.doc(`notifications/${notificationId}/acknowledgments/summary`).get()).data();
    expect(summary?.['users']?.[seed.ids.adminUser]?.['name']).toBe('Carlos Almeida');

    await page.goto('/home');
    await expect(page.getByTestId('home-heading')).toBeVisible();
    await new ProfilePage(page).goto();
    await page.getByTestId('profile-notifications-link').click();
    await expect(page).toHaveURL(/\/profile\/notifications$/);
    const item = page.getByTestId('profile-notification-item');
    await expect(item).toHaveCount(1);
    await expect(item).toContainText(TERMS_TITLE);
    await expect(queue.sheet).toHaveCount(0);

    await item.click();
    await expect(page.getByTestId('notification-dialog-title')).toHaveText(TERMS_TITLE);
    await page.getByTestId('notification-dialog-action').click();
    await expect(page.getByTestId('notification-dialog-title')).toBeHidden();

    await signInAs('app_admin');
    await page.goto('/home');
    await expect(queue.sheet).toBeVisible();
    await queue.scrollToBottom();
    await expect(queue.acknowledge).toBeEnabled();
    await queue.acknowledge.click();
    await expect(queue.sheet).toBeHidden();

    await page.goto('/notifications');
    await page.getByTestId('notification-list-item').click();
    await expect(page.getByTestId('notification-acknowledgment-item')).toHaveCount(2);
    await expect(page.getByTestId('notification-acknowledgments-list')).toContainText('Carlos Almeida');
  });

  test('UC-NOTIF-02 — anonymous work links never open the notification queue', async ({ page, seed, db }) => {
    const territory = seed.factories.buildTerritory({ congregationId: seed.ids.congregation });
    const designationTerritory = seed.factories.buildDesignationTerritory({
      id: territory.id,
      congregationId: seed.ids.congregation,
      address: territory.address,
      city: territory.city,
      icon: territory.icon,
      history: [],
    });
    const designation = seed.factories.buildDesignation({
      congregationId: seed.ids.congregation,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      territories: [designationTerritory],
    });
    await seed.write({ territories: [territory], designations: [designation] });
    await db.firestore.collection('notifications').doc('notif-anonymous').set({
      id: 'notif-anonymous',
      title: TERMS_TITLE,
      content: LONG_CONTENT,
      category: 'info',
      actionLabel: 'Entendi',
      status: 'ACTIVE',
      targetRoles: null,
      createdAt: new Date(),
    });

    const workPage = new WorkPage(page);
    await workPage.goto(designation.id);

    await expect(workPage.territoriesHeading).toBeVisible();
    await expect(page.getByTestId('notification-queue')).toHaveCount(0);
  });

  test('UC-NOTIF-03 — a role-targeted notification reaches only the targeted roles', async ({
    signInAs,
    page,
    db,
  }) => {
    await signInAs('app_admin');
    await page.goto('/notifications/new');
    await page.getByTestId('notification-title-input').fill(ELDER_ONLY_TITLE);
    await page.getByTestId('notification-content-input').fill('## Apenas para anciãos.');
    await page.getByTestId('multi-select-chips-option-ELDER').check();
    await expect(page.getByTestId('multi-select-chips-option-ELDER')).toBeChecked();
    await page.getByTestId('notification-publish-button').click();
    await expect(page).toHaveURL(/\/notifications$/);

    const [published] = await db.getCollectionDocs('notifications');
    expect(published?.['targetRoles']).toEqual(['ELDER']);

    await signInAs('elder');
    await page.goto('/home');
    const queue = new NotificationQueuePage(page);
    await expect(queue.sheet).toBeVisible();
    await expect(queue.title).toHaveText(ELDER_ONLY_TITLE);

    // PUBLISHER is useless as a case here: the auth guard confines them to /welcome,
    // so any notification is invisible to them regardless of targeting.
    await signInAs('organizer');
    await page.goto('/home');
    await expect(page.getByTestId('home-heading')).toBeVisible();
    await expect(page.getByTestId('notification-queue')).toHaveCount(0);
  });
});
