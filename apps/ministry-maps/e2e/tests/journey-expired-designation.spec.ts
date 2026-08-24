import { expect, test } from '../fixtures';
import { WorkPage } from '../page-objects/work.page';
import { DesignationStatusEnum } from '../../src/models/enums/designation-status';

/**
 * J-06 — Expired designation: blocking vs non-blocking settings, and what
 * actually stays disabled.
 *
 * Composes UC-WORK-01/19/20/21 + UC-ASSIGN-13. The two `shouldDesignationBlockAfterExpired`
 * modes look almost identical in the UI (the only observable difference is the
 * maps button's disabled state); this journey pins down today's (counter-intuitive)
 * reality: the checkbox stays disabled in *both* modes (⚠ suspected defect —
 * UC-WORK-21), and only the maps button responds to the blocking flag.
 *
 * Seed block is copied from `docs/journeys/j-06-expired-designation.md`. The
 * designation snapshots are given a `mapsLink` (copied from the territory) so
 * leg 2's maps-button assertion is exercisable — the journey doc notes leg 2
 * needs the maps link.
 */
test('J-06 — Expired designation: blocking disables everything; non-blocking still disables the checkbox (⚠ defect)', async ({
  page,
  seed,
  db,
}) => {
  const mapsLink = 'https://maps.google.com/?q=-23.589,-46.634';

  // ── Seed: two long-expired designations over two real territories ──────────
  const tBlocked = seed.factories.buildTerritory({
    id: 'j06-t-blocked',
    congregationId: seed.ids.congregation,
    city: 'São Paulo',
    history: [],
  });
  const tOpen = seed.factories.buildTerritory({
    id: 'j06-t-open',
    congregationId: seed.ids.congregation,
    city: 'São Paulo',
    history: [],
  });
  await seed.write({
    territories: [tBlocked, tOpen],
    designations: [
      seed.factories.buildDesignation({
        id: 'j06-d-blocked',
        congregationId: seed.ids.congregation,
        createdBy: seed.ids.adminUser,
        expiresAt: new Date('2020-01-01'), // long expired
        settings: { shouldDesignationBlockAfterExpired: true },
        territories: [
          seed.factories.buildDesignationTerritory({
            id: 'j06-t-blocked',
            congregationId: seed.ids.congregation,
            address: tBlocked.address,
            mapsLink,
            history: [],
          }),
        ],
      }),
      seed.factories.buildDesignation({
        id: 'j06-d-nonblocking',
        congregationId: seed.ids.congregation,
        createdBy: seed.ids.adminUser,
        expiresAt: new Date('2020-01-01'),
        settings: { shouldDesignationBlockAfterExpired: false },
        territories: [
          seed.factories.buildDesignationTerritory({
            id: 'j06-t-open',
            congregationId: seed.ids.congregation,
            address: tOpen.address,
            mapsLink,
            history: [],
          }),
        ],
      }),
    ],
  });

  const workPage = new WorkPage(page);

  // ── Leg 1 — Expired + blocking: every action is blocked (UC-WORK-20) ───────
  // UC-WORK-01
  await workPage.goto('j06-d-blocked');
  await expect(workPage.loading).toBeHidden();

  // UC-WORK-20: exact disabled note.
  await expect(workPage.expiredNote).toBeVisible();
  await expect(workPage.expiredNote).toHaveText(
    'Essa designação está desabilitada. Por favor peça ao seu SG uma designação nova.',
  );

  // UC-WORK-19/20: checkbox + maps both disabled (isBlocked = isDisabled && setting).
  const blockedRow = workPage.itemByAddress(tBlocked.address);
  await expect(blockedRow.getByTestId('work-item-checkbox')).toBeDisabled();
  await expect(blockedRow.getByTestId('work-item-maps')).toBeDisabled();

  // ⟶ HAND-OFF (Firestore): no write occurred.
  expect(
    await db.getSubcollectionDocs(db.collections.territories, 'j06-t-blocked', db.historySubcollection),
  ).toHaveLength(0);
  expect((await db.getDoc(db.collections.designations, 'j06-d-blocked'))?.['territories'][0]['status']).toBe(
    DesignationStatusEnum.PENDING,
  );

  // ── Leg 2 — Expired + non-blocking: ⚠ checkbox STILL disabled; only maps usable (UC-WORK-21) ──
  await workPage.goto('j06-d-nonblocking');
  await expect(workPage.loading).toBeHidden();

  // ⚠ Same note renders — `@if (isDisabled)` checks expiry alone, not the setting.
  await expect(workPage.expiredNote).toBeVisible();
  await expect(workPage.expiredNote).toHaveText(
    'Essa designação está desabilitada. Por favor peça ao seu SG uma designação nova.',
  );

  const openRow = workPage.itemByAddress(tOpen.address);
  // ⚠ DEFECT: checkbox bound to `isDisabled` (expiry), NOT `isBlocked` — stays disabled.
  await expect(openRow.getByTestId('work-item-checkbox')).toBeDisabled();
  // The maps button alone binds to `isBlocked` (false here) → the only enabled action.
  const openMaps = openRow.getByTestId('work-item-maps');
  await expect(openMaps).toBeVisible();
  await expect(openMaps).toBeEnabled();

  // ⟶ HAND-OFF (Firestore): no write occurred.
  expect(await db.getSubcollectionDocs(db.collections.territories, 'j06-t-open', db.historySubcollection)).toHaveLength(
    0,
  );
  expect((await db.getDoc(db.collections.designations, 'j06-d-nonblocking'))?.['territories'][0]['status']).toBe(
    DesignationStatusEnum.PENDING,
  );

  // ── FINAL SWEEP (Firestore) ────────────────────────────────────────────────
  // Both j06 territories: empty history subcollections, null lastVisit, fully PENDING.
  for (const tid of ['j06-t-blocked', 'j06-t-open']) {
    expect(await db.getSubcollectionDocs(db.collections.territories, tid, db.historySubcollection)).toHaveLength(0);
    expect((await db.getDoc(db.collections.territories, tid))?.['lastVisit']).toBeNull();
  }
  const blockedDoc = await db.getDoc(db.collections.designations, 'j06-d-blocked');
  const openDoc = await db.getDoc(db.collections.designations, 'j06-d-nonblocking');
  expect(blockedDoc?.['territories'][0]['status']).toBe(DesignationStatusEnum.PENDING);
  expect(openDoc?.['territories'][0]['status']).toBe(DesignationStatusEnum.PENDING);
  // The only UI-observable difference between the two modes was the maps button's disabled state.
});
