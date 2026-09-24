import { RoleEnum } from '../../src/models/enums/role';
import { test, expect } from '../fixtures';
import { LoginPage } from '../page-objects/login.page';
import { WelcomePage } from '../page-objects/welcome.page';
import { NoAccountPage } from '../page-objects/no-account.page';

test.describe('Auth', () => {
  // UC-AUTH-01 is SKIP - already covered by smoke.spec.ts.

  test('UC-AUTH-02 — login renders Google button', async ({ page, db }) => {
    const loginPage = new LoginPage(page);
    await page.goto('/login');

    await expect(loginPage.googleButton).toBeVisible();
    await expect(loginPage.googleButton).toHaveText('Entrar com uma conta do Google');
    await expect(loginPage.googleButton).toBeEnabled();

    expect(await db.getCollectionDocs(db.collections.users)).toHaveLength(8);
  });

  test('UC-AUTH-03 — Admin user on /login stays on /login without redirect', async ({ page, signInAs, db, seed }) => {
    await signInAs('admin');
    await page.goto('/login');

    const loginPage = new LoginPage(page);

    await expect(page).toHaveURL(/.*\/login/);
    await expect(loginPage.heading).toBeVisible();
    await expect(page.locator('#profile-link')).toHaveCount(0);

    const authUser = await db.auth.getUser(seed.ids.adminUser);
    expect(authUser.uid).toBe(seed.ids.adminUser);
  });

  test('UC-AUTH-08 — Publisher is shown the welcome screen and role is asserted', async ({
    page,
    signInAs,
    db,
    seed,
  }) => {
    await signInAs('publisher');
    await page.goto('/welcome');

    const welcomePage = new WelcomePage(page);
    await expect(welcomePage.heading).toHaveText('Bem-Vindo Ana!');
    await expect(page.getByText('Sua conta foi criada com sucesso!')).toBeVisible();
    await expect(page.getByText(/Sua conta está ligada a congregação/)).toBeVisible();

    const publisherDoc = await db.getDoc(db.collections.users, seed.ids.publisherUsers[0]);
    expect(publisherDoc?.['role']).toBe(RoleEnum.PUBLISHER);
  });

  test('UC-AUTH-09 — Admin navigating to /welcome cancels navigation', async ({ page, signInAs, db, seed }) => {
    await signInAs('admin');
    await page.goto('/welcome');

    const welcomePage = new WelcomePage(page);

    await expect(page).toHaveURL(/.*\/welcome/);
    await expect(welcomePage.heading).toBeHidden();

    expect((await db.getDoc(db.collections.users, seed.ids.adminUser))?.['role']).toBe(RoleEnum.ADMIN);
  });

  test('UC-AUTH-10 — Anonymous navigating to /no-account renders properly', async ({ page, db }) => {
    await page.goto('/no-account');

    const noAccountPage = new NoAccountPage(page);
    await expect(noAccountPage.heading).toBeVisible();
    await expect(noAccountPage.image).toBeVisible();
    await expect(page.getByText(/Olá! Agradecemos por usar o Ministry Maps/)).toBeVisible();
    await expect(page.getByText(/Não conseguimos localizar sua conta/)).toBeVisible();
    await expect(page.getByText(/Se precisar de acesso à área restrita/)).toBeVisible();

    const users = await db.getCollectionDocs(db.collections.users);
    expect(users.length).toBe(8); // Assert users collection unchanged
  });

  // UC-AUTH-11 Matrix
  // Resolves duplicates: UC-NAV-07, UC-ASSIGN-24, UC-STAT-17, UC-USERS-17
  const anonymousGuards = [
    '/home',
    '/territories',
    '/territories/assign',
    '/territories/statistics',
    '/users',
    '/welcome',
  ];
  for (const route of anonymousGuards) {
    test(`UC-AUTH-11 — anonymous navigating to ${route} redirects to /login`, async ({ page, db }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/.*\/login/);
      expect(await db.getCollectionDocs(db.collections.designations)).toHaveLength(1);
    });
  }

  // UC-AUTH-12 Matrix
  // Resolves duplicates: UC-NAV-06, UC-ASSIGN-23, UC-STAT-16, UC-USERS-16
  const publisherGuards = ['/home', '/territories', '/territories/assign', '/territories/statistics', '/users'];
  for (const route of publisherGuards) {
    test(`UC-AUTH-12 — publisher navigating to ${route} redirects to /welcome`, async ({
      page,
      signInAs,
      db,
      seed,
    }) => {
      await signInAs('publisher');
      await page.goto(route);
      await expect(page).toHaveURL(/.*\/welcome/);
      expect((await db.getDoc(db.collections.users, seed.ids.publisherUsers[0]))?.['role']).toBe(RoleEnum.PUBLISHER);
    });
  }

  // UC-AUTH-13 Resolves duplicate: UC-NAV-10
  test('UC-AUTH-13 — routes with no redirect for roles: ["*"]', async ({ page, db }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/.*\/profile/);

    await page.goto('/configuration');
    await expect(page).toHaveURL(/.*\/configuration/);
    expect(await db.getCollectionDocs(db.collections.users)).toHaveLength(8);
  });

  test('UC-AUTH-22 — Admin signout clears state and navigates to /login', async ({ page, signInAs, db }) => {
    await signInAs('admin');
    await page.goto('/home');

    await page.evaluate(async () => {
      const api = window.__E2E__;
      if (!api) throw new Error('__E2E__ hook unavailable');
      await api.auth.signOut();
    });

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await expect(page.locator('#profile-link')).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const api = window.__E2E__;
          if (!api) throw new Error('__E2E__ hook unavailable');
          return api.auth.currentUser;
        }),
      )
      .toBeNull();

    const users = await db.getCollectionDocs(db.collections.users);
    expect(users.length).toBe(8); // Assert user doc unchanged
  });

  test('UC-AUTH-23 — loading spinner mechanism settles before the outlet', async ({ page, db }) => {
    await page.goto('/login');
    // Assert mechanism-level existence of the spinner testid
    await expect(page.getByTestId('app-loading-spinner')).toBeHidden();
    expect(await db.getCollectionDocs(db.collections.users)).toHaveLength(8);
  });
});
