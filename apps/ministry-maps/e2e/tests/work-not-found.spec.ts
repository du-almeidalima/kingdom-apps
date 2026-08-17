import { expect, test } from '../fixtures';
import { WorkPage } from '../page-objects/work.page';

test.describe('Work designation not-found screen', () => {
  test('UC-WORK-24 — Non-existent designation id renders not-found screen', async ({ page }) => {
    const workPage = new WorkPage(page);
    const nonExistentId = `non-existent-${Math.random().toString(36).slice(2, 10)}`;

    await workPage.goto(nonExistentId);

    await expect(workPage.notFound).toBeVisible();
    await expect(workPage.notFoundHeading).toHaveText('Designação não encontrada');
    await expect(workPage.notFound).toContainText(
      'Não foi possível encontrar esta designação. Ela pode ter expirado ou ter sido removida.',
    );
    await expect(workPage.notFound).toContainText(
      'Por favor, entre em contato com o Superintendente de Grupo (SG) da sua congregação para solicitar uma nova designação.',
    );
    await expect(workPage.territoriesHeading).toBeHidden();
    await expect(workPage.completedHeading).toBeHidden();
  });

  test('J-09 — TTL-purged designation renders designation not-found screen on subsequent access', async ({
    page,
    seed,
    db,
  }) => {
    const designationId = `d-ttl-${Math.random().toString(36).slice(2, 10)}`;
    const territory = seed.factories.buildTerritory({
      congregationId: seed.ids.congregation,
      address: 'Rua do TTL, 500',
      city: 'São Paulo',
      history: [],
    });
    const designationTerritory = seed.factories.buildDesignationTerritory({
      id: territory.id,
      congregationId: seed.ids.congregation,
      address: territory.address,
      city: territory.city,
      history: [],
    });
    const designation = seed.factories.buildDesignation({
      id: designationId,
      congregationId: seed.ids.congregation,
      territories: [designationTerritory],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await seed.write({
      territories: [territory],
      designations: [designation],
    });

    const workPage = new WorkPage(page);

    // 1. Initial anonymous access: active designation renders normally
    await workPage.goto(designationId);
    await expect(workPage.loading).toBeHidden();
    await expect(workPage.territoriesHeading).toBeVisible();
    await expect(workPage.itemByAddress('Rua do TTL, 500')).toBeVisible();
    await expect(workPage.notFound).toBeHidden();

    // 2. Simulate Firestore TTL deletion by removing the designation document via Admin SDK
    await db.firestore.collection(db.collections.designations).doc(designationId).delete();

    // 3. Re-navigate to the same link: not-found screen renders
    await workPage.goto(designationId);
    await expect(workPage.notFound).toBeVisible();
    await expect(workPage.notFoundHeading).toHaveText('Designação não encontrada');
    await expect(workPage.notFound).toContainText(
      'Não foi possível encontrar esta designação. Ela pode ter expirado ou ter sido removida.',
    );
    await expect(workPage.notFound).toContainText(
      'Por favor, entre em contato com o Superintendente de Grupo (SG) da sua congregação para solicitar uma nova designação.',
    );
    await expect(workPage.territoriesHeading).toBeHidden();
  });
});
