import { FirestoreDataConverter } from '@firebase/firestore';
import { DocumentData, QueryDocumentSnapshot, SnapshotOptions } from '@angular/fire/firestore';

import { Congregation } from '../congregation';

export const congregationConverter: FirestoreDataConverter<Congregation> = {
  toFirestore(modelObject: Congregation): DocumentData {
    return modelObject;
  },

  fromFirestore(snapshot: QueryDocumentSnapshot<Congregation>, options?: SnapshotOptions): Congregation {
    const data = snapshot.data(options);

    return {
      ...data,
      id: snapshot.id,
    };
  },
};
