import { expect, test } from '../fixtures';
import { AssignTerritoriesPage } from '../page-objects/assign-territories.page';
import { SortFilterDialogPage } from '../page-objects/sort-filter-dialog.page';
import { ConfirmDialogPage } from '../page-objects/confirm-dialog.page';
import { captureWhatsAppPopup, recordedOpenUrls, recordWindowOpen } from '../utils/whatsapp-link.util';
import * as firebaseAdmin from 'firebase-admin';
import { RoleEnum } from '../../src/models/enums/role';
import { VisitOutcomeEnum } from '../../src/models/enums/visit-outcome';
import { expectData } from '../utils/firestore-assert.util';

/** Extract the designation id from a `/work/{id}` share URL. */
function designationIdFromShareUrl(sharedUrl: string): string {
  const idx = sharedUrl.indexOf('/work/');
  return sharedUrl.slice(idx + '/work/'.length);
}

// ─── WP-18: assign listing & selection ────────────────────────────────────────

test.describe('Assign territories — listing & selection (WP-18)', () => {
  test.use({ role: 'admin' });

  test('UC-ASSIGN-01 — page renders for an authorised user: per-city list, default order, disabled submit', async ({
    authenticatedPage,
    db,
  }) => {
    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();

    await expect(assignPage.heading).toHaveText('Designar Território');
    // City pre-selected to the first city (São Paulo).
    await expect(assignPage.cityFilter).toHaveValue('São Paulo');

    // Two São Paulo territories ordered by positionIndex (0 before 2).
    await expect(assignPage.checkboxes).toHaveCount(2);
    await expect(assignPage.checkboxByAddress('Rua das Acácias, 45 - Pinheiros')).toBeVisible();
    await expect(assignPage.checkboxByAddress('Rua Harmonia, 300 - Vila Madalena')).toBeVisible();
    // The two checkbox rows render in positionIndex order.
    await expect(assignPage.checkboxes.nth(0)).toContainText('Rua das Acácias, 45 - Pinheiros');

    // FAB renders disabled (no selection).
    await expect(assignPage.fab).toBeDisabled();

    expect((await db.getDoc(db.collections.territories, 'seed-territory-1'))?.['positionIndex']).toBe(0);
    expect((await db.getDoc(db.collections.territories, 'seed-territory-3'))?.['positionIndex']).toBe(2);
    // No designation created.
    expect(await db.getCollectionDocs(db.collections.designations)).toHaveLength(1);
  });

  test('UC-ASSIGN-02 — city select mirrors congregation.cities; "Todas" is last and alphabetical', async ({
    authenticatedPage,
    db,
  }) => {
    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();

    const options = await assignPage.cityFilter.locator('option').allTextContents();
    expect(options).toEqual(['São Paulo', 'Osasco', 'Todas']);

    // Selecting Osasco shows only its single territory.
    await assignPage.selectCity('Osasco');
    await expect(assignPage.checkboxes).toHaveCount(1);
    await expect(assignPage.checkboxByAddress('Av. dos Autonomistas, 1200 - Centro')).toBeVisible();

    // "Todas" sorts alphabetically by city → Osasco's territory first.
    await assignPage.showAllCities();
    await expect(assignPage.checkboxes).toHaveCount(3);
    await expect(assignPage.checkboxes.nth(0)).toContainText('Av. dos Autonomistas, 1200 - Centro');

    expect((await db.getDoc(db.collections.congregations, 'seed-congregation'))?.['cities']).toEqual([
      'São Paulo',
      'Osasco',
    ]);
  });

  test('UC-ASSIGN-03 — zero-territory congregation: renders, cannot submit', async ({
    seed,
    signInAsUser,
    db,
    page,
  }) => {
    const congregation = seed.factories.buildCongregation({ cities: ['São Paulo'] });
    const admin = seed.factories.buildUser({
      role: RoleEnum.ADMIN,
      congregationId: congregation.id,
    });
    await seed.write({ congregations: [congregation], users: [admin] });

    await signInAsUser(admin.id);
    const assignPage = new AssignTerritoriesPage(page);
    await assignPage.goto();

    // Page renders without crashing; zero rows; FAB permanently disabled.
    await expect(assignPage.heading).toBeVisible();
    await expect(assignPage.checkboxes).toHaveCount(0);
    await expect(assignPage.fab).toBeDisabled();

    // Persistence: new congregation has no territories and no new designation.
    expect(await db.queryWhere(db.collections.territories, 'congregationId', '==', congregation.id)).toHaveLength(0);
    expect(await db.getCollectionDocs(db.collections.designations)).toHaveLength(1);
  });

  // Known low-priority defect: an empty cities array is not a common production data shape.
  test('UC-ASSIGN-04 — empty `cities` collapses selection (⚠ defect)', async ({ seed, signInAsUser, db, page }) => {
    const congregation = seed.factories.buildCongregation({ cities: [] });
    const admin = seed.factories.buildUser({
      role: RoleEnum.ADMIN,
      congregationId: congregation.id,
    });
    await seed.write({ congregations: [congregation], users: [admin] });

    await signInAsUser(admin.id);
    const assignPage = new AssignTerritoriesPage(page);
    await assignPage.goto();

    // ⚠ Same buggy ternary as /territories: cities.length>=0 → undefined selectedCity,
    // the filter observable errors, and no checkbox rows render. The list container
    // and heading still render (unlike /territories, whose whole page collapses),
    // but the city select only exposes the synthetic `Todas` option and the FAB is
    // permanently disabled since nothing can be ticked.
    await expect(assignPage.heading).toBeVisible();
    await expect(assignPage.checkboxes).toHaveCount(0);
    const options = await assignPage.cityFilter.locator('option').allTextContents();
    expect(options).toEqual(['Todas']);
    await expect(assignPage.fab).toBeDisabled();

    expect((await db.getDoc(db.collections.congregations, congregation.id))?.['cities']).toEqual([]);
    expect(await db.getCollectionDocs(db.collections.designations)).toHaveLength(1);
  });

  test('UC-ASSIGN-05 — search narrows the checkbox list', async ({ authenticatedPage, db }) => {
    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();

    await assignPage.search('acácias');
    await expect(assignPage.checkboxes).toHaveCount(1);
    await expect(assignPage.checkboxByAddress('Rua das Acácias, 45 - Pinheiros')).toBeVisible();

    // Clearing restores both São Paulo territories.
    await assignPage.search('');
    await expect(assignPage.checkboxes).toHaveCount(2);

    expect((await db.getDoc(db.collections.territories, 'seed-territory-1'))?.['address']).toBe(
      'Rua das Acácias, 45 - Pinheiros',
    );
  });

  test('UC-ASSIGN-06 — "Estudantes da Bíblia" toggle gates bible-student territories from selection', async ({
    authenticatedPage,
    db,
  }) => {
    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();

    // Both São Paulo territories listed by default.
    await expect(assignPage.checkboxes).toHaveCount(2);

    const sortFilter = new SortFilterDialogPage(authenticatedPage);
    await sortFilter.open();
    await sortFilter.toggleByTitle('Estudantes da Bíblia');
    await sortFilter.apply();

    // Bible-student territory disappears entirely (cannot be selected).
    await expect(assignPage.checkboxByAddress('Rua Harmonia, 300 - Vila Madalena')).toHaveCount(0);
    await expect(assignPage.checkboxes).toHaveCount(1);

    expect((await db.getDoc(db.collections.territories, 'seed-territory-3'))?.['isBibleStudent']).toBe(true);
  });

  test('UC-ASSIGN-07 — moved territory → "Se Mudou" confirm', async ({ authenticatedPage, seed, db }) => {
    const moved = seed.factories.buildTerritory({
      congregationId: seed.ids.congregation,
      city: 'São Paulo',
      address: 'Rua do Mudado, 50',
      note: 'Se mudou.',
      history: [
        seed.factories.buildVisitHistory({
          visitOutcome: VisitOutcomeEnum.MOVED,
          isResolved: false,
          date: new Date(),
          notes: 'Vazia.',
        }),
      ],
    });
    await seed.write({ territories: [moved] });

    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();

    // Reveal the moved territory via the toggle.
    const sortFilter = new SortFilterDialogPage(authenticatedPage);
    await sortFilter.open();
    await sortFilter.toggleByTitle('Territórios que Mudaram');
    await sortFilter.apply();

    await assignPage.check('Rua do Mudado, 50');

    // ConfirmDialog titled "Se Mudou".
    const confirm = new ConfirmDialogPage(authenticatedPage);
    await expect(confirm.dialog).toBeVisible();
    await expect(confirm.title).toHaveText('Se Mudou');
    await expect(
      authenticatedPage.getByText('Um publicador recentemente relatou que esse morador se mudou.'),
    ).toBeVisible();
    await expect(authenticatedPage.getByText('Você deseja designar esse território mesmo assim?')).toBeVisible();
    await confirm.confirm();

    // Confirming keeps the checkbox ticked.
    await expect(assignPage.fab).toBeEnabled();

    const stored = await db.getDoc(db.collections.territories, moved.id);
    const rh = stored?.['recentHistory'] as Array<Record<string, unknown>>;
    expect(rh.some((h) => h['visitOutcome'] === VisitOutcomeEnum.MOVED && h['isResolved'] === false)).toBe(true);
  });

  test('UC-ASSIGN-08 — no-visit territory → "Não visitar" confirm', async ({ authenticatedPage, seed, db }) => {
    const tenMonthsAgo = new Date();
    tenMonthsAgo.setMonth(tenMonthsAgo.getMonth() - 10);
    const stopVisit = seed.factories.buildTerritory({
      congregationId: seed.ids.congregation,
      city: 'São Paulo',
      address: 'Rua do Recusa, 11',
      note: 'Recusa.',
      history: [
        seed.factories.buildVisitHistory({
          visitOutcome: VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN,
          isResolved: false,
          date: tenMonthsAgo,
          notes: 'Não voltar.',
        }),
      ],
    });
    await seed.write({ territories: [stopVisit] });

    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();
    await assignPage.check('Rua do Recusa, 11');

    const confirm = new ConfirmDialogPage(authenticatedPage);
    await expect(confirm.dialog).toBeVisible();
    await expect(confirm.title).toHaveText('Não visitar');
    await expect(
      authenticatedPage.getByText(
        'Esse morador pediu para não ser visitado por uma Testemunha de Jeová recentemente dentro dos últimos dois anos.',
      ),
    ).toBeVisible();
    await expect(authenticatedPage.getByText('Você deseja designar esse território mesmo assim?')).toBeVisible();

    const stored = await db.getDoc(db.collections.territories, stopVisit.id);
    const rh = stored?.['recentHistory'] as Array<Record<string, unknown>>;
    expect(
      rh.some((h) => h['visitOutcome'] === VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN && h['isResolved'] === false),
    ).toBe(true);
  });

  test('UC-ASSIGN-09 — ticking/unticking toggles the submit disabled state', async ({ authenticatedPage, db }) => {
    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();

    await expect(assignPage.fab).toBeDisabled();
    await assignPage.check('Rua das Acácias, 45 - Pinheiros');
    await expect(assignPage.fab).toBeEnabled();
    // Untick → disabled again.
    await assignPage.check('Rua das Acácias, 45 - Pinheiros');
    await expect(assignPage.fab).toBeDisabled();

    // Pure client state — no designation written.
    expect(await db.getCollectionDocs(db.collections.designations)).toHaveLength(1);
  });

  test('UC-ASSIGN-10 — declining the moved confirmation reverts the checkbox to unchecked', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    const moved = seed.factories.buildTerritory({
      congregationId: seed.ids.congregation,
      city: 'São Paulo',
      address: 'Rua do Mudado, 50',
      note: 'Se mudou.',
      history: [
        seed.factories.buildVisitHistory({
          visitOutcome: VisitOutcomeEnum.MOVED,
          isResolved: false,
          date: new Date(),
          notes: 'Vazia.',
        }),
      ],
    });
    await seed.write({ territories: [moved] });

    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();
    const sortFilter = new SortFilterDialogPage(authenticatedPage);
    await sortFilter.open();
    await sortFilter.toggleByTitle('Territórios que Mudaram');
    await sortFilter.apply();

    await assignPage.check('Rua do Mudado, 50');
    const confirm = new ConfirmDialogPage(authenticatedPage);
    await expect(confirm.dialog).toBeVisible();
    // Cancel → checkbox reverts to unchecked.
    await confirm.cancel();
    await expect.poll(() => assignPage.isChecked('Rua do Mudado, 50')).toBe(false);
    // FAB disabled (selection reverted).
    await expect(assignPage.fab).toBeDisabled();

    expect(await db.getCollectionDocs(db.collections.designations)).toHaveLength(1);
  });

  test('UC-ASSIGN-11 — selections persist across city switches (invisibly)', async ({ authenticatedPage }) => {
    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();

    // Tick a São Paulo territory.
    await assignPage.check('Rua das Acácias, 45 - Pinheiros');
    await expect(assignPage.fab).toBeEnabled();

    // Switch to Osasco and tick its territory; FAB stays enabled throughout.
    await assignPage.selectCity('Osasco');
    await assignPage.check('Av. dos Autonomistas, 1200 - Centro');
    await expect(assignPage.fab).toBeEnabled();

    // Switch back to São Paulo — the original selection is still ticked.
    await assignPage.selectCity('São Paulo');
    await expect.poll(() => assignPage.isChecked('Rua das Acácias, 45 - Pinheiros')).toBe(true);
  });
});

