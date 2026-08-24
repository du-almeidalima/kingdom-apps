import { test, expect } from '../fixtures';
import { SignInPage } from '../page-objects/sign-in.page';

test.describe('WP-09: Invite page render states', () => {
  test('UC-AUTH-14 — valid invite renders the Cadastrar card', async ({ page, seed, db }) => {
    const invite = seed.factories.buildInvitationLink({ congregationId: seed.ids.congregation });
    await seed.write({ invitationLinks: [invite] });

    const signInPage = new SignInPage(page);
    await signInPage.goto(invite.id);

    await expect(signInPage.heading).toBeVisible();
    await expect(signInPage.image).toBeVisible();

    await expect(page.getByText('Bem vindo ao Ministry Maps ou MM!')).toBeVisible();
    await expect(page.getByText('Parar criar uma conta, clique no botão a baixo.')).toBeVisible();

    await expect(signInPage.googleButton).toBeVisible();
    await expect(signInPage.googleButton).toBeEnabled();

    await expect(signInPage.errorMessage).toBeHidden();

    const inviteDoc = await db.firestore.collection('invitation_links').doc(invite.id).get();
    const inviteData = inviteDoc.data();
    expect(inviteData?.['isValid']).toBe(true);
    expect(inviteData?.['usedAt']).toBeUndefined();
    expect(inviteData?.['usedBy']).toBeUndefined();
  });

  test('UC-AUTH-15 — missing invite id renders INVALID_LINK', async ({ page, db }) => {
    const signInPage = new SignInPage(page);
    await signInPage.goto('does-not-exist');

    await expect(signInPage.heading).toBeVisible();
    await expect(signInPage.errorMessage).toBeVisible();
    await expect(signInPage.errorMessage).toHaveText('Esse link de convite não é mais válido.');

    await expect(page.getByText('Por favor, peça para um administrador criar outro link para você.')).toBeVisible();

    await expect(signInPage.googleButton).toHaveCount(0);

    const inviteDoc = await db.firestore.collection('invitation_links').doc('does-not-exist').get();
    expect(inviteDoc.exists).toBe(false);
  });

  test('UC-AUTH-16 — consumed invite renders INVALID_LINK', async ({ page, seed, db }) => {
    const consumed = seed.factories.buildInvitationLink({
      congregationId: seed.ids.congregation,
      isValid: false,
      usedAt: new Date('2024-01-01'),
      usedBy: 'consumidor@example.com',
    });
    await seed.write({ invitationLinks: [consumed] });

    const signInPage = new SignInPage(page);
    await signInPage.goto(consumed.id);

    await expect(signInPage.heading).toBeVisible();
    await expect(signInPage.errorMessage).toBeVisible();
    await expect(signInPage.errorMessage).toHaveText('Esse link de convite não é mais válido.');

    await expect(page.getByText('Por favor, peça para um administrador criar outro link para você.')).toBeVisible();

    await expect(signInPage.googleButton).toHaveCount(0);

    const inviteDoc = await db.firestore.collection('invitation_links').doc(consumed.id).get();
    const inviteData = inviteDoc.data();
    expect(inviteData?.['isValid']).toBe(false);
  });
});
