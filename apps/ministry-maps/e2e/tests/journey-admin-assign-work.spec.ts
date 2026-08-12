import { expect, test } from '../fixtures';
import { TerritoriesPage } from '../page-objects/territories.page';
import { TerritoryManageDialogPage } from '../page-objects/territory-manage-dialog.page';
import { AssignTerritoriesPage } from '../page-objects/assign-territories.page';
import { WorkPage } from '../page-objects/work.page';
import { WorkItemCompleteDialogPage } from '../page-objects/work-item-complete-dialog.page';
import { captureWhatsAppPopup } from '../utils/whatsapp-link.util';
import { DesignationStatusEnum } from '../../src/models/enums/designation-status';

/** Extract the designation id from a `/work/{id}` share URL. */
function designationIdFromShareUrl(sharedUrl: string): string {
  const idx = sharedUrl.indexOf('/work/');
  return sharedUrl.slice(idx + '/work/'.length);
}

/**
 * J-01 — Admin creates territories, assigns two designations, two publishers work their own links.
 *
 * The app's core value chain: create → assign → receive → complete. Composes
 * UC-TERR-14/15/17 + UC-ASSIGN-09/11/15/16/17/19 + UC-WORK-01/05/07 + UC-AUTH-22.
 *
 * Two anonymous publishers open two different links on the same `page` sequentially
 * (no second browser context needed — `/work/:id` is unguarded and stateless; see
 * `docs/journeys/README.md` §1). The crucial assertion is designation snapshot
 * independence: completing a territory on D1 leaves D2's embedded snapshot PENDING.
 */
