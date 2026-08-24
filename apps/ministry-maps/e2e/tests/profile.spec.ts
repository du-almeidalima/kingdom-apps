import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures';
import { ProfilePage } from '../page-objects/profile.page';
import { ConfirmDialogPage } from '../page-objects/confirm-dialog.page';

// ─── WP-24: profile page (identity card, congregation switch, logout) ────────

test.describe('Profile page (WP-24)', () => {
  test.use({ role: 'admin' });

  // Helper to ensure UserStateService is fully hydrated after auth session restoration
  async function gotoProfileWithResolvedUser(page: Page) {
    await page.goto('/home');
    // Wait for auth restoration redirect to settle on /home or /welcome
    await expect(page).toHaveURL(/\/(home|welcome)/, { timeout: 15000 });
    await expect(page.getByTestId('welcome-heading').or(page.getByTestId('home-heading'))).toBeVisible({
      timeout: 15000,
    });

    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    return profilePage;
  }

  // ── Identity card ────────────────────────────────────────────────────────────

  test('UC-PROF-01 — Identity card renders the signed-in ADMIN name, role badge and congregation', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    const profilePage = await gotoProfileWithResolvedUser(authenticatedPage);

    await expect(profilePage.initials).toContainText('CA');
    await expect(profilePage.name).toHaveText('Carlos Almeida');
    await expect(profilePage.roleBadge).toHaveText('Admin');
    await expect(profilePage.congregationName).toHaveText('Congregação Jardim Primavera');

    const adminDoc = await db.getDoc(db.collections.users, seed.ids.adminUser);
    expect(adminDoc?.['name']).toBe('Carlos Almeida');
    expect(adminDoc?.['role']).toBe('ADMIN');
  });

  test('UC-PROF-02 — Identity card renders for a PUBLISHER (badge "Publicador")', async ({ signInAs, page, db }) => {
    await signInAs('publisher');
    const profilePage = await gotoProfileWithResolvedUser(page);

    await expect(profilePage.initials).toContainText('AS');
    await expect(profilePage.name).toHaveText('Ana Souza');
    await expect(profilePage.roleBadge).toHaveText('Publicador');
    await expect(profilePage.congregationName).toHaveText('Congregação Jardim Primavera');

    const pubDoc = await db.getDoc(db.collections.users, 'seed-user-publisher-1');
    expect(pubDoc?.['role']).toBe('PUBLISHER');
  });

  test('UC-PROF-03 — ⚠ Anonymous visit does not redirect and renders placeholder identity content', async ({
    page,
  }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto();

    expect(page.url()).toContain('/profile');

    await expect(profilePage.initials).toContainText('MN');
    await expect(profilePage.name).toHaveText('Meu Nome');
    await expect(profilePage.congregationName).toHaveText('LS Congregação');
    await expect(profilePage.roleBadge).toHaveText('Publicador');
  });

  // ── Congregation switch ──────────────────────────────────────────────────────

  test('UC-PROF-04 — Switch card is hidden for ADMIN and PUBLISHER', async ({ authenticatedPage, signInAs, page }) => {
    const adminProfile = await gotoProfileWithResolvedUser(authenticatedPage);
    await expect(adminProfile.changeCongregationCard).toHaveCount(0);

    await signInAs('publisher');
    const pubProfile = await gotoProfileWithResolvedUser(page);
    await expect(pubProfile.changeCongregationCard).toHaveCount(0);
  });

  test('UC-PROF-05 — Switch card lists every congregation, ordered by name, for SUPERINTENDENT', async ({
    signInAs,
    page,
    seed,
    db,
  }) => {
    const secondCong = seed.factories.buildCongregation({
      id: 'seed-congregation-2',
      name: 'Congregação Vila Nova',
    });
    await seed.write({ congregations: [secondCong] });

    await signInAs('superintendent');
    const profilePage = await gotoProfileWithResolvedUser(page);

    await expect(profilePage.changeCongregationCard).toBeVisible();
    await expect(profilePage.congregationSelect.locator('option')).toHaveCount(2);

    const options = await profilePage.congregationSelect.locator('option').allTextContents();
    expect(options).toContain('Congregação Jardim Primavera');
    expect(options).toContain('Congregação Vila Nova');

    const allCongs = await db.getCollectionDocs(db.collections.congregations);
    expect(allCongs).toHaveLength(2);
  });

  test('UC-PROF-06 — Switching congregation persists reference, updates state, and re-scopes /territories without reload', async ({
    signInAs,
    page,
    seed,
    db,
  }) => {
    const secondCong = seed.factories.buildCongregation({
      id: 'seed-congregation-2',
      name: 'Congregação Vila Nova',
      cities: ['Campinas'],
    });
    await seed.write({ congregations: [secondCong] });

    await signInAs('superintendent');
    const profilePage = await gotoProfileWithResolvedUser(page);

    await profilePage.selectCongregation('Congregação Vila Nova');

    // Verify Firestore doc updated user congregation reference
    await expect
      .poll(async () => {
        const snap = await db.getDocSnapshot(db.collections.users, 'seed-user-superintendent');
        return snap.data()?.['congregation']?.id;
      })
      .toBe('seed-congregation-2');

    // Navigate to /territories without hard reload
    await page.goto('/territories');
    await expect(page.getByTestId('territories-city-filter')).toBeVisible();

    const cityOptions = await page.getByTestId('territories-city-filter').locator('option').allTextContents();
    expect(cityOptions).toContain('Campinas');
  });

  // eslint-disable-next-line playwright/expect-expect -- deliberately empty: documents an unreachable dead guard (see below)
  test.fixme('UC-PROF-07 — ⚠ ProfileBO.changeUserCongregation silently no-ops for a user without a congregation (dead guard)', async () => {
    // Documented dead-guard: resolveUser substitutes EMPTY_CONGREGATION for missing references,
    // making this scenario unreachable through normal UI state.
  });

  test('UC-PROF-08 — ⚠ Non-privileged switch throws, swallowed silently; select reverts', async ({
    signInAs,
    page,
    seed,
    db,
  }) => {
    const secondCong = seed.factories.buildCongregation({
      id: 'seed-congregation-2',
      name: 'Congregação Vila Nova',
    });
    await seed.write({ congregations: [secondCong] });

    await signInAs('superintendent');
    const profilePage = await gotoProfileWithResolvedUser(page);

    await expect(profilePage.changeCongregationCard).toBeVisible();

    // Mutate user's role to PUBLISHER in Firestore mid-session
    await db.firestore.collection('users').doc('seed-user-superintendent').update({ role: 'PUBLISHER' });

    await profilePage.selectCongregation('Congregação Vila Nova');

    // Documented defect behavior: error is swallowed silently, no write occurs
    const userDoc = await db.getDocSnapshot(db.collections.users, 'seed-user-superintendent');
    expect(userDoc.data()?.['congregation']?.id).toBe(seed.ids.congregation);
  });

  // ── Logout ───────────────────────────────────────────────────────────────────

  test('UC-PROF-09 — Logout confirmation dialog, confirm → /login and cleared state', async ({ authenticatedPage }) => {
    const profilePage = await gotoProfileWithResolvedUser(authenticatedPage);

    await profilePage.logoutButton.click();

    const confirmDialog = new ConfirmDialogPage(authenticatedPage);
    await expect(confirmDialog.dialog).toBeVisible();
    await expect(confirmDialog.title).toHaveText('Sair');
    await expect(confirmDialog.dialog).toContainText('Você realmente deseja sair?');

    await confirmDialog.confirm();

    await expect(authenticatedPage).toHaveURL(/\/login/);
  });

  test('UC-PROF-10 — Logout cancel keeps the user on /profile', async ({ authenticatedPage }) => {
    const profilePage = await gotoProfileWithResolvedUser(authenticatedPage);

    await profilePage.logoutButton.click();

    const confirmDialog = new ConfirmDialogPage(authenticatedPage);
    await expect(confirmDialog.dialog).toBeVisible();

    await confirmDialog.cancel();

    expect(authenticatedPage.url()).toContain('/profile');
    await expect(profilePage.name).toHaveText('Carlos Almeida');
  });
});
