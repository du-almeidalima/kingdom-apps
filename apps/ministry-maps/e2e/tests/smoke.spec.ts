import { DocumentReference, Timestamp } from 'firebase-admin/firestore';

import { TerritoryIcon } from '../../src/models/territory';
import { expect, test } from '../fixtures';

test.describe('E2E seeding smoke test', () => {
  test('renders the Login screen against the seeded emulator', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('Login');
  });

  test('applies the default baseline to Firestore before each test', async ({ db }) => {
    const congregations = await db.getCollectionDocs(db.collections.congregations);
    const users = await db.getCollectionDocs(db.collections.users);
    const territories = await db.getCollectionDocs(db.collections.territories);
    const designations = await db.getCollectionDocs(db.collections.designations);

    expect(congregations).toHaveLength(1);
    // 8 users: 1 ADMIN + 3 PUBLISHERs + 1 each of ELDER / ORGANIZER / SUPERINTENDENT / APP_ADMIN.
    expect(users).toHaveLength(8);
    expect(territories).toHaveLength(3);
    expect(designations).toHaveLength(1);
  });

  test('seeds users with a congregation DocumentReference', async ({ db, seed }) => {
    const snapshot = await db.getDocSnapshot(db.collections.users, seed.ids.adminUser);
    const data = snapshot.data();

    expect(data).toBeDefined();
    expect(data?.['congregation']).toBeInstanceOf(DocumentReference);
    expect((data?.['congregation'] as DocumentReference).path).toBe(
      `${db.collections.congregations}/${seed.ids.congregation}`,
    );
  });

  test('seeds territory dates as Firestore Timestamps and a history subcollection', async ({ db, seed }) => {
    const territoryId = seed.ids.territories[0];
    const snapshot = await db.getDocSnapshot(db.collections.territories, territoryId);
    const data = snapshot.data();

    expect(data?.['lastVisit']).toBeInstanceOf(Timestamp);
    expect(Array.isArray(data?.['recentHistory'])).toBe(true);

    const history = await db.getSubcollectionDocs(db.collections.territories, territoryId, db.historySubcollection);
    expect(history).toHaveLength(2);
    expect(history[0]?.['date']).toBeInstanceOf(Timestamp);
  });

  test('creates matching Auth users keyed by the Firestore doc id', async ({ db, seed }) => {
    const authUser = await db.auth.getUser(seed.ids.adminUser);

    expect(authUser.uid).toBe(seed.ids.adminUser);
    expect(authUser.email).toBe('carlos.almeida@example.com');
  });

  test('supports on-demand factory overrides and reads them back', async ({ db, seed }) => {
    const extraTerritory = seed.factories.buildTerritory({
      congregationId: seed.ids.congregation,
      city: 'Campinas',
      address: 'Rua Inventada, 999',
      icon: TerritoryIcon.OTHER,
    });

    await seed.write({ territories: [extraTerritory] });

    const stored = await db.getDoc(db.collections.territories, extraTerritory.id);
    expect(stored?.['city']).toBe('Campinas');
    expect(stored?.['icon']).toBe(TerritoryIcon.OTHER);

    const territories = await db.getCollectionDocs(db.collections.territories);
    expect(territories).toHaveLength(4);
  });
});