test('J-01 — Admin creates + assigns ×2; publishers work their own independent links', async ({
  page,
  signInAs,
  seed,
  db,
}) => {
  const territoriesPage = new TerritoriesPage(page);
  const manageDialog = new TerritoryManageDialogPage(page);
  const assignPage = new AssignTerritoriesPage(page);
  const workPage = new WorkPage(page);
  const completeDialog = new WorkItemCompleteDialogPage(page);

  // ═══════════════════════════════════════════════════════════════════════════
  // Leg 1 — Admin creates two new territories (UC-TERR-14/15/17)
  // ═══════════════════════════════════════════════════════════════════════════
  await signInAs('admin');
  await territoriesPage.goto();

  // UC-TERR-14: only Endereço gates submit. Default city São Paulo is pre-selected.
  await territoriesPage.addButton.click();
  await expect(manageDialog.dialog).toBeVisible();
  await manageDialog.addressInput.fill('Rua Nova Jornada, 10 - Sé');
  await manageDialog.submit();
  await expect(manageDialog.dialog).toHaveCount(0);

  // UC-TERR-15: switching the page city prefills the dialog's Cidade.
  await territoriesPage.selectCity('Osasco');
  await territoriesPage.addButton.click();
  await expect(manageDialog.dialog).toBeVisible();
  await expect(manageDialog.citySelect).toHaveValue('Osasco');
  await manageDialog.addressInput.fill('Rua Via Leve, 22 - Jardim');
  await manageDialog.submit();
  await expect(manageDialog.dialog).toHaveCount(0);

  // ⟶ HAND-OFF (Firestore): positionIndex allocation (UC-TERR-17).
  const spNew = await db.queryWhere(db.collections.territories, 'address', '==', 'Rua Nova Jornada, 10 - Sé');
  expect(spNew).toHaveLength(1);
  expect(spNew[0]['city']).toBe('São Paulo');
  expect(spNew[0]['positionIndex']).toBe(3); // baseline SP max is 2

  const osNew = await db.queryWhere(db.collections.territories, 'address', '==', 'Rua Via Leve, 22 - Jardim');
  expect(osNew).toHaveLength(1);
  expect(osNew[0]['city']).toBe('Osasco');
  expect(osNew[0]['positionIndex']).toBe(2); // baseline Osasco max is 1

  expect(await db.getCollectionDocs(db.collections.territories)).toHaveLength(5);

  // ═══════════════════════════════════════════════════════════════════════════
  // Leg 2 — Admin builds D1 (mixed new + seeded, across cities) (UC-ASSIGN-*)
  // ═══════════════════════════════════════════════════════════════════════════
  await assignPage.goto();
  // UC-ASSIGN-09: ticking ≥1 enables the FAB.
  await assignPage.check('Rua Nova Jornada, 10 - Sé');
  await assignPage.check('Rua das Acácias, 45 - Pinheiros');
  await expect(assignPage.fab).toBeEnabled();
  // UC-ASSIGN-11: selections survive an invisible city switch.
  await assignPage.selectCity('Osasco');
  await assignPage.check('Rua Via Leve, 22 - Jardim');

  const cap1 = await captureWhatsAppPopup(page, () => assignPage.fab.click());
  expect(cap1.whatsappUrl).toContain('whatsapp://send?text=');
  const d1 = designationIdFromShareUrl(cap1.sharedUrl);

  // ⟶ HAND-OFF (Firestore, D1).
  await expect
    .poll(async () => (await db.getDoc(db.collections.designations, d1))?.['congregationId'])
    .toBe(seed.ids.congregation);
  const d1Snap = await db.getDocSnapshot(db.collections.designations, d1);
  const d1Data = d1Snap.data()!;
  expect(d1Data['createdBy']).toBe(seed.ids.adminUser);
  expect(d1Data['settings']['shouldDesignationBlockAfterExpired']).toBe(true);
  const createdAtMs = d1Data['createdAt'].toMillis();
  const expiresAtMs = d1Data['expiresAt'].toMillis();
  expect(expiresAtMs - createdAtMs).toBeGreaterThanOrEqual(7 * 86_400_000 - 5_000);
  expect(expiresAtMs - createdAtMs).toBeLessThanOrEqual(7 * 86_400_000 + 5_000);
  const d1Territories = d1Data['territories'] as Array<Record<string, unknown>>;
  expect(d1Territories).toHaveLength(3);
  // UC-ASSIGN-16: every entry PENDING, has `history`, lacks `recentHistory`.
  for (const t of d1Territories) {
    expect(t['status']).toBe(DesignationStatusEnum.PENDING);
    expect(t['history']).toBeDefined();
    expect(t['recentHistory']).toBeUndefined();
  }
  expect(d1Territories.map((t) => t['address']).sort()).toEqual(
    ['Rua Nova Jornada, 10 - Sé', 'Rua das Acácias, 45 - Pinheiros', 'Rua Via Leve, 22 - Jardim'].sort(),
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Leg 3 — Admin builds D2 with a deliberate overlap (UC-ASSIGN-17)
  // ═══════════════════════════════════════════════════════════════════════════
  // Reload resets the component's assigned Sets → just-assigned territories are tickable again.
  await page.reload();
  await assignPage.goto();
  await assignPage.check('Rua das Acácias, 45 - Pinheiros'); // the overlap
  await assignPage.check('Rua Harmonia, 300 - Vila Madalena');
  const cap2 = await captureWhatsAppPopup(page, () => assignPage.fab.click());
  const d2 = designationIdFromShareUrl(cap2.sharedUrl);

  // ⟶ HAND-OFF (Firestore, D2): independent snapshot.
  const d2Data = (await db.getDoc(db.collections.designations, d2))!;
  const d2TerritoryIds = (d2Data['territories'] as Array<Record<string, unknown>>)
    .map((t) => t['id'])
    .sort();
  expect(d2TerritoryIds).toEqual([seed.ids.territories[0], seed.ids.territories[2]].sort());
  for (const t of d2Data['territories'] as Array<Record<string, unknown>>) {
    expect(t['status']).toBe(DesignationStatusEnum.PENDING);
  }
  expect(await db.getCollectionDocs(db.collections.designations)).toHaveLength(3); // baseline + D1 + D2

  // ═══════════════════════════════════════════════════════════════════════════
  // Leg 4 — Publisher A opens D1 and completes the shared territory (UC-WORK-01/05/07)
  // ═══════════════════════════════════════════════════════════════════════════
  // Switch identity to anonymous — the app navigates itself to /login (UC-AUTH-22).
  await page.evaluate(() => (window as any).__E2E__.auth.signOut());
  await expect(page).toHaveURL(/\/login/);

  await workPage.goto(d1);
  await expect(workPage.loading).toBeHidden();

  // UC-WORK-01: exactly D1's three addresses render, not D2's Rua Harmonia.
  await expect(workPage.itemByAddress('Rua Nova Jornada, 10 - Sé')).toBeVisible();
  await expect(workPage.itemByAddress('Rua das Acácias, 45 - Pinheiros')).toBeVisible();
  await expect(workPage.itemByAddress('Rua Via Leve, 22 - Jardim')).toBeVisible();
  await expect(workPage.itemByAddress('Rua Harmonia, 300 - Vila Madalena')).toHaveCount(0);

  // UC-WORK-07: complete the shared territory with the default SPOKE outcome.
  await workPage.itemByAddress('Rua das Acácias, 45 - Pinheiros').getByTestId('work-item-checkbox').click();
  await expect(completeDialog.dialog).toBeVisible();
  await completeDialog.submit();

  await expect(workPage.completedList.filter({ hasText: 'Rua das Acácias, 45 - Pinheiros' })).toBeVisible();

  // ⟶ HAND-OFF (Firestore, fire-and-forget): D1's shared entry DONE, D2's still PENDING.
  await expect
    .poll(async () => {
      const doc = await db.getDoc(db.collections.designations, d1);
      const entry = (doc?.['territories'] as Array<Record<string, unknown>>).find(
        (t) => t['id'] === seed.ids.territories[0],
      );
      return entry?.['status'];
    })
    .toBe(DesignationStatusEnum.DONE);

  const d1TerritoriesAfter = (
    (await db.getDoc(db.collections.designations, d1))!['territories'] as Array<Record<string, unknown>>
  );
  const d1OtherStatuses = d1TerritoriesAfter
    .filter((t) => t['id'] !== seed.ids.territories[0])
    .map((t) => t['status'] as string);
  expect(d1OtherStatuses.every((s: string) => s === DesignationStatusEnum.PENDING)).toBe(true);

  // UC-ASSIGN-17/UC-WORK-05: D2's snapshot of the SAME territory is still PENDING.
  const d2SharedStatus = (
    (await db.getDoc(db.collections.designations, d2))!['territories'] as Array<Record<string, unknown>>
  ).find((t) => t['id'] === seed.ids.territories[0])?.['status'];
  expect(d2SharedStatus).toBe(DesignationStatusEnum.PENDING);

  // seed-territory-1 history subcollection grew from 2 → 3 (only D1 added one).
  await expect
    .poll(
      async () =>
        (await db.getSubcollectionDocs(db.collections.territories, seed.ids.territories[0], db.historySubcollection))
          .length,
    )
    .toBe(3);
  const t1History = await db.getSubcollectionDocs(
    db.collections.territories,
    seed.ids.territories[0],
    db.historySubcollection,
  );
  const newest = t1History
    .map((h) => (h['date'] as { toMillis: () => number }).toMillis())
    .reduce((max, v) => Math.max(max, v), 0);
  const newestDoc = t1History.find((h) => (h['date'] as { toMillis: () => number }).toMillis() === newest)!;
  expect(newestDoc['visitOutcome']).toBe(0); // SPOKE
  expect(newestDoc['isRevisit']).toBe(false);
  expect((await db.getDoc(db.collections.territories, seed.ids.territories[0]))?.['lastVisit']).toBeTruthy();

  // ═══════════════════════════════════════════════════════════════════════════
  // Leg 5 — Publisher B opens D2 (still anonymous — a second person opening their own link)
  // ═══════════════════════════════════════════════════════════════════════════
  await workPage.goto(d2);
  await expect(workPage.loading).toBeHidden();

  // UC-WORK-01: exactly D2's two addresses render, none of D1's new territories.
  await expect(workPage.itemByAddress('Rua das Acácias, 45 - Pinheiros')).toBeVisible();
  await expect(workPage.itemByAddress('Rua Harmonia, 300 - Vila Madalena')).toBeVisible();
  await expect(workPage.itemByAddress('Rua Nova Jornada, 10 - Sé')).toHaveCount(0);
  await expect(workPage.itemByAddress('Rua Via Leve, 22 - Jardim')).toHaveCount(0);

  // UC-WORK-05: the shared territory renders here as PENDING with an enabled checkbox,
  // even though the same physical territory was completed on D1 — D2's snapshot was frozen.
  const sharedRow = workPage.itemByAddress('Rua das Acácias, 45 - Pinheiros');
  await expect(sharedRow.getByTestId('work-item-checkbox')).toBeEnabled();
  await expect(sharedRow.getByTestId('work-item-checkbox')).not.toBeChecked();

  // ── FINAL SWEEP (Firestore) ────────────────────────────────────────────────
  const finalD1 = (await db.getDoc(db.collections.designations, d1))!['territories'] as Array<
    Record<string, unknown>
  >;
  const d1Done = finalD1.filter((t) => t['status'] === DesignationStatusEnum.DONE);
  const d1Pending = finalD1.filter((t) => t['status'] === DesignationStatusEnum.PENDING);
  expect(d1Done).toHaveLength(1);
  expect(d1Pending).toHaveLength(2);

  const finalD2 = (await db.getDoc(db.collections.designations, d2))!['territories'] as Array<
    Record<string, unknown>
  >;
  expect(finalD2.every((t) => t['status'] === DesignationStatusEnum.PENDING)).toBe(true);

  expect(await db.getCollectionDocs(db.collections.designations)).toHaveLength(3); // baseline untouched
  expect(
    await db.getSubcollectionDocs(db.collections.territories, seed.ids.territories[0], db.historySubcollection),
  ).toHaveLength(3); // the one new visit came only from D1
});
