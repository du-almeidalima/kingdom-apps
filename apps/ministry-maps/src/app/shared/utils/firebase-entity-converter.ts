import { FirestoreDataConverter } from '@firebase/firestore';
import { DocumentData, QueryDocumentSnapshot, SnapshotOptions, Timestamp } from '@angular/fire/firestore';

type CustomConverterFunction<T> = (data: any) => T | Partial<T>;

export const convertFirebaseTimestampToDateFactory = <T>(field: keyof T) => {
  return (data: any): Partial<T> => {
    if (data === null) {
      return {};
    }

    if (data?.[field] && data[field] instanceof Timestamp) {
      //@ts-expect-error if there's a timestamp, the field should be of type data, but I couldn't figure out how to make this work with TS
      return {
        [field]: (data[field] as Timestamp).toDate(),
      }
    }

    return {};
  };
};

// This function ensures that no undefined property is sent to FireStore causing a runtime error;
export const removeUndefined = (obj: any) => {
  for (const prop in obj) {
    if (obj[prop] === undefined || obj[prop] === null) {
      console.warn(`Property '${prop}' is undefined or null, removing it from the payload object to firestore.`);
      delete obj[prop];
    } else if (typeof obj[prop] === 'object') {
      removeUndefined(obj[prop]);
    }
  }
};

/** Function to map FROM and TO Firebase queries */
export const firebaseEntityConverterFactory = <T extends object>(
  customConverter?: CustomConverterFunction<T>
): FirestoreDataConverter<T> => {
  return {
    toFirestore(modelObject: T): DocumentData {
      removeUndefined(modelObject);
      return modelObject;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot<T>, options?: SnapshotOptions): T {
      const data = snapshot.data(options);

      if (customConverter) {
        return {
          ...data,
          id: snapshot.id,
          ...customConverter(data),
        };
      }

      return {
        ...data,
        id: snapshot.id,
      };
    },
  };
};
