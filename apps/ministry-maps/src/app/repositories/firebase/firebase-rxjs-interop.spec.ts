import { lastValueFrom } from 'rxjs';
import { onAuthStateChanged } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import type { DocumentData, DocumentReference } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { Functions } from 'firebase/functions';

import { authState$, collectionData$, docData$, httpsCallableData$ } from './firebase-rxjs-interop';

jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn() }));
jest.mock('firebase/firestore', () => ({ onSnapshot: jest.fn() }));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));

const auth = {} as Auth;
const functions = {} as Functions;

const fakeDocRef = <T>() => ({ id: 'doc-1' }) as DocumentReference<T, DocumentData>;

interface SnapshotLike<T> {
  exists: () => boolean;
  id: string;
  data: () => T | undefined;
}

const snapshot = <T>(data: T | undefined, exists = data !== undefined, id = 'doc-1'): SnapshotLike<T> => ({
  exists: () => exists,
  id,
  data: () => data,
});

type SnapshotObserver = { next: (snapshot: unknown) => void; error: (error: unknown) => void };

/** Installs the onSnapshot mock, capturing the observer it is handed, plus its unsubscribe. */
const mockOnSnapshot = () => {
  const unsubscribe = jest.fn();
  let observer: SnapshotObserver;

  (onSnapshot as jest.Mock).mockImplementation(
    (_reference: unknown, _options: unknown, handedObserver: SnapshotObserver) => {
      observer = handedObserver;
      return unsubscribe;
    },
  );

  return {
    unsubscribe,
    push: (snap: unknown) => observer.next(snap),
    error: (err: unknown) => observer.error(err),
  };
};

/** rxfire/AngularFire parity: listeners must attach with metadata-change snapshots included. */
const expectMetadataChangesIncluded = () =>
  expect(onSnapshot).toHaveBeenCalledWith(
    expect.anything(),
    { includeMetadataChanges: true },
    expect.objectContaining({ next: expect.any(Function), error: expect.any(Function) }),
  );

