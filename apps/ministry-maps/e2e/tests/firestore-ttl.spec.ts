import { expect, test } from '../fixtures';
import { AssignTerritoriesPage } from '../page-objects/assign-territories.page';
import { captureWhatsAppPopup } from '../utils/whatsapp-link.util';

/** Extract the designation id from a `/work/{id}` share URL. */
function designationIdFromShareUrl(sharedUrl: string): string {
  const idx = sharedUrl.indexOf('/work/');
  return sharedUrl.slice(idx + '/work/'.length);
}

const EXPECTED_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const TIME_TOLERANCE_MS = 5 * 60 * 1000; // 5-minute slack

test.describe('Firestore TTL Retention', () => {
  test('UC-TTL-01 — Designation creation sets 180-day expireAt TTL timestamp', async ({ page, signInAs, seed, db }) => {
    await signInAs('admin');

    const assignPage = new AssignTerritoriesPage(page);
    await assignPage.goto();

    await assignPage.check('Rua das Acácias, 45 - Pinheiros');
    await expect(assignPage.fab).toBeEnabled();

    const capture = await captureWhatsAppPopup(page, () => assignPage.fab.click());
    const designationId = designationIdFromShareUrl(capture.sharedUrl);

    // Wait for the designation document to be persisted
    await expect
      .poll(async () => (await db.getDoc(db.collections.designations, designationId))?.['congregationId'])
      .toBe(seed.ids.congregation);

    const snapshot = await db.getDocSnapshot(db.collections.designations, designationId);
    const data = snapshot.data();
    expect(data).toBeDefined();

    const createdAt = data?.['createdAt'];
    const expireAt = data?.['expireAt'];

    expect(createdAt).toBeDefined();
    expect(expireAt).toBeDefined();

    // Verify both are Timestamps
    expect(typeof createdAt.toMillis).toBe('function');
    expect(typeof expireAt.toMillis).toBe('function');

    const diffMs = expireAt.toMillis() - createdAt.toMillis();
    expect(diffMs).toBeGreaterThanOrEqual(EXPECTED_TTL_MS - TIME_TOLERANCE_MS);
    expect(diffMs).toBeLessThanOrEqual(EXPECTED_TTL_MS + TIME_TOLERANCE_MS);
  });

  test('UC-TTL-02 — Client log creation sets 180-day expireAt TTL timestamp', async ({ page, signInAs, db }) => {
    await signInAs('admin');

    const assignPage = new AssignTerritoriesPage(page);
    await assignPage.goto();

    await assignPage.check('Rua das Acácias, 45 - Pinheiros');
    await expect(assignPage.fab).toBeEnabled();

    const capture = await captureWhatsAppPopup(page, () => assignPage.fab.click());
    const designationId = designationIdFromShareUrl(capture.sharedUrl);

    // TerritoryBO.createDesignationForTerritories triggers loggerService.info on success
    await expect
      .poll(async () => {
        const logs = await db.getCollectionDocs(db.collections.logs);
        return logs.find((log) =>
          (log['message'] as string | undefined)?.includes(`created Designation [${designationId}]`)
        );
      })
      .toBeDefined();

    const logs = await db.getCollectionDocs(db.collections.logs);
    const matchingLog = logs.find((log) =>
      (log['message'] as string | undefined)?.includes(`created Designation [${designationId}]`)
    );
    expect(matchingLog).toBeDefined();

    const timestamp = matchingLog?.['timestamp'];
    const expireAt = matchingLog?.['expireAt'];

    expect(timestamp).toBeDefined();
    expect(expireAt).toBeDefined();

    expect(typeof timestamp.toMillis).toBe('function');
    expect(typeof expireAt.toMillis).toBe('function');

    const diffMs = expireAt.toMillis() - timestamp.toMillis();
    expect(diffMs).toBeGreaterThanOrEqual(EXPECTED_TTL_MS - TIME_TOLERANCE_MS);
    expect(diffMs).toBeLessThanOrEqual(EXPECTED_TTL_MS + TIME_TOLERANCE_MS);
  });
});
