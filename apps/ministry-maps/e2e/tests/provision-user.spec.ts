import { expect, test } from '../fixtures';
import { callFunction } from '../firebase/functions.util';
import { mintIdToken } from '../firebase/firestore-rules.util';
import { RoleEnum } from '../../src/models/enums/role';

/**
 * UC-USERS-18..23 — server-side user provisioning via the `provisionUserFromInvite`
 * Cloud Function, exercised for real over the Functions emulator REST protocol.
 *
 * User profiles can no longer be created client-side (firestore.rules denies all
 * client `users` creation): the callable is the single provisioning path, which
 * validates the invitation and consumes it atomically.
 */
test.describe('provisionUserFromInvite callable (UC-USERS-18..23)', () => {
  const NEW_USER_EMAIL = 'novo.organizador@example.com';
  const NEW_USER_UID = 'e2e-new-organizer';

  test('UC-USERS-18 — Valid invite provisions the user and consumes the invite atomically', async ({
    seed,
    db,
  }) => {
    const invite = seed.factories.buildInvitationLink({
      congregationId: seed.ids.congregation,
      role: RoleEnum.ORGANIZER,
      email: NEW_USER_EMAIL,
    });
    await seed.write({ invitationLinks: [invite] });

    // The caller exists in Auth (sign-in already happened) but has no profile yet.
    await db.auth.createUser({ uid: NEW_USER_UID, email: NEW_USER_EMAIL, displayName: 'Novo Organizador' });
    const token = await mintIdToken(NEW_USER_UID, { email: NEW_USER_EMAIL, name: 'Novo Organizador' });

    const result = await callFunction('provisionUserFromInvite', { inviteId: invite.id }, token);
    expect(result.status).toBe('ok');

    // ⟶ HAND-OFF (Firestore): user doc created with the invite's role + congregation.
    const userSnap = await db.getDocSnapshot(db.collections.users, NEW_USER_UID);
    expect(userSnap.exists).toBe(true);
    expect(userSnap.data()?.['role']).toBe(RoleEnum.ORGANIZER);
    expect(userSnap.data()?.['congregation']?.id).toBe(seed.ids.congregation);

    // ⟶ HAND-OFF (Firestore): invite consumed in the same transaction.
    const inviteAfter = await db.getDoc(db.collections.invitation_links, invite.id);
    expect(inviteAfter?.['isValid']).toBe(false);
    expect(inviteAfter?.['usedAt']).toBeTruthy();
    expect(inviteAfter?.['usedBy']).toBe(NEW_USER_EMAIL);
  });

  test('UC-USERS-19 — Re-login of an already provisioned user is idempotent (invite untouched)', async ({
    seed,
    db,
  }) => {
    const invite = seed.factories.buildInvitationLink({
      congregationId: seed.ids.congregation,
      role: RoleEnum.PUBLISHER,
      email: NEW_USER_EMAIL,
    });
    await seed.write({ invitationLinks: [invite] });
    await db.auth.createUser({ uid: NEW_USER_UID, email: NEW_USER_EMAIL });

    const token = await mintIdToken(NEW_USER_UID, { email: NEW_USER_EMAIL });

    const first = await callFunction('provisionUserFromInvite', { inviteId: invite.id }, token);
    expect(first.status).toBe('ok');

    const usedAtFirst = (await db.getDoc(db.collections.invitation_links, invite.id))?.['usedAt'];

    // Second call: the profile already exists, so the invite must not be re-consumed.
    const second = await callFunction('provisionUserFromInvite', { inviteId: invite.id }, token);
    expect(second.status).toBe('ok');
    expect(second.body['result']).toMatchObject({ id: NEW_USER_UID, role: RoleEnum.PUBLISHER });

    const inviteAfter = await db.getDoc(db.collections.invitation_links, invite.id);
    expect(inviteAfter?.['usedAt']).toStrictEqual(usedAtFirst);
    expect((await db.getCollectionDocs(db.collections.users)).find(u => u['id'] === NEW_USER_UID)).toBeDefined();
  });

  test('UC-USERS-20 — A consumed invite cannot provision a different caller', async ({ seed, db }) => {
    const invite = seed.factories.buildInvitationLink({
      congregationId: seed.ids.congregation,
      role: RoleEnum.ORGANIZER,
    });
    await seed.write({ invitationLinks: [invite] });

    await db.auth.createUser({ uid: NEW_USER_UID, email: NEW_USER_EMAIL });
    const token = await mintIdToken(NEW_USER_UID, { email: NEW_USER_EMAIL });

    const first = await callFunction('provisionUserFromInvite', { inviteId: invite.id }, token);
    expect(first.status).toBe('ok');

    await db.auth.createUser({ uid: 'e2e-attacker', email: 'attacker@example.com' });
    const attackerToken = await mintIdToken('e2e-attacker', { email: 'attacker@example.com' });
    const second = await callFunction('provisionUserFromInvite', { inviteId: invite.id }, attackerToken);
    expect(second.status).toBe('FAILED_PRECONDITION');

    const attackerDoc = await db.getDoc(db.collections.users, 'e2e-attacker');
    expect(attackerDoc).toBeUndefined();
  });

  test('UC-USERS-21 — Email-pinned invite rejects a caller with a different email (case-insensitive match)', async ({
    seed,
    db,
  }) => {
    const invite = seed.factories.buildInvitationLink({
      congregationId: seed.ids.congregation,
      role: RoleEnum.ORGANIZER,
      email: ' pinned.person@example.com '.trim(),
    });
    await seed.write({ invitationLinks: [invite] });

    await db.auth.createUser({ uid: NEW_USER_UID, email: 'someone.else@example.com' });
    const token = await mintIdToken(NEW_USER_UID, { email: 'someone.else@example.com' });

    const result = await callFunction('provisionUserFromInvite', { inviteId: invite.id }, token);
    expect(result.status).toBe('PERMISSION_DENIED');
    expect((result.body['error'] as Record<string, unknown>)['message']).toContain('INVALID_EMAIL');

    expect(await db.getDoc(db.collections.users, NEW_USER_UID)).toBeUndefined();
    expect((await db.getDoc(db.collections.invitation_links, invite.id))?.['isValid']).toBe(true);
  });

  test('UC-USERS-22 — Unauthenticated calls are rejected', async ({ seed }) => {
    const invite = seed.factories.buildInvitationLink({ congregationId: seed.ids.congregation });
    await seed.write({ invitationLinks: [invite] });

    const result = await callFunction('provisionUserFromInvite', { inviteId: invite.id });
    expect(result.status).toBe('UNAUTHENTICATED');
  });

  test('UC-USERS-23 — An invite can never grant APP_ADMIN (defense in depth)', async ({ seed, db }) => {
    const invite = seed.factories.buildInvitationLink({
      congregationId: seed.ids.congregation,
      role: RoleEnum.APP_ADMIN,
    });
    await seed.write({ invitationLinks: [invite] });

    await db.auth.createUser({ uid: NEW_USER_UID, email: NEW_USER_EMAIL });
    const token = await mintIdToken(NEW_USER_UID, { email: NEW_USER_EMAIL });

    const result = await callFunction('provisionUserFromInvite', { inviteId: invite.id }, token);
    expect(result.status).toBe('PERMISSION_DENIED');

    expect(await db.getDoc(db.collections.users, NEW_USER_UID)).toBeUndefined();
    expect((await db.getDoc(db.collections.invitation_links, invite.id))?.['isValid']).toBe(true);
  });
});
