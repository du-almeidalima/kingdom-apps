import { expect, test } from '../fixtures';
import { UsersPage } from '../page-objects/users.page';
import { UserEditDialogPage } from '../page-objects/user-edit-dialog.page';
import { ConfirmDialogPage } from '../page-objects/confirm-dialog.page';
import { RoleEnum } from '../../src/models/enums/role';

// ─── WP-22: users administration (list, edit, delete, role gating) ───────────

test.describe('Users page (WP-22)', () => {
  test.use({ role: 'admin' });

  // ── Listing & scope ──────────────────────────────────────────────────────────

  test('UC-USERS-01 — List is scoped to the congregation and ordered by role priority', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    const usersPage = new UsersPage(authenticatedPage);
    await usersPage.goto();
    await expect(usersPage.userItems).toHaveCount(8);

    // Role-priority order: APP_ADMIN → SUPERINTENDENT → ADMIN → ELDER → ORGANIZER → PUBLISHER.
    const names = await usersPage.userItems.locator('h2').allTextContents();
    expect(names[0]).toBe('Daniel Ferreira'); // APP_ADMIN
    expect(names[1]).toBe('Felipe Rodrigues'); // SUPERINTENDENT
    expect(names[2]).toBe('Carlos Almeida'); // ADMIN
    expect(names[3]).toBe('Marcos Oliveira'); // ELDER
    expect(names[4]).toBe('Ricardo Santos'); // ORGANIZER
    // PUBLISHER tie-break is incidental (no orderBy clause) — assert the set, not order.
    expect(new Set(names.slice(5))).toEqual(new Set(['Ana Souza', 'Pedro Lima', 'Mariana Costa']));

    expect((await db.getDoc(db.collections.users, seed.ids.adminUser))?.['role']).toBe('ADMIN');
    expect(await db.getCollectionDocs(db.collections.users)).toHaveLength(8);
  });

  test('UC-USERS-02 — Each row shows initials, name and the translated role badge', async ({
    authenticatedPage,
    db,
  }) => {
    const usersPage = new UsersPage(authenticatedPage);
    await usersPage.goto();
    await expect(usersPage.userItems).toHaveCount(8);

    const initials = usersPage.initials('Carlos Almeida');
    await expect(initials).toContainText('CA');

    const badge = usersPage.roleBadge('Carlos Almeida');
    await expect(badge).toHaveText('Admin');
    // Class is derived from `role.toLowerCase()` — `user-item__privilege-badge--admin`.
    await expect(badge).toHaveClass(/\buser-item__privilege-badge--admin\b/);

    const stored = await db.getDoc(db.collections.users, 'seed-user-admin');
    expect(stored?.['name']).toBe('Carlos Almeida');
    expect(stored?.['role']).toBe('ADMIN');
  });

  test('UC-USERS-03 — A user from another congregation is never listed', async ({ authenticatedPage, seed, db }) => {
    const foreignCongregation = seed.factories.buildCongregation();
    const foreignAdmin = seed.factories.buildUser({
      role: RoleEnum.ADMIN,
      name: 'Forasteiro Admin',
      congregationId: foreignCongregation.id,
    });
    await seed.write({ congregations: [foreignCongregation], users: [foreignAdmin] });

    const usersPage = new UsersPage(authenticatedPage);
    await usersPage.goto();
    await expect(usersPage.userItems).toHaveCount(8);
    await expect(usersPage.rowByName('Forasteiro Admin')).toHaveCount(0);

    const allUsers = await db.getCollectionDocs(db.collections.users);
    expect(allUsers).toHaveLength(9);
    const scopedRef = db.firestore.collection('congregations').doc(seed.ids.congregation);
    const scoped = await db.queryWhere(db.collections.users, 'congregation', '==', scopedRef);
    expect(scoped).toHaveLength(8);
  });

  // ── Edit-user dialog ──────────────────────────────────────────────────────────

  test('UC-USERS-04 — Dialog fields & role options; `Superintendente` only for APP_ADMIN editors', async ({
    authenticatedPage,
  }) => {
    const usersPage = new UsersPage(authenticatedPage);
    await usersPage.goto();
    await usersPage.openItemMenu('Ana Souza');
    await usersPage.menuItem('Editar').click();

    const editDialog = new UserEditDialogPage(authenticatedPage);
    await expect(editDialog.dialog).toBeVisible();
    await expect(editDialog.nameInput).toHaveValue('Ana Souza');

    // ADMIN editor sees exactly 4 options — no `Superintendente`.
    const labels = await editDialog.roleRadioLabels();
    expect(labels).toEqual(['Publicador', 'Organizador', 'Ancião', 'Administrador']);
  });

  test('UC-USERS-05 — Form is enabled for a non-admin-level user edited by a non-APP_ADMIN editor (fixed)', async ({
    authenticatedPage,
    db,
  }) => {
    const usersPage = new UsersPage(authenticatedPage);
    await usersPage.goto();

    const before = await db.getDoc(db.collections.users, 'seed-user-publisher-1');
    expect(before?.['name']).toBe('Ana Souza');
    expect(before?.['role']).toBe('PUBLISHER');

    await usersPage.openItemMenu('Ana Souza');
    await usersPage.menuItem('Editar').click();

    const editDialog = new UserEditDialogPage(authenticatedPage);
    await expect(editDialog.dialog).toBeVisible();
    // Fixed (2026-08): the disable gate only applies when the EDITED USER holds an admin-level
    // role (SUPERINTENDENT/ADMIN/APP_ADMIN) and the viewer is not APP_ADMIN. Editing a
    // PUBLISHER as ADMIN now yields a usable form — matching the Firestore rules (UC-RULES-11),
    // which already allow same-congregation ADMIN edits of non-protected users.
    await expect(editDialog.nameInput).toBeEnabled();
    await expect(editDialog.saveButton).toBeEnabled();

    // Save without changes — persists the identical doc and closes the dialog.
    await editDialog.save();
    await expect(editDialog.dialog).toHaveCount(0);

    const after = await db.getDoc(db.collections.users, 'seed-user-publisher-1');
    expect(after?.['name']).toBe('Ana Souza');
    expect(after?.['role']).toBe('PUBLISHER');
  });

  test('UC-USERS-06 — APP_ADMIN editor gets a usable form and edits persist', async ({ signInAs, page, db }) => {
    await signInAs('app_admin');
    const usersPage = new UsersPage(page);
    await usersPage.goto();

    await usersPage.openItemMenu('Ana Souza');
    await usersPage.menuItem('Editar').click();

    const editDialog = new UserEditDialogPage(page);
    await expect(editDialog.dialog).toBeVisible();
    // APP_ADMIN gets a fully interactive form.
    await expect(editDialog.nameInput).toBeEnabled();
    // The `Superintendente` option is rendered for APP_ADMIN editors.
    const labels = await editDialog.roleRadioLabels();
    expect(labels).toEqual(['Publicador', 'Organizador', 'Ancião', 'Administrador', 'Superintendente']);

    await editDialog.nameInput.fill('Ana Souza Silva');
    await editDialog.selectRole('Ancião');
    await editDialog.save();
    await expect(editDialog.dialog).toHaveCount(0);

    // List re-renders immediately (live listener): new name + `Ancião` badge.
    await expect(usersPage.rowByName('Ana Souza Silva')).toBeVisible();
    await expect(usersPage.roleBadge('Ana Souza Silva')).toHaveText('Ancião');
    // The row moved up — ELDER (priority 4) sits above the remaining publishers.
    const names = await usersPage.userItems.locator('h2').allTextContents();
    expect(names.indexOf('Ana Souza Silva')).toBeLessThan(names.indexOf('Pedro Lima'));

    const stored = await db.getDoc(db.collections.users, 'seed-user-publisher-1');
    expect(stored?.['name']).toBe('Ana Souza Silva');
    expect(stored?.['role']).toBe('ELDER');
  });

  test('UC-USERS-07 — Editing your own account is not special-cased', async ({ authenticatedPage, db }) => {
    const usersPage = new UsersPage(authenticatedPage);
    await usersPage.goto();

    await usersPage.openItemMenu('Carlos Almeida');
    await usersPage.menuItem('Editar').click();

    const editDialog = new UserEditDialogPage(authenticatedPage);
    await expect(editDialog.dialog).toBeVisible();
    // The edited user (the admin themselves) holds an admin-level role and the viewer is not
    // APP_ADMIN, so the form is disabled per the corrected gate (UC-USERS-05).
    await expect(editDialog.nameInput).toBeDisabled();
    await expect(editDialog.nameInput).toHaveValue('Carlos Almeida');

    await editDialog.save();
    await expect(editDialog.dialog).toHaveCount(0);

    const stored = await db.getDoc(db.collections.users, 'seed-user-admin');
    expect(stored?.['name']).toBe('Carlos Almeida');
    expect(stored?.['role']).toBe('ADMIN');
  });

  // ── Delete ─────────────────────────────────────────────────────────────────

  test('UC-USERS-08 — Delete confirmation dialog removes the Firestore doc', async ({ authenticatedPage, db }) => {
    const usersPage = new UsersPage(authenticatedPage);
    await usersPage.goto();
    await expect(usersPage.userItems).toHaveCount(8);

    await usersPage.openItemMenu('Ana Souza');
    await usersPage.menuItem('Apagar').click();

    const confirmDialog = new ConfirmDialogPage(authenticatedPage);
    await expect(confirmDialog.dialog).toBeVisible();
    await expect(confirmDialog.title).toHaveText('Apagar Usuário');
    await expect(confirmDialog.dialog).toContainText('Você realmente deseja apagar esse Usuário?');
    await expect(confirmDialog.dialog).toContainText('Essa ação não poderá ser desfeita.');

    await confirmDialog.confirm();

    // Row disappears (live listener).
    await expect(usersPage.rowByName('Ana Souza')).toHaveCount(0);
    await expect(usersPage.userItems).toHaveCount(7);
    // Doc is gone.
    expect(await db.getDoc(db.collections.users, 'seed-user-publisher-1')).toBeUndefined();
  });

  test('UC-USERS-09 — Delete also removes the Auth account via the deleteUser callable', async ({
    authenticatedPage,
    db,
  }) => {
    const usersPage = new UsersPage(authenticatedPage);
    await usersPage.goto();

    await usersPage.openItemMenu('Pedro Lima');
    await usersPage.menuItem('Apagar').click();

    const confirmDialog = new ConfirmDialogPage(authenticatedPage);
    await expect(confirmDialog.dialog).toBeVisible();
    await confirmDialog.confirm();

    // Row disappears.
    await expect(usersPage.rowByName('Pedro Lima')).toHaveCount(0);

    // Firestore doc is gone…
    expect(await db.getDoc(db.collections.users, 'seed-user-publisher-2')).toBeUndefined();
    // …and the deleteUser callable removed the Auth account too (it runs before the doc
    // deletion; both are async, so poll).
    await expect
      .poll(async () => {
        try {
          await db.auth.getUser('seed-user-publisher-2');
          return false;
        } catch {
          return true;
        }
      })
      .toBe(true);
  });

  // ── Role gating ──────────────────────────────────────────────────────────────

  test('UC-USERS-15 — ORGANIZER sees the list but no edit/delete menu or invite FAB', async ({
    signInAs,
    page,
    db,
  }) => {
    await signInAs('organizer');
    const usersPage = new UsersPage(page);
    await usersPage.goto();
    await expect(usersPage.userItems).toHaveCount(8);

    // No row exposes the overflow trigger.
    await expect(usersPage.menuTrigger('Carlos Almeida')).toHaveCount(0);
    await expect(usersPage.menuTrigger('Ana Souza')).toHaveCount(0);
    // The invite FAB is gated to ADMIN (+ APP_ADMIN bypass) — organizer sees neither.
    await expect(usersPage.inviteFab).toHaveCount(0);

    const stored = await db.getDoc(db.collections.users, 'seed-user-organizer');
    expect(stored?.['role']).toBe('ORGANIZER');
  });
});
