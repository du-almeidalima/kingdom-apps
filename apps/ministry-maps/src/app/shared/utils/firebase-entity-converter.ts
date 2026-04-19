import {
  DocumentData,
  DocumentReference,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
} from '@angular/fire/firestore';

type CustomConverterFunction<T> = (data: any) => T | Partial<T>;


/**
 * @deprecated This was intended to be used as a generic converter, but it doesn't work well with TS and only supports
 * 1 property.
 */
export const convertFirebaseTimestampToDateFactory = (field: string) => {
  return (data: any) => ({
    [field]: data[field]?.toDate(),
  });
};

// This function ensures that no undefined property is sent to FireStore causing a runtime error;
export const removeUndefined = (obj: any) => {
  for (const prop in obj) {
    if (obj[prop] === undefined) {
      console.warn(`Property '${prop}' is undefined, removing it from the payload object to firestore.`);
      delete obj[prop];
    } else if (typeof obj[prop] === 'object') {
      if (obj[prop] instanceof DocumentReference) {
        // We don't want to go into Firebase objects as they can cause infinite recursion
        continue;
      }

      removeUndefined(obj[prop]);
    }
  }
};

export const firebaseEntityConverterFactory = <T extends object>(
  customConverter?: CustomConverterFunction<T>
): FirestoreDataConverter<T> => {
  return {
    toFirestore(modelObject: WithFieldValue<T>): DocumentData {
      removeUndefined(modelObject as object);
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
