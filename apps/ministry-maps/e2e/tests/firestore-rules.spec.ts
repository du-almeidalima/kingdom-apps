import { expect, test } from '../fixtures';
import {
  createDocAs,
  deleteDocAs,
  mintIdToken,
  readDocAs,
  updateDocAs,
} from '../firebase/firestore-rules.util';

test.describe('Firestore Security Rules', () => {
  test('UC-RULES-01 — Anonymous read access to public collections (200 allowed)', async ({
    seed,
  }) => {
    const invite = seed.factories.buildInvitationLink({
      congregationId: seed.ids.congregation,
    });
    await seed.write({ invitationLinks: [invite] });

    // designations is public
    const desigStatus = await readDocAs(`designations/${seed.ids.designation}`);
    expect(desigStatus).toBe(200);

    // territories is public
    const terrStatus = await readDocAs(`territories/${seed.ids.territories[0]}`);
    expect(terrStatus).toBe(200);

    // congregations is public
    const congStatus = await readDocAs(`congregations/${seed.ids.congregation}`);
    expect(congStatus).toBe(200);

    // invitation_links is public
    const inviteStatus = await readDocAs(`invitation_links/${invite.id}`);
    expect(inviteStatus).toBe(200);
  });

  test('UC-RULES-02 — Anonymous read access to non-public collections is denied (403)', async ({
    db,
    seed,
  }) => {
    // Seed a log document via Admin SDK
    await db.firestore.collection(db.collections.logs).doc('seed-log-for-read').set({
      message: 'Seed log message',
      expireAt: new Date(),
    });

    // Anonymous read users -> 403
    const userStatus = await readDocAs(`users/${seed.ids.adminUser}`);
    expect(userStatus).toBe(403);

    // Anonymous read logs -> 403
    const logStatus = await readDocAs('logs/seed-log-for-read');
    expect(logStatus).toBe(403);
  });

  test('UC-RULES-03 — Logs read access: PUBLISHER denied (403) vs APP_ADMIN allowed (200)', async ({
    db,
    seed,
  }) => {
    await db.firestore.collection('logs').doc('audit-log-entry').set({
      message: 'Audit log entry',
      expireAt: new Date(),
    });

    // Publisher token -> 403 denied
    const publisherToken = await mintIdToken(seed.ids.publisherUsers[0]);
    const pubStatus = await readDocAs('logs/audit-log-entry', publisherToken);
    expect(pubStatus).toBe(403);

    // APP_ADMIN token -> 200 allowed
    const appAdminToken = await mintIdToken(seed.ids.appAdminUser);
    const adminStatus = await readDocAs('logs/audit-log-entry', appAdminToken);
    expect(adminStatus).toBe(200);
  });

  test('UC-RULES-04 — Anonymous write to logs allowed (200), write to invitation_links denied (403)', async ({
    db,
    seed,
  }) => {
    // Anonymous create log -> 200 allowed
    const logStatus = await createDocAs('logs/anon-created-log', {
      message: 'Client error report',
      level: 'ERROR',
    });
    expect(logStatus).toBe(200);

    const createdLog = await db.getDoc(db.collections.logs, 'anon-created-log');
    expect(createdLog?.['message']).toBe('Client error report');

    // Anonymous create invite -> 403 denied
    const createInviteStatus = await createDocAs('invitation_links/anon-invite', {
      isValid: true,
      role: 'PUBLISHER',
    });
    expect(createInviteStatus).toBe(403);
    expect(await db.getDoc(db.collections.invitation_links, 'anon-invite')).toBeUndefined();

    // Anonymous update existing invite -> 403 denied
    const invite = seed.factories.buildInvitationLink({
      congregationId: seed.ids.congregation,
      isValid: true,
    });
    await seed.write({ invitationLinks: [invite] });

    const updateInviteStatus = await updateDocAs(`invitation_links/${invite.id}`, {
      isValid: false,
    });
    expect(updateInviteStatus).toBe(403);

    const storedInvite = await db.getDoc(db.collections.invitation_links, invite.id);
    expect(storedInvite?.['isValid']).toBe(true);
  });

  test('UC-RULES-05 — Territory write matrix: anonymous update allowed (200), create/delete denied (403)', async ({
    db,
    seed,
  }) => {
    const targetTerritoryId = seed.ids.territories[0];

    // Anonymous update territory -> 200 allowed
    const updateStatus = await updateDocAs(`territories/${targetTerritoryId}`, {
      address: 'Rua Atualizada Anonimamente, 100',
    });
    expect(updateStatus).toBe(200);

    const updatedTerritory = await db.getDoc(db.collections.territories, targetTerritoryId);
    expect(updatedTerritory?.['address']).toBe('Rua Atualizada Anonimamente, 100');

    // Anonymous create territory -> 403 denied
    const createStatus = await createDocAs('territories/anon-new-territory', {
      address: 'Rua Nao Autorizada, 999',
      city: 'São Paulo',
    });
    expect(createStatus).toBe(403);
    expect(await db.getDoc(db.collections.territories, 'anon-new-territory')).toBeUndefined();

    // Anonymous delete territory -> 403 denied
    const deleteStatus = await deleteDocAs(`territories/${targetTerritoryId}`);
    expect(deleteStatus).toBe(403);
    expect(await db.getDoc(db.collections.territories, targetTerritoryId)).toBeDefined();
  });

  test('UC-RULES-06 — Territory history write matrix: anonymous create, update, and delete are allowed (200)', async ({
    db,
    seed,
  }) => {
    const territoryId = seed.ids.territories[0];

    // Anonymous create history subcollection document -> 200 allowed
    const createStatus = await createDocAs(`territories/${territoryId}/history/anon-history-entry`, {
      visitOutcome: 0,
      notes: 'Visita realizada por publicador anônimo',
    });
    expect(createStatus).toBe(200);

    const historyDocs = await db.getSubcollectionDocs(
      db.collections.territories,
      territoryId,
      db.historySubcollection,
    );
    const created = historyDocs.find(
      (h) => h['notes'] === 'Visita realizada por publicador anônimo',
    );
    expect(created).toBeDefined();

    // Seed an existing history entry for update/delete attempts
    await db.firestore
      .collection(db.collections.territories)
      .doc(territoryId)
      .collection(db.historySubcollection)
      .doc('fixed-history-entry')
      .set({
        visitOutcome: 0,
        notes: 'Original history note',
      });

    // Anonymous update history doc (edit visit) -> 200 allowed
    const updateStatus = await updateDocAs(
      `territories/${territoryId}/history/fixed-history-entry`,
      { notes: 'Updated note by anonymous publisher' },
    );
    expect(updateStatus).toBe(200);

    const fixedDoc = await db.firestore
      .collection(db.collections.territories)
      .doc(territoryId)
      .collection(db.historySubcollection)
      .doc('fixed-history-entry')
      .get();
    expect(fixedDoc.data()?.['notes']).toBe('Updated note by anonymous publisher');

    // Anonymous delete history doc (undo visit) -> 200 allowed
    const deleteStatus = await deleteDocAs(
      `territories/${territoryId}/history/fixed-history-entry`,
    );
    expect(deleteStatus).toBe(200);

    const survivingDoc = await db.firestore
      .collection(db.collections.territories)
      .doc(territoryId)
      .collection(db.historySubcollection)
      .doc('fixed-history-entry')
      .get();
    expect(survivingDoc.exists).toBe(false);
  });

  test('UC-RULES-07 — Authenticated user can read and write non-public collections (200 allowed)', async ({
    db,
    seed,
  }) => {
    const adminToken = await mintIdToken(seed.ids.adminUser);

    // Read users/{uid} as authenticated user -> 200
    const readStatus = await readDocAs(`users/${seed.ids.adminUser}`, adminToken);
    expect(readStatus).toBe(200);

    // Update users/{uid} as authenticated user -> 200
    const updateStatus = await updateDocAs(
      `users/${seed.ids.adminUser}`,
      { name: 'Admin Name Updated' },
      adminToken,
    );
    expect(updateStatus).toBe(200);

    const updatedUser = await db.getDoc(db.collections.users, seed.ids.adminUser);
    expect(updatedUser?.['name']).toBe('Admin Name Updated');
  });

  test('UC-RULES-08 — Users read matrix: self and elevated same-congregation allowed, others denied', async ({
    seed,
  }) => {
    const publisherToken = await mintIdToken(seed.ids.publisherUsers[0]);
    const organizerToken = await mintIdToken(seed.ids.organizerUser);

    // Publisher reads own profile -> 200
    expect(await readDocAs(`users/${seed.ids.publisherUsers[0]}`, publisherToken)).toBe(200);

    // Publisher reads someone else -> 403
    expect(await readDocAs(`users/${seed.ids.adminUser}`, publisherToken)).toBe(403);

    // Elevated role (ORGANIZER) reads same-congregation user -> 200
    expect(await readDocAs(`users/${seed.ids.publisherUsers[0]}`, organizerToken)).toBe(200);
  });

  test('UC-RULES-09 — Users documents can never be created client-side (403 for everyone)', async ({
    db,
    seed,
  }) => {
    const publisherToken = await mintIdToken(seed.ids.publisherUsers[0]);

    // Anonymous forged create -> 403
    expect(await createDocAs('users/anon-forged', { role: 'ADMIN' })).toBe(403);

    // Authenticated forged create (role escalation attempt) -> 403
    expect(await createDocAs('users/authed-forged', { role: 'ADMIN' }, publisherToken)).toBe(403);

    expect(await db.getDoc(db.collections.users, 'anon-forged')).toBeUndefined();
    expect(await db.getDoc(db.collections.users, 'authed-forged')).toBeUndefined();
  });

  test('UC-RULES-10 — Self-update matrix: name allowed (200), role escalation denied (403)', async ({
    db,
    seed,
  }) => {
    const publisherToken = await mintIdToken(seed.ids.publisherUsers[0]);

    // Publisher updates own name -> 200
    expect(
      await updateDocAs(`users/${seed.ids.publisherUsers[0]}`, { name: 'Ana Souza Renomeada' }, publisherToken)
    ).toBe(200);
    const stored = await db.getDoc(db.collections.users, seed.ids.publisherUsers[0]);
    expect(stored?.['name']).toBe('Ana Souza Renomeada');

    // Publisher self-escalates to ADMIN -> 403
    expect(
      await updateDocAs(`users/${seed.ids.publisherUsers[0]}`, { role: 'ADMIN' }, publisherToken)
    ).toBe(403);
    const roleStored = await db.getDoc(db.collections.users, seed.ids.publisherUsers[0]);
    expect(roleStored?.['role']).toBe('PUBLISHER');
  });

  test('UC-RULES-11 — ADMIN edit matrix: same-congregation edits allowed (200), protected targets and role grants denied (403)', async ({
    db,
    seed,
  }) => {
    const adminToken = await mintIdToken(seed.ids.adminUser);
    const publisherToken = await mintIdToken(seed.ids.publisherUsers[0]);

    // ADMIN renames a same-congregation publisher -> 200
    expect(
      await updateDocAs(`users/${seed.ids.publisherUsers[0]}`, { name: 'Ana Editada Pelo Admin' }, adminToken)
    ).toBe(200);

    // ADMIN touches a SUPERINTENDENT profile -> 403
    expect(
      await updateDocAs(`users/${seed.ids.superintendentUser}`, { name: 'Felipe Hackeado' }, adminToken)
    ).toBe(403);

    // ADMIN grants SUPERINTENDENT to a publisher -> 403
    expect(
      await updateDocAs(`users/${seed.ids.publisherUsers[0]}`, { role: 'SUPERINTENDENT' }, adminToken)
    ).toBe(403);
    const stored = await db.getDoc(db.collections.users, seed.ids.publisherUsers[0]);
    expect(stored?.['role']).toBe('PUBLISHER');

    // Publisher edits another user -> 403
    expect(
      await updateDocAs(`users/${seed.ids.adminUser}`, { name: 'Carlos Hackeado' }, publisherToken)
    ).toBe(403);
    const adminStored = await db.getDoc(db.collections.users, seed.ids.adminUser);
    expect(adminStored?.['name']).toBe('Carlos Almeida');
  });

  test('UC-RULES-12 — Users delete matrix: ADMIN same-congregation allowed (200), protected targets and non-admins denied (403)', async ({
    db,
    seed,
  }) => {
    const adminToken = await mintIdToken(seed.ids.adminUser);
    const publisherToken = await mintIdToken(seed.ids.publisherUsers[0]);

    // ADMIN deletes a same-congregation publisher -> 200
    expect(await deleteDocAs(`users/${seed.ids.publisherUsers[1]}`, adminToken)).toBe(200);
    expect(await db.getDoc(db.collections.users, seed.ids.publisherUsers[1])).toBeUndefined();

    // ADMIN deletes a SUPERINTENDENT -> 403
    expect(await deleteDocAs(`users/${seed.ids.superintendentUser}`, adminToken)).toBe(403);
    expect(await db.getDoc(db.collections.users, seed.ids.superintendentUser)).toBeDefined();

    // Publisher deletes anyone -> 403
    expect(await deleteDocAs(`users/${seed.ids.adminUser}`, publisherToken)).toBe(403);
    expect(await db.getDoc(db.collections.users, seed.ids.adminUser)).toBeDefined();
  });
});
