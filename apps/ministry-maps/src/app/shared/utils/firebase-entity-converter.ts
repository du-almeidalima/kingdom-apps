import { FirestoreDataConverter } from '@firebase/firestore';
import { DocumentData, QueryDocumentSnapshot, SnapshotOptions } from '@angular/fire/firestore';

export const firebaseEntityConverterFactory = <T extends object>(): FirestoreDataConverter<T> => {
  return {
    toFirestore(modelObject: T): DocumentData {
      return modelObject;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot<T>, options?: SnapshotOptions): T {
      const data = snapshot.data(options);

      return {
        ...data,
        id: snapshot.id,
      };
    },
  };
};
