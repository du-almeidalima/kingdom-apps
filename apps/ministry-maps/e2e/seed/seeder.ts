import { Collections, auth, firestore } from '../config/firebase-admin.context';
import { TERRITORY_HISTORY_SUBCOLLECTION, congregationRef } from '../firebase/refs.util';
import { SeedDefinition, SeedResult, UserSeed } from './types';

const DEFAULT_PASSWORD = 'test-password-123';

/**
 * Writes a {@link SeedDefinition} to the Firestore + Auth emulators and returns
 * the created ids for assertions.
 *
 * Relationships and Firestore types handled here:
 * - `User.congregation` is written as a `DocumentReference` to
 *   `/congregations/{congregationId}` (the app queries users by this ref).
 * - A matching Auth emulator user is created with `uid === userDocId`, since the
 *   app keys `users/{uid}` by the auth uid.
 * - Territory `history` is written to the `territories/{id}/history`
 *   subcollection; the parent doc gets `recentHistory` (latest 5) and `lastVisit`.
 * - `Date` values are persisted by the Admin SDK as Firestore `Timestamp`s.
 */
export async function seed(def: SeedDefinition): Promise<SeedResult> {
  const batch = firestore.batch();

  for (const congregation of def.congregations) {
    batch.set(
      firestore.collection(Collections.congregations).doc(congregation.id),
      congregation,
    );
  }

  for (const user of def.users) {
    batch.set(
      firestore.collection(Collections.users).doc(user.id),
      toUserDocument(user),
    );
  }

  for (const territory of def.territories) {
    const { history, ...rest } = territory;
    const sortedHistory = [...history].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );

    const territoryRef = firestore
      .collection(Collections.territories)
      .doc(territory.id);
    batch.set(territoryRef, {
      ...rest,
      lastVisit: sortedHistory[0]?.date ?? null,
      recentHistory: sortedHistory.slice(0, 5),
    });

    for (const visit of history) {
      batch.set(
        territoryRef.collection(TERRITORY_HISTORY_SUBCOLLECTION).doc(visit.id),
        visit,
      );
    }
  }

  for (const designation of def.designations) {
    batch.set(
      firestore.collection(Collections.designations).doc(designation.id),
      designation,
    );
  }

  await batch.commit();
  await Promise.all(def.users.map(createAuthUser));

  return {
    congregationIds: def.congregations.map((c) => c.id),
    userIds: def.users.map((u) => u.id),
    territoryIds: def.territories.map((t) => t.id),
    designationIds: def.designations.map((d) => d.id),
  };
}

/** Maps a {@link UserSeed} to the stored user document, linking the congregation by reference. */
function toUserDocument(user: UserSeed) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    photoUrl: user.photoUrl,
    role: user.role,
    congregation: congregationRef(user.congregationId),
  };
}

/**
 * Creates the matching Auth emulator user (uid === Firestore user doc id).
 *
 * Handles the race condition from parallel test workers: if another worker
 * already created this uid between our `clearAuth` and this call, the
 * `already-exists` error is silently ignored.
 */
async function createAuthUser(user: UserSeed): Promise<unknown> {
  try {
    return await auth.createUser({
      uid: user.id,
      email: user.email,
      displayName: user.name,
      photoURL: user.photoUrl,
      password: user.password ?? DEFAULT_PASSWORD,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);

    // The Auth emulator returns "The user with the provided uid already exists."
    // This is expected when parallel workers share the emulator.
    if (message.toLowerCase().includes('already exists')) {
      return;
    }
    throw error;
  }
}
