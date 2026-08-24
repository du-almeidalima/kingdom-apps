import { expect, test } from '../fixtures';
import { UsersPage } from '../page-objects/users.page';
import { InviteCreateDialogPage } from '../page-objects/invite-create-dialog.page';
import { SignInPage } from '../page-objects/sign-in.page';
import { expectData } from '../utils/firestore-assert.util';

/**
 * J-03 — Invite onboarding lifecycle: creation, valid open, consumed re-open.
 *
 * Composes UC-USERS-10/11/13 + UC-AUTH-14/16/22. The OAuth popup legs
 * (UC-AUTH-17 successful redemption, UC-AUTH-18 wrong-email) are ✋ manual-only
 * and never clicked in automation — the redemption is simulated by directly
 * marking the invite consumed (per the journey doc), and the wrong-email branch
 * has no automated alternative at all.
 *
 * Never click `Entrar com uma conta do Google` in this spec — its
 * presence/absence is the only automatable signal.
 */
test('J-03 — Invite creation → valid open → simulated consumption → INVALID_LINK re-open', async ({
  page,
  signInAs,
  seed,
  db,
}) => {
  const usersPage = new UsersPage(page);
  const inviteDialog = new InviteCreateDialogPage(page);
  const signInPage = new SignInPage(page);

  // ── Leg 1 — Admin creates an invite for an Organizer (UC-USERS-10/11/13) ───
  await signInAs('admin');
  await usersPage.goto();
  await usersPage.inviteFab.click();

  await expect(inviteDialog.dialog).toBeVisible();
  // UC-USERS-11: Organizador is the default radio.
  await inviteDialog.emailInput.fill('novo.organizador@example.com');
  await inviteDialog.submit();

  // UC-USERS-13: copy-link view.
  await expect(inviteDialog.copyLinkText).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Link de convite criado' })).toBeVisible();
  await expect(page.getByText('Compartilhe esse link com o irmão que vai acessar o aplicativo.')).toBeVisible();
  await expect(page.getByText('Esse link só pode ser usado uma vez.')).toBeVisible();

  const linkText = (await inviteDialog.copyLinkText.innerText()).trim();
  const inviteId = linkText.substring(linkText.lastIndexOf('/') + 1).trim();
  expect(inviteId.length).toBeGreaterThan(0);

  // ⟶ HAND-OFF (Firestore): creation-time shape.
  const inviteSnap = await db.firestore.collection(db.collections.invitation_links).doc(inviteId).get();
  const inviteData = expectData(inviteSnap.data());
  expect(inviteData['role']).toBe('ORGANIZER');
  expect(inviteData['email']).toBe('novo.organizador@example.com');
  expect(inviteData['isValid']).toBe(true);
  expect(inviteData['createdBy']).toBe('carlos.almeida@example.com'); // email, not uid
  expect(inviteData['congregation'].id).toBe(seed.ids.congregation); // DocumentReference
  expect(inviteData['usedAt']).toBeUndefined();
  expect(inviteData['usedBy']).toBeUndefined();

  // ── Leg 2 — Invitee opens the valid link (UC-AUTH-14) ─────────────────────
  // Switch identity to anonymous: sign out → the app navigates itself to /login.
  await page.evaluate(async () => {
    const api = window.__E2E__;
    if (!api) throw new Error('__E2E__ hook unavailable');
    await api.auth.signOut();
  });
  await expect(page).toHaveURL(/\/login/);

  await signInPage.goto(inviteId);

  await expect(signInPage.heading).toBeVisible();
  await expect(page.getByText('Bem vindo ao Ministry Maps ou MM!')).toBeVisible();
  await expect(page.getByText('Parar criar uma conta, clique no botão a baixo.')).toBeVisible();
  await expect(signInPage.googleButton).toBeVisible();
  await expect(signInPage.googleButton).toBeEnabled();
  await expect(signInPage.errorMessage).toBeHidden();

  // ⟶ HAND-OFF (Firestore): rendering never consumes the invite.
  const afterOpen = expectData(
    (await db.firestore.collection(db.collections.invitation_links).doc(inviteId).get()).data(),
  );
  expect(afterOpen['isValid']).toBe(true);
  expect(afterOpen['usedAt']).toBeUndefined();
  expect(afterOpen['usedBy']).toBeUndefined();

  // ── Leg 3 — Simulated consumption (✋ UC-AUTH-17 is manual-only) ───────────
  // The OAuth popup cannot be automated. Simulate the server-side effect of a
  // successful redemption: mark the invite consumed directly. Replace with the
  // real popup flow if the suite ever adopts emulator popup automation.
  await db.firestore.collection(db.collections.invitation_links).doc(inviteId).update({
    isValid: false,
    usedAt: new Date(),
    usedBy: 'novo.organizador@example.com',
  });

  // ⟶ HAND-OFF (Firestore): consumed shape.
  const consumed = expectData(
    (await db.firestore.collection(db.collections.invitation_links).doc(inviteId).get()).data(),
  );
  expect(consumed['isValid']).toBe(false);
  expect(consumed['usedBy']).toBe('novo.organizador@example.com');

  // ── Leg 4 — Re-opening the consumed link shows INVALID_LINK (UC-AUTH-16) ───
  await signInPage.goto(inviteId);

  await expect(signInPage.heading).toBeVisible(); // Cadastrar heading still renders
  await expect(signInPage.errorMessage).toBeVisible();
  await expect(signInPage.errorMessage).toHaveText('Esse link de convite não é mais válido.');
  await expect(page.getByText('Por favor, peça para um administrador criar outro link para você.')).toBeVisible();
  // The Google button lives in the @else (valid) branch — absent when consumed.
  await expect(signInPage.googleButton).toHaveCount(0);

  // ⟶ HAND-OFF (Firestore): the page performs no write on a consumed re-open.
  const unchanged = expectData(
    (await db.firestore.collection(db.collections.invitation_links).doc(inviteId).get()).data(),
  );
  expect(unchanged['isValid']).toBe(false);

  // ── FINAL SWEEP (Firestore) ────────────────────────────────────────────────
  // No invitee user doc was created by any automated leg (the OAuth popup never ran).
  expect(await db.queryWhere(db.collections.users, 'email', '==', 'novo.organizador@example.com')).toHaveLength(0);
});
