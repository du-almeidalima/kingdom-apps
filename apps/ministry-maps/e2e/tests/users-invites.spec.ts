import { expect, test } from '../fixtures';
import { UsersPage } from '../page-objects/users.page';
import { InviteCreateDialogPage } from '../page-objects/invite-create-dialog.page';
import { stubWindowOpen, getOpenedUrls } from '../utils/window-open-stub.util';

// ─── WP-23: invitation-link creation & sharing (UC-USERS-10..14) ────────────

test.describe('Invitation links (WP-23)', () => {
  test.use({ role: 'admin' });

  test('UC-USERS-10 — "Criar Link de Convite" FAB is visible to ADMIN and opens the dialog', async ({
    authenticatedPage,
    signInAs,
    page,
  }) => {
    const usersPage = new UsersPage(authenticatedPage);
    await usersPage.goto();
    await expect(usersPage.inviteFab).toBeVisible();

    await usersPage.inviteFab.click();

    const inviteDialog = new InviteCreateDialogPage(authenticatedPage);
    await expect(inviteDialog.dialog).toBeVisible();
    await expect(inviteDialog.emailInput).toBeVisible();

    // Verification for non-ADMIN role (e.g. ORGANIZER): FAB is hidden.
    await signInAs('organizer');
    const organizerUsersPage = new UsersPage(page);
    await organizerUsersPage.goto();
    await expect(organizerUsersPage.inviteFab).toHaveCount(0);
  });

  test('UC-USERS-11 — Invite dialog defaults to ORGANIZER, optional email, and persists DocumentReference congregation', async ({
    authenticatedPage,
    seed,
    db,
  }) => {
    const usersPage = new UsersPage(authenticatedPage);
    await usersPage.goto();
    await usersPage.inviteFab.click();

    const inviteDialog = new InviteCreateDialogPage(authenticatedPage);
    await expect(inviteDialog.dialog).toBeVisible();

    // Fill optional email
    await inviteDialog.emailInput.fill('invitee@example.com');
    await inviteDialog.submit();

    // Dialog transitions to copy-link view
    await expect(inviteDialog.copyLinkText).toBeVisible();
    const linkText = await inviteDialog.copyLinkText.innerText();
    expect(linkText).toContain('/sign-in/');

    const inviteId = linkText.substring(linkText.lastIndexOf('/') + 1).trim();
    expect(inviteId.length).toBeGreaterThan(0);

    // Verify Firestore doc in `invitation_links` collection
    const inviteDoc = await db.firestore.collection('invitation_links').doc(inviteId).get();
    expect(inviteDoc.exists).toBe(true);
    const data = inviteDoc.data();
    expect(data?.['createdBy']).toBe('carlos.almeida@example.com');
    expect(data?.['role']).toBe('ORGANIZER');
    expect(data?.['isValid']).toBe(true);
    expect(data?.['email']).toBe('invitee@example.com');

    // congregation is stored as a DocumentReference pointing to congregations/{id}
    expect(data?.['congregation']?.id).toBe(seed.ids.congregation);
    expect(data?.['congregation']?.path).toContain(seed.ids.congregation);

    // Blank-email persistence leg: blank input persists as `email: ''`
    await inviteDialog.closeButton.click();
    await usersPage.inviteFab.click();
    await inviteDialog.submit();

    await expect(inviteDialog.copyLinkText).toBeVisible();
    const blankLinkText = await inviteDialog.copyLinkText.innerText();
    const blankInviteId = blankLinkText.substring(blankLinkText.lastIndexOf('/') + 1).trim();

    const blankInviteDoc = await db.firestore.collection('invitation_links').doc(blankInviteId).get();
    expect(blankInviteDoc.data()?.['email']).toBe('');
  });

  test('UC-USERS-13 — The generated link is `${environment.baseUrl}sign-in/{id}` and is copyable to clipboard', async ({
    authenticatedPage,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const usersPage = new UsersPage(authenticatedPage);
    await usersPage.goto();
    await usersPage.inviteFab.click();

    const inviteDialog = new InviteCreateDialogPage(authenticatedPage);
    await expect(inviteDialog.dialog).toBeVisible();
    await inviteDialog.submit();

    await expect(inviteDialog.copyLinkText).toBeVisible();
    const linkText = (await inviteDialog.copyLinkText.innerText()).trim();

    await inviteDialog.copyButton.click();

    const clipboardText = await authenticatedPage.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText.trim()).toBe(linkText);
  });

  test('UC-USERS-14 — "Enviar" builds a whatsapp:// link and preserves the invite doc state', async ({
    authenticatedPage,
    db,
  }) => {
    await stubWindowOpen(authenticatedPage);

    const usersPage = new UsersPage(authenticatedPage);
    await usersPage.goto();
    await usersPage.inviteFab.click();

    const inviteDialog = new InviteCreateDialogPage(authenticatedPage);
    await expect(inviteDialog.dialog).toBeVisible();
    await inviteDialog.submit();

    await expect(inviteDialog.copyLinkText).toBeVisible();
    const linkText = (await inviteDialog.copyLinkText.innerText()).trim();
    const inviteId = linkText.substring(linkText.lastIndexOf('/') + 1).trim();

    await inviteDialog.sendButton.click();

    const openedUrls = await getOpenedUrls(authenticatedPage);
    expect(openedUrls.length).toBeGreaterThan(0);
    expect(openedUrls[0]).toContain('whatsapp://send?text=');
    expect(openedUrls[0]).toContain(inviteId);

    // Invite doc state remains untouched (isValid still true)
    const inviteDoc = await db.firestore.collection('invitation_links').doc(inviteId).get();
    expect(inviteDoc.data()?.['isValid']).toBe(true);
  });
});
