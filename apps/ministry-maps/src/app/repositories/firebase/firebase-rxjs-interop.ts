import { defer, from, map, Observable } from 'rxjs';

import { onAuthStateChanged } from 'firebase/auth';
import type { Auth, User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import type { Functions, HttpsCallableOptions } from 'firebase/functions';
import { onSnapshot } from 'firebase/firestore';
import type { DocumentReference, Query, QueryDocumentSnapshot } from 'firebase/firestore';

/**
 * RxJS interop helpers over the vanilla Firebase JS SDK — the replacements for the AngularFire wrappers previously used
 * (`authState`, `docData`, `collectionData`, `httpsCallableData`).
 *
 * Semantics mirror the wrappers they replace: live listeners push every snapshot — including metadata-only ones,
 * attaching with `includeMetadataChanges: true` exactly like rxfire/AngularFire did — missing documents emit
 * `undefined`, empty queries emit `[]`, unsubscribing detaches the SDK listener, and callables execute only on subscribe.
 */

/** Live Firebase auth state: emits the current user (or `null`) on subscribe and on every change. */
export const authState$ = (auth: Auth): Observable<User | null> =>
  new Observable<User | null>((subscriber) =>
    onAuthStateChanged(
      auth,
      (user) => subscriber.next(user),
      (error) => subscriber.error(error),
      () => subscriber.complete(),
    ),
  );

interface SnapshotDataOptions {
  idField?: string;
}

const snapshotData = <T>(data: T, idField: string | undefined, snapshotId: string): T => {
  if (data === undefined || data === null || !idField) {
    return data;
  }

  return { ...data, [idField]: snapshotId } as T;
};

/**
 * Live document snapshots: emits the document data (through the reference's converter, when attached) on every
 * snapshot, or `undefined` while the document does not exist.
 */
export const docData$ = <T>(
  reference: DocumentReference<T>,
  options?: SnapshotDataOptions,
): Observable<T | undefined> =>
  new Observable<T | undefined>((subscriber) =>
    onSnapshot(
      reference,
      { includeMetadataChanges: true },
      {
        next: (snapshot) =>
          subscriber.next(snapshot.exists() ? snapshotData(snapshot.data(), options?.idField, snapshot.id) : undefined),
        error: (error) => subscriber.error(error),
      },
    ),
  );

/**
 * Live query snapshots: emits the mapped document data of every snapshot. Empty results emit `[]` (the assign page's
 * "empty congregation" path relies on it).
 */
export const collectionData$ = <T>(q: Query<T>, options?: SnapshotDataOptions): Observable<T[]> =>
  new Observable<T[]>((subscriber) =>
    onSnapshot(
      q,
      { includeMetadataChanges: true },
      {
        next: (snapshot) =>
          subscriber.next(
            snapshot.docs.map((doc: QueryDocumentSnapshot<T>) => snapshotData(doc.data(), options?.idField, doc.id)),
          ),
        error: (error) => subscriber.error(error),
      },
    ),
  );

/**
 * Cold observable callables: the returned function produces an Observable that invokes the callable **on subscribe**
 * and unwraps `result.data` — nothing executes until subscription, and re-subscription re-executes.
 */
export const httpsCallableData$ =
  <TData = unknown, TResult = unknown>(functions: Functions, name: string, options?: HttpsCallableOptions) =>
  (data: TData): Observable<TResult> => {
    const callable = httpsCallable<TData, TResult>(functions, name, options);

    return defer(() => from(callable(data)).pipe(map((result) => result.data)));
  };
