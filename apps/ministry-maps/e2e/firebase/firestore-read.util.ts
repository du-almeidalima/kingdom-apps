import * as admin from 'firebase-admin';

import { firestore } from '../config/firebase-admin.context';

/**
 * Reads a single document by collection + id, returning its data (or
 * `undefined` if it does not exist).
 */
export async function getDoc<T = admin.firestore.DocumentData>(
  collection: string,
  id: string,
): Promise<T | undefined> {
  const snapshot = await firestore.collection(collection).doc(id).get();
  return snapshot.exists ? (snapshot.data() as T) : undefined;
}

/**
 * Reads the raw document snapshot by collection + id (useful to inspect
 * `DocumentReference` / `Timestamp` fields on the stored data).
 */
export function getDocSnapshot(
  collection: string,
  id: string,
): Promise<admin.firestore.DocumentSnapshot> {
  return firestore.collection(collection).doc(id).get();
}

/** Reads all documents of a collection as plain data objects. */
export async function getCollectionDocs<T = admin.firestore.DocumentData>(
  collection: string,
): Promise<T[]> {
  const snapshot = await firestore.collection(collection).get();
  return snapshot.docs.map((doc) => doc.data() as T);
}

/** Reads all documents of a subcollection (e.g. `territories/{id}/history`). */
export async function getSubcollectionDocs<T = admin.firestore.DocumentData>(
  collection: string,
  id: string,
  subcollection: string,
): Promise<T[]> {
  const snapshot = await firestore
    .collection(collection)
    .doc(id)
    .collection(subcollection)
    .get();
  return snapshot.docs.map((doc) => doc.data() as T);
}

/**
 * Runs a simple `where` query against a collection and returns matching
 * documents as plain data objects.
 */
export async function queryWhere<T = admin.firestore.DocumentData>(
  collection: string,
  field: string,
  operator: admin.firestore.WhereFilterOp,
  value: unknown,
): Promise<T[]> {
  const snapshot = await firestore
    .collection(collection)
    .where(field, operator, value)
    .get();
  return snapshot.docs.map((doc) => doc.data() as T);
}
