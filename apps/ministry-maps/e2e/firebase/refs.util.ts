import * as admin from 'firebase-admin';

import { firestore, Collections } from '../config/firebase-admin.context';

// TODO: We should be using the values from the collections of Angular or have this defined on the factories
/** Subcollection that stores a territory's full visit history. */
export const TERRITORY_HISTORY_SUBCOLLECTION = 'history';

// TODO: These should be defined on the factories, we may not need this file.
/**
 * Returns a `DocumentReference` to a congregation. The app stores
 * `User.congregation` as a reference to `/congregations/{id}`.
 */
export function congregationRef(id: string): admin.firestore.DocumentReference {
  return firestore.doc(`${Collections.congregations}/${id}`);
}

/** Returns a `DocumentReference` to a user. */
export function userRef(id: string): admin.firestore.DocumentReference {
  return firestore.doc(`${Collections.users}/${id}`);
}

/** Returns a `DocumentReference` to a territory. */
export function territoryRef(id: string): admin.firestore.DocumentReference {
  return firestore.doc(`${Collections.territories}/${id}`);
}

/** Returns a `DocumentReference` to a specific territory visit-history entry. */
export function territoryHistoryRef(
  territoryId: string,
  visitId: string,
): admin.firestore.DocumentReference {
  return firestore.doc(
    `${Collections.territories}/${territoryId}/${TERRITORY_HISTORY_SUBCOLLECTION}/${visitId}`,
  );
}

/** Returns a `DocumentReference` to a designation. */
export function designationRef(id: string): admin.firestore.DocumentReference {
  return firestore.doc(`${Collections.designations}/${id}`);
}