// ─── WP-19: assign creation & share ───────────────────────────────────────────

test.describe('Assign territories — creation & share (WP-19)', () => {
  test.use({ role: 'admin' });

  // UC-ASSIGN-12 previously locked the absence of a selected-count UI; the FAB
  // badge (fab-badge testid) now provides it.
  test('UC-ASSIGN-12 — FAB badge counts the selected territories across city switches', async ({
    authenticatedPage,
    db,
  }) => {
    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();

    // No badge while nothing is selected — the FAB carries no digit.
    await expect(assignPage.selectedCount).toHaveCount(0);

    // Tick 2 territories across 2 different cities (UC-ASSIGN-11's cross-city accumulation).
    await assignPage.check('Rua das Acácias, 45 - Pinheiros');
    await expect(assignPage.selectedCount).toHaveText('1');
    await assignPage.selectCity('Osasco');
    await assignPage.check('Av. dos Autonomistas, 1200 - Centro');
    await expect(assignPage.selectedCount).toHaveText('2');

    // Submitting resets the count (badge hidden, FAB disabled again).
    const { sharedUrl } = await captureWhatsAppPopup(authenticatedPage, () => assignPage.fab.click());
    expect(sharedUrl).toContain('/work/');
    await expect(assignPage.selectedCount).toHaveCount(0);
    await expect(assignPage.fab).toBeDisabled();

    // One new designation holding both territories.
    expect(await db.getCollectionDocs(db.collections.designations)).toHaveLength(2);
  });

  test('UC-ASSIGN-13 — `expiresAt` is createdAt plus 7 days, in raw milliseconds', async ({
    authenticatedPage,
    db,
  }) => {
    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();
    await assignPage.check('Rua das Acácias, 45 - Pinheiros');

    const beforeMs = Date.now();
    const { sharedUrl } = await captureWhatsAppPopup(authenticatedPage, () => assignPage.fab.click());
    const designationId = designationIdFromShareUrl(sharedUrl);

    // expiresAt ≈ createdAt + 7 days (raw ms, no day-boundary truncation).
    await expect(async () => {
      const snap = await db.getDocSnapshot(db.collections.designations, designationId);
      const data = expectData(snap.data());
      const createdAt = data['createdAt'].toMillis();
      const expiresAt = data['expiresAt'].toMillis();
      expect(expiresAt - createdAt).toBeGreaterThanOrEqual(7 * 86_400_000 - 5_000);
      expect(expiresAt - createdAt).toBeLessThanOrEqual(7 * 86_400_000 + 5_000);
      // Sanity: createdAt ≈ submit time.
      expect(createdAt).toBeGreaterThanOrEqual(beforeMs);
    }).toPass();
  });

  test('UC-ASSIGN-14 — missing congregation settings fall back to the env default (45 days)', async ({
    seed,
    signInAsUser,
    db,
    page,
  }) => {
    const congregation = seed.factories.buildCongregation({ cities: ['São Paulo'] });
    const admin = seed.factories.buildUser({ role: RoleEnum.ADMIN, congregationId: congregation.id });
    const territory = seed.factories.buildTerritory({
      congregationId: congregation.id,
      city: 'São Paulo',
      address: 'Rua Sem Settings, 1',
      history: [],
    });
    await seed.write({ congregations: [congregation], users: [admin], territories: [territory] });
    // Remove designationAccessExpiryDays so the BO falls back to the env default (45).
    await db.firestore
      .collection(db.collections.congregations)
      .doc(congregation.id)
      .update({ 'settings.designationAccessExpiryDays': firebaseAdmin.firestore.FieldValue.delete() });

    await signInAsUser(admin.id);
    const assignPage = new AssignTerritoriesPage(page);
    await assignPage.goto();
    await assignPage.check('Rua Sem Settings, 1');

    const { sharedUrl } = await captureWhatsAppPopup(page, () => assignPage.fab.click());
    const designationId = designationIdFromShareUrl(sharedUrl);

    await expect(async () => {
      const snap = await db.getDocSnapshot(db.collections.designations, designationId);
      const data = expectData(snap.data());
      const diff = data['expiresAt'].toMillis() - data['createdAt'].toMillis();
      // 45-day env default, not the 7-day baseline.
      expect(diff).toBeGreaterThanOrEqual(45 * 86_400_000 - 5_000);
      expect(diff).toBeLessThanOrEqual(45 * 86_400_000 + 5_000);
    }).toPass();
  });

  test('UC-ASSIGN-15 — submitting creates one designations doc with the expected top-level fields', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();
    await assignPage.check('Rua das Acácias, 45 - Pinheiros');
    await assignPage.check('Rua Harmonia, 300 - Vila Madalena');

    const { sharedUrl } = await captureWhatsAppPopup(authenticatedPage, () => assignPage.fab.click());
    const designationId = designationIdFromShareUrl(sharedUrl);

    await expect(async () => {
      const snap = await db.getDocSnapshot(db.collections.designations, designationId);
      const data = expectData(snap.data());
      expect(data['congregationId']).toBe(seed.ids.congregation);
      expect(data['createdBy']).toBe(seed.ids.adminUser);
      expect(data['id']).toBe(designationId); // id embedded in the body
      expect(data['createdAt']).toBeTruthy();
      expect(data['settings']?.['shouldDesignationBlockAfterExpired']).toBe(true);
    }).toPass();
  });

  // The five-entry cap is intentional; the defect assertion concerns slicing an unordered read.
  test('UC-ASSIGN-16 — embedded snapshot: status PENDING, recentHistory stripped, history capped at 5 (⚠ defect)', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    // A territory with 6 visit docs → embedded history sliced to 5 from an unordered read.
    const sixVisits = Array.from({ length: 6 }, (_, i) =>
      seed.factories.buildVisitHistory({
        notes: `Visita ${i + 1}`,
        date: new Date(Date.UTC(2024, 0, 15 - i)),
        visitOutcome: VisitOutcomeEnum.SPOKE,
      }),
    );
    const territoryId = `t-six-${Math.random().toString(36).slice(2, 8)}`;
    const territory = seed.factories.buildTerritory({
      id: territoryId,
      congregationId: seed.ids.congregation,
      city: 'São Paulo',
      address: 'Rua Seis Visitas, 6',
      history: sixVisits,
    });
    await seed.write({ territories: [territory] });

    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();
    await assignPage.check('Rua Seis Visitas, 6');

    const { sharedUrl } = await captureWhatsAppPopup(authenticatedPage, () => assignPage.fab.click());
    const designationId = designationIdFromShareUrl(sharedUrl);

    await expect(async () => {
      const data = await db.getDoc(db.collections.designations, designationId);
      const embedded = data?.['territories'] as Array<Record<string, unknown>>;
      expect(embedded).toHaveLength(1);
      expect(embedded[0]['id']).toBe(territoryId);
      expect(embedded[0]['status']).toBe('PENDING');
      expect(embedded[0]['recentHistory']).toBeUndefined();
      // ⚠ Weak contract: embedded history is capped at 5, sliced from an unordered read.
      expect((embedded[0]['history'] as unknown[]).length).toBe(5);
    }).toPass();
  });

  test('UC-ASSIGN-17 — two designations from overlapping territory sets persist independently', async ({
    authenticatedPage,
    db,
  }) => {
    const assignPage = new AssignTerritoriesPage(authenticatedPage);

    // D1: seed-territory-1 + seed-territory-3.
    await assignPage.goto();
    await assignPage.check('Rua das Acácias, 45 - Pinheiros');
    await assignPage.check('Rua Harmonia, 300 - Vila Madalena');
    const cap1 = await captureWhatsAppPopup(authenticatedPage, () => assignPage.fab.click());
    const d1 = designationIdFromShareUrl(cap1.sharedUrl);

    // Reload resets the session state (selectedTerritoriesModel +
    // assignedDesignations) → every checkbox becomes tickable again.
    await authenticatedPage.reload();
    await assignPage.goto();
    await assignPage.check('Rua das Acácias, 45 - Pinheiros');
    await assignPage.selectCity('Osasco');
    await assignPage.check('Av. dos Autonomistas, 1200 - Centro');
    const cap2 = await captureWhatsAppPopup(authenticatedPage, () => assignPage.fab.click());
    const d2 = designationIdFromShareUrl(cap2.sharedUrl);

    const ids = (territories: Array<Record<string, unknown>>) => new Set(territories.map((t) => t['id']));
    const d1doc = await db.getDoc(db.collections.designations, d1);
    const d2doc = await db.getDoc(db.collections.designations, d2);
    expect(Array.from(ids(d1doc?.['territories'] as Array<Record<string, unknown>>)).sort()).toEqual(
      ['seed-territory-1', 'seed-territory-3'].sort(),
    );
    expect(Array.from(ids(d2doc?.['territories'] as Array<Record<string, unknown>>)).sort()).toEqual(
      ['seed-territory-1', 'seed-territory-2'].sort(),
    );
    // Collection grew by 2 (baseline 1 → 3).
    expect(await db.getCollectionDocs(db.collections.designations)).toHaveLength(3);
  });

  test('UC-ASSIGN-18 — Firestore `in`-query internal batching at 10 (35-territory designation)', async ({
    seed,
    db,
    authenticatedPage,
  }) => {
    // Seed 35 territories in a dedicated city.
    const city = 'Campinas';
    await db.firestore
      .collection(db.collections.congregations)
      .doc(seed.ids.congregation)
      .update({ cities: ['São Paulo', 'Osasco', city] });

    const territories = Array.from({ length: 35 }, (_, i) =>
      seed.factories.buildTerritory({
        congregationId: seed.ids.congregation,
        city,
        address: `Rua Campinas, ${i + 1}`,
        history: [],
      }),
    );
    await seed.write({ territories });

    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();
    await assignPage.selectCity(city);
    await expect(assignPage.checkboxes).toHaveCount(35);

    // Tick all 35.
    const count = await assignPage.checkboxes.count();
    for (let i = 0; i < count; i++) {
      await assignPage.checkboxes.nth(i).click();
    }

    const { sharedUrl } = await captureWhatsAppPopup(authenticatedPage, () => assignPage.fab.click());
    const designationId = designationIdFromShareUrl(sharedUrl);

    await expect(async () => {
      const data = await db.getDoc(db.collections.designations, designationId);
      expect((data?.['territories'] as unknown[]).length).toBe(35);
    }).toPass();
  });

  test('UC-ASSIGN-19 — share link is location.origin + /work/{id} wrapped in a whatsapp deep link (⚠ defect)', async ({
    db,
    authenticatedPage,
  }) => {
    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();
    await assignPage.check('Rua das Acácias, 45 - Pinheiros');

    const { whatsappUrl, sharedUrl } = await captureWhatsAppPopup(authenticatedPage, () => assignPage.fab.click());

    expect(whatsappUrl).toContain('whatsapp://send?text=');
    // The shared URL is built from the browser's location.origin, not environment.baseUrl.
    const origin = new URL(authenticatedPage.url()).origin;
    expect(sharedUrl.startsWith(`${origin}/work/`)).toBe(true);

    const designationId = designationIdFromShareUrl(sharedUrl);
    // The {id} segment matches the persisted designation's id.
    await expect(async () => {
      const data = await db.getDoc(db.collections.designations, designationId);
      expect(data?.['id']).toBe(designationId);
    }).toPass();
  });

  // Known UX gap: completed designations cannot be copied from this flow (UC-ASSIGN-20).
  test('UC-ASSIGN-20 — there is no clipboard/copy affordance on this screen (⚠ gap)', async ({ authenticatedPage }) => {
    // Grant clipboard permissions so a copy would be observable if it existed.
    await authenticatedPage.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();
    await assignPage.check('Rua das Acácias, 45 - Pinheiros');
    const { sharedUrl } = await captureWhatsAppPopup(authenticatedPage, () => assignPage.fab.click());

    // No "copy" button exists anywhere during/after the share flow.
    await expect(authenticatedPage.getByRole('button', { name: /copiar|copy/i })).toHaveCount(0);
    // The clipboard was not written — only the whatsapp share link exists.
    const clipboard = await authenticatedPage.evaluate(() =>
      navigator.clipboard
        .readText()
        .then((t) => t)
        .catch(() => ''),
    );
    expect(clipboard).toBe('');
    expect(sharedUrl).toContain('/work/');
  });

  test('UC-ASSIGN-25 — tapping an assigned territory re-triggers the share for its designation', async ({
    authenticatedPage,
    db,
  }) => {
    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();

    // Create designation D1 with two territories.
    await assignPage.check('Rua das Acácias, 45 - Pinheiros');
    await assignPage.check('Rua Harmonia, 300 - Vila Madalena');
    const cap1 = await captureWhatsAppPopup(authenticatedPage, () => assignPage.fab.click());
    const d1 = designationIdFromShareUrl(cap1.sharedUrl);

    // Both submitted rows render checked-and-disabled, with the re-send hint.
    const assignedRow = assignPage.checkboxByAddress('Rua das Acácias, 45 - Pinheiros');
    await expect(assignedRow).toHaveClass(/territory-checkbox--disabled/);
    await expect(assignedRow).toHaveAttribute('title', 'Enviar designação novamente');
    await expect.poll(() => assignPage.isChecked('Rua das Acácias, 45 - Pinheiros')).toBe(true);
    await expect(assignPage.checkboxByAddress('Rua Harmonia, 300 - Vila Madalena')).toHaveClass(
      /territory-checkbox--disabled/,
    );

    // Tapping the assigned row re-shares the SAME designation — no new doc.
    const cap2 = await captureWhatsAppPopup(authenticatedPage, () => assignedRow.click());
    expect(cap2.whatsappUrl).toContain('whatsapp://send?text=');
    expect(cap2.sharedUrl.endsWith(`/work/${d1}`)).toBe(true);
    expect(await db.getCollectionDocs(db.collections.designations)).toHaveLength(2);

    // The row stays checked-and-disabled after re-sharing.
    await expect(assignedRow).toHaveClass(/territory-checkbox--disabled/);
    await expect.poll(() => assignPage.isChecked('Rua das Acácias, 45 - Pinheiros')).toBe(true);
  });

  test('UC-ASSIGN-26 — Maps/History buttons on an assigned row keep their behavior; assigned icon is dimmed', async ({
    authenticatedPage,
    db,
  }) => {
    const assignPage = new AssignTerritoriesPage(authenticatedPage);
    await assignPage.goto();

    // Assign one territory (seeded territories all carry a mapsLink + visit history).
    await assignPage.check('Rua das Acácias, 45 - Pinheiros');
    await captureWhatsAppPopup(authenticatedPage, () => assignPage.fab.click());

    const assignedRow = assignPage.checkboxByAddress('Rua das Acácias, 45 - Pinheiros');
    await expect(assignedRow).toHaveClass(/territory-checkbox--disabled/);

    // Reset the recorder so only the button clicks below are captured.
    await recordWindowOpen(authenticatedPage);

    // Maps button: still opens Google Maps, never a WhatsApp share.
    await assignedRow.locator('button').first().click();
    const afterMaps = await recordedOpenUrls(authenticatedPage);
    expect(afterMaps.some((url) => url.includes('maps.google.com'))).toBe(true);
    expect(afterMaps.some((url) => url.startsWith('whatsapp://'))).toBe(false);

    // History button: still opens the visit history dialog, never a WhatsApp share.
    await assignedRow.locator('button').nth(1).click();
    await expect(authenticatedPage.getByTestId('history-dialog')).toBeVisible();
    const afterHistory = await recordedOpenUrls(authenticatedPage);
    expect(afterHistory.some((url) => url.startsWith('whatsapp://'))).toBe(false);

    // Dark mode: the assigned icon uses the disabled tone while selectable rows keep full contrast.
    await authenticatedPage.emulateMedia({ colorScheme: 'dark' });
    await expect(authenticatedPage.locator('html')).toHaveAttribute('data-resolved-theme', 'dark');
    const assignedIconColor = await assignedRow
      .locator('.territory-checkbox__icon')
      .evaluate((el) => getComputedStyle(el).color);
    expect(assignedIconColor).toBe('rgba(255, 255, 255, 0.38)');
    const selectableRow = assignPage.checkboxByAddress('Rua Harmonia, 300 - Vila Madalena');
    const selectableIconColor = await selectableRow
      .locator('.territory-checkbox__icon')
      .evaluate((el) => getComputedStyle(el).color);
    expect(selectableIconColor).toBe('rgba(255, 255, 255, 0.87)');

    expect(await db.getCollectionDocs(db.collections.designations)).toHaveLength(2);
  });

  test('UC-ASSIGN-22 — authorised roles reach /territories/assign; APP_ADMIN bypasses the role list', async ({
    signInAs,
    page,
  }) => {
    const roles = ['admin', 'elder', 'organizer', 'superintendent', 'app_admin'] as const;
    for (const role of roles) {
      await signInAs(role);
      const assignPage = new AssignTerritoriesPage(page);
      await assignPage.goto();
      await expect(assignPage.heading).toHaveText('Designar Território');
    }
  });
});
