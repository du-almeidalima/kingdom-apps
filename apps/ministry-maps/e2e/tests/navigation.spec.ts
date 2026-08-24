// UC-NAV-06, UC-NAV-07, UC-NAV-10 are owned by auth.spec.ts (WP-08 guard redirect matrices).
// Do not duplicate them here.

import { test, expect } from '../fixtures';
import { HeaderPage } from '../page-objects/header.page';
import { HomePage } from '../page-objects/home.page';
import { RoleEnum } from '../../src/models/enums/role';

test.describe('Navigation & Shell', () => {
  test('UC-NAV-01 — Authenticated header shows profile link', async ({ page, signInAs, db, seed }) => {
    await signInAs('publisher');
    await page.goto('/welcome');

    const header = new HeaderPage(page);
    await expect(header.profileLink).toBeVisible();
    await expect(header.profileLink).toHaveAttribute('title', 'Meu Perfil');
    await expect(header.logo).toBeVisible();

    const userDoc = await db.getDoc(db.collections.users, seed.ids.publisherUsers[0]);
    expect(userDoc?.role).toBe(RoleEnum.PUBLISHER);
  });

  test('UC-NAV-02 — Anonymous header hides profile link', async ({ page, db }) => {
    await page.goto('/login');

    const header = new HeaderPage(page);
    await expect(header.profileLink).toHaveCount(0);
    await expect(header.logo).toBeVisible();
    expect(await db.getCollectionDocs(db.collections.users)).toHaveLength(8);
  });

  test('UC-NAV-03 — Logo navigates to home', async ({ page, signInAs, db, seed }) => {
    await signInAs('admin');
    await page.goto('/territories');

    const header = new HeaderPage(page);
    await header.goToHome();

    await expect(page).toHaveURL(/\/home$/);

    const userDoc = await db.getDoc(db.collections.users, seed.ids.adminUser);
    expect(userDoc?.role).toBe(RoleEnum.ADMIN);
  });

  test('UC-NAV-04 — shell spinner is replaced by the router outlet', async ({ page }) => {
    // Mechanism-level: while `isAuthenticating` is true the shell renders the
    // `app-loading-spinner` instead of the `<router-outlet>`; once settled the
    // outlet renders (anonymous `/` → `/home` → guard → `/login`). The transient
    // spinner itself is never caught — only its settled replacement is asserted.
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('app-loading-spinner')).toBeHidden();
  });

  test('UC-NAV-05 — Home hub shows greeting and cards', async ({ page, signInAs, db, seed }) => {
    await signInAs('admin');
    await page.goto('/home');

    const home = new HomePage(page);

    // Greeting
    await expect(home.heading).toBeVisible();
    await expect(home.heading).toHaveText('Bem-Vindo Carlos!');

    // Cards
    await expect(home.cardTerritories).toBeVisible();
    await expect(home.cardPeople).toBeVisible();

    // Links
    await expect(home.linkDesignarTerritorios).toBeVisible();
    await expect(home.linkAdministrarTerritorios).toBeVisible();
    await expect(home.linkEstatisticasTerritorios).toBeVisible();
    await expect(home.linkAdministrarPessoas).toBeVisible();

    const userDoc = await db.getDoc(db.collections.users, seed.ids.adminUser);
    expect(userDoc?.role).toBe(RoleEnum.ADMIN);
    expect(userDoc?.name).toBe('Carlos Almeida');
  });

  test('UC-NAV-08 — Unauthorized role cancelled navigation', async ({ page, signInAsUser, seed, db }) => {
    const customRoleUser = seed.factories.buildUser({
      congregationId: seed.ids.congregation,
      role: 'VIEWER' as RoleEnum,
    });
    await seed.write({ users: [customRoleUser] });

    await signInAsUser(customRoleUser.id);
    await page.goto('/territories');

    // Route cancelled, no content rendered from territories, URL might still be /territories
    await expect(page.getByTestId('territories-heading')).toHaveCount(0);
    expect((await db.getDoc(db.collections.users, customRoleUser.id))?.['role']).toBe('VIEWER');
  });

  test('UC-NAV-09 — Unknown route empty outlet and console error', async ({ page, signInAs, db }) => {
    await signInAs('admin');

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/nao-existe');
    await expect(page).toHaveURL(/\/$/);

    // empty outlet (no headings present)
    await expect(page.getByTestId('home-heading')).toHaveCount(0);
    await expect(page.getByTestId('territories-heading')).toHaveCount(0);

    // expect angular router error in console
    expect(consoleErrors.some((e) => e.includes('Cannot match any routes'))).toBeTruthy();

    expect(await db.getCollectionDocs(db.collections.users)).toHaveLength(8);
  });

  test('UC-NAV-11 — Home link to /territories', async ({ page, signInAs, db, seed }) => {
    await signInAs('admin');
    const home = new HomePage(page);
    await home.goto();

    await home.linkAdministrarTerritorios.click();
    await expect(page).toHaveURL(/\/territories$/);
    await expect(page.getByTestId('territories-heading')).toBeVisible();
    expect((await db.getDoc(db.collections.users, seed.ids.adminUser))?.['role']).toBe(RoleEnum.ADMIN);
  });

  test('UC-NAV-12 — Home link to /territories/assign', async ({ page, signInAs, db, seed }) => {
    await signInAs('admin');
    const home = new HomePage(page);
    await home.goto();

    await home.linkDesignarTerritorios.click();
    await expect(page).toHaveURL(/\/territories\/assign$/);
    await expect(page.getByTestId('assign-heading')).toBeVisible();
    expect((await db.getDoc(db.collections.users, seed.ids.adminUser))?.['role']).toBe(RoleEnum.ADMIN);
  });

  test('UC-NAV-13 — Home link to /territories/statistics', async ({ page, signInAs, db, seed }) => {
    await signInAs('admin');
    const home = new HomePage(page);
    await home.goto();

    await home.linkEstatisticasTerritorios.click();
    await expect(page).toHaveURL(/\/territories\/statistics$/);
    await expect(page.getByTestId('statistics-heading')).toBeVisible();
    expect((await db.getDoc(db.collections.users, seed.ids.adminUser))?.['role']).toBe(RoleEnum.ADMIN);
  });

  test('UC-NAV-14 — Home link to /users', async ({ page, signInAs, db, seed }) => {
    await signInAs('admin');
    const home = new HomePage(page);
    await home.goto();

    await home.linkAdministrarPessoas.click();
    await expect(page).toHaveURL(/\/users$/);
    await expect(page.getByTestId('users-heading')).toBeVisible();
    expect((await db.getDoc(db.collections.users, seed.ids.adminUser))?.['role']).toBe(RoleEnum.ADMIN);
  });
});
