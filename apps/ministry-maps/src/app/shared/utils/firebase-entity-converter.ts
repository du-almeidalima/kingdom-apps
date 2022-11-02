import { FirestoreDataConverter } from '@firebase/firestore';
import { DocumentData, QueryDocumentSnapshot, SnapshotOptions } from '@angular/fire/firestore';

type CustomConverterFunction<T> = (data: T) => object;

export const convertFirebaseTimestampToDateFactory = (field: string) => {
  return (data: any) => ({
    [field]: data[field]?.toDate(),
  });
};

// This function ensures that no undefined property is sent to FireStore causing a runtime error;
const removeUndefined = (obj: any) => {
  for (const prop in obj) {
    if (obj[prop] === undefined || obj[prop] === null) {
      console.warn(`Property '${prop}' is undefined or null, removing it from the payload object to firestore.`);
      delete obj[prop];
    } else if (typeof obj[prop] === 'object') {
      removeUndefined(obj[prop]);
    }
  }
};

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
