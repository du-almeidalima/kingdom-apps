import {
  DocumentData,
  DocumentReference,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
} from 'firebase/firestore';

/**
 * Maps a raw Firestore document payload to its domain shape.
 *
 * The input intentionally stays `any`: callers hand in converters typed against their own
 * Firebase model (e.g. `(data: FirebaseTerritoryModel) => Territory`), and expressing that
 * soundly requires the callback's parameter to vary independently of {@link T}, which
 * function-type variance cannot capture here without redesigning the converter API.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CustomConverterFunction<T> = (data: any) => T | Partial<T>;

// This function ensures that no undefined property is sent to FireStore causing a runtime error;
export const removeUndefined = (obj: Record<string, unknown>) => {
  for (const prop in obj) {
    if (obj[prop] === undefined) {
      console.warn(`Property '${prop}' is undefined, removing it from the payload object to firestore.`);
      delete obj[prop];
    } else if (typeof obj[prop] === 'object' && obj[prop] !== null) {
      if (obj[prop] instanceof DocumentReference) {
        // We don't want to go into Firebase objects as they can cause infinite recursion
        continue;
      }

      removeUndefined(obj[prop] as Record<string, unknown>);
    }
  }
};

export const firebaseEntityConverterFactory = <T extends object>(
  customConverter?: CustomConverterFunction<T>,
): FirestoreDataConverter<T> => {
  return {
    toFirestore(modelObject: WithFieldValue<T>): DocumentData {
      removeUndefined(modelObject as Record<string, unknown>);
      return modelObject as DocumentData;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): T {
      const data = snapshot.data(options) as T;

      if (customConverter) {
        return {
          ...data,
          id: snapshot.id,
          ...customConverter(data),
        } as T;
      }

      return {
        ...data,
        id: snapshot.id,
      } as T;
    },
  };
};