describe('authState$', () => {
  afterEach(() => jest.clearAllMocks());

  it('emits the current state and every subsequent change pushed by onAuthStateChanged', () => {
    const unsubscribe = jest.fn();
    let pushUser: (user: unknown) => void = () => undefined;
    (onAuthStateChanged as jest.Mock).mockImplementation((_auth, next) => {
      pushUser = next;
      return unsubscribe;
    });

    const emissions: unknown[] = [];
    const subscription = authState$(auth).subscribe((user) => emissions.push(user));

    pushUser({ uid: 'u-1' });
    pushUser(null);

    expect(emissions).toEqual([{ uid: 'u-1' }, null]);
    expect(onAuthStateChanged).toHaveBeenCalledWith(
      auth,
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );

    subscription.unsubscribe();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('propagates auth errors to the subscriber (mirrors the rxfire wiring)', () => {
    let pushError: (error: Error) => void = () => undefined;
    (onAuthStateChanged as jest.Mock).mockImplementation((_auth, _next, error) => {
      pushError = error;
      return jest.fn();
    });

    const received: unknown[] = [];
    authState$(auth).subscribe({ error: (err) => received.push(err) });

    const failure = new Error('auth unavailable');
    pushError(failure);

    expect(received).toEqual([failure]);
  });
});

describe('docData$', () => {
  afterEach(() => jest.clearAllMocks());

  it('emits the document data on every snapshot and undefined while the doc is missing', () => {
    const listener = mockOnSnapshot();

    const emissions: unknown[] = [];
    const subscription = docData$(fakeDocRef<{ name: string }>()).subscribe((doc) => emissions.push(doc));

    listener.push(snapshot({ name: 'first' }));
    listener.push(snapshot(undefined, false));
    listener.push(snapshot({ name: 'back' }));

    expect(emissions).toEqual([{ name: 'first' }, undefined, { name: 'back' }]);
    expectMetadataChangesIncluded();
    subscription.unsubscribe();
  });

  it('merges the snapshot id when idField is provided', () => {
    const listener = mockOnSnapshot();

    const emissions: unknown[] = [];
    docData$(fakeDocRef<{ name: string }>(), { idField: 'id' }).subscribe((doc) => emissions.push(doc));

    listener.push(snapshot({ name: 'first' }));

    expect(emissions).toEqual([{ name: 'first', id: 'doc-1' }]);
  });

  it('propagates listener errors to the subscriber', () => {
    const listener = mockOnSnapshot();
    const failure = new Error('firestore unavailable');

    const received: unknown[] = [];
    docData$(fakeDocRef()).subscribe({ error: (err) => received.push(err) });

    listener.error(failure);

    expect(received).toEqual([failure]);
  });

  it('detaches the SDK listener on unsubscribe', () => {
    const listener = mockOnSnapshot();

    const subscription = docData$(fakeDocRef()).subscribe();
    subscription.unsubscribe();

    expect(listener.unsubscribe).toHaveBeenCalled();
  });
});

describe('collectionData$', () => {
  afterEach(() => jest.clearAllMocks());

  const querySnapshot = (docs: SnapshotLike<unknown>[]) => ({ docs });

  it('emits the mapped documents of every snapshot', () => {
    const listener = mockOnSnapshot();

    const emissions: unknown[] = [];
    const subscription = collectionData$<{ name: string }>({} as never).subscribe((docs) => emissions.push(docs));

    listener.push(querySnapshot([snapshot({ name: 'a' }, true, 'a'), snapshot({ name: 'b' }, true, 'b')]));
    listener.push(querySnapshot([snapshot({ name: 'a' }, true, 'a')]));

    expect(emissions).toEqual([[{ name: 'a' }, { name: 'b' }], [{ name: 'a' }]]);
    expectMetadataChangesIncluded();
    subscription.unsubscribe();
  });

  it('emits an empty array for empty results (no hang)', () => {
    const listener = mockOnSnapshot();

    const emissions: unknown[][] = [];
    collectionData$({} as never).subscribe((docs) => emissions.push(docs));

    listener.push(querySnapshot([]));

    expect(emissions).toEqual([[]]);
  });

  it('merges the snapshot id when idField is provided', () => {
    const listener = mockOnSnapshot();

    const emissions: unknown[] = [];
    collectionData$<{ name: string }>({} as never, { idField: 'id' }).subscribe((docs) => emissions.push(docs));

    listener.push(querySnapshot([snapshot({ name: 'a' }, true, 'a-1')]));

    expect(emissions).toEqual([[{ name: 'a', id: 'a-1' }]]);
  });

  it('detaches the SDK listener on unsubscribe', () => {
    const listener = mockOnSnapshot();

    const subscription = collectionData$({} as never).subscribe();
    subscription.unsubscribe();

    expect(listener.unsubscribe).toHaveBeenCalled();
  });
});

describe('httpsCallableData$', () => {
  afterEach(() => jest.clearAllMocks());

  it('invokes the callable only on subscribe, unwraps result.data and re-executes on re-subscribe', async () => {
    const callable = jest.fn(() => Promise.resolve({ result: 'raw', data: 'UNWRAPPED' }));
    (httpsCallable as jest.Mock).mockReturnValue(callable);

    const deleteUser = httpsCallableData$<string, string>(functions, 'deleteUser');

    // The SDK factory itself is only invoked when the data function is called.
    expect(httpsCallable).not.toHaveBeenCalled();
    expect(callable).not.toHaveBeenCalled();

    const observable = deleteUser('user-1');

    expect(httpsCallable).toHaveBeenCalledWith(functions, 'deleteUser', undefined);
    // Cold: constructing the observable must not fire the request yet.
    expect(callable).not.toHaveBeenCalled();

    await expect(lastValueFrom(observable)).resolves.toBe('UNWRAPPED');
    expect(callable).toHaveBeenCalledWith('user-1');

    // Re-subscription re-executes the callable.
    await expect(lastValueFrom(observable)).resolves.toBe('UNWRAPPED');
    expect(callable).toHaveBeenCalledTimes(2);
  });

  it('propagates callable failures to the subscriber', async () => {
    const failure = new Error('permission denied');
    const callable = jest.fn(() => Promise.reject(failure));
    (httpsCallable as jest.Mock).mockReturnValue(callable);

    const deleteUser = httpsCallableData$<string, void>(functions, 'deleteUser');

    await expect(lastValueFrom(deleteUser('user-1'))).rejects.toBe(failure);
  });
});
