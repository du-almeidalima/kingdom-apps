import { auth, firestore } from '../config/firebase-admin.context';
import { Collections, TERRITORY_HISTORY_SUBCOLLECTION } from './collections';
import { DEFAULT_PASSWORD } from '../config/auth.config';
import { SeedDefinition, SeedResult, UserSeed } from './types';

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
  const {
    congregations = [],
    users = [],
    territories = [],
    designations = [],
  } = def;

  const batch = firestore.batch();

  for (const congregation of congregations) {
    batch.set(
      firestore.collection(Collections.congregations).doc(congregation.id),
      congregation,
    );
  }

  for (const user of users) {
    batch.set(
      firestore.collection(Collections.users).doc(user.id),
      toUserDocument(user),
    );
  }

  for (const territory of territories) {
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

  for (const designation of designations) {
    batch.set(
      firestore.collection(Collections.designations).doc(designation.id),
      designation,
    );
  }

  await batch.commit();
  await Promise.all(users.map(createAuthUser));

  return {
    congregationIds: congregations.map((c) => c.id),
    userIds: users.map((u) => u.id),
    territoryIds: territories.map((t) => t.id),
    designationIds: designations.map((d) => d.id),
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
    congregation: firestore.doc(`${Collections.congregations}/${user.congregationId}`),
  };
}

/**
 * Creates the matching Auth emulator user (uid === Firestore user doc id).
 *
 * Runs under serial workers with a full emulator wipe before every test, so a
 * duplicate uid here means the caller seeded the same user twice — a bug, not
 * a race. Errors are rethrown with context rather than swallowed.
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
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to create Auth emulator user '${user.id}' (${user.email}): ${message}`,
      { cause: error },
    );
  }
}
