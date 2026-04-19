import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
} from '@angular/fire/firestore';

import { Congregation } from '../congregation';

export type FirebaseCongregationModel = Congregation;

export const congregationConverter: FirestoreDataConverter<Congregation> = {
  toFirestore(modelObject: WithFieldValue<Congregation>): DocumentData {
    return modelObject as DocumentData;
  },

  fromFirestore(snapshot: QueryDocumentSnapshot<Congregation>, options?: SnapshotOptions): Congregation {
    const data = snapshot.data(options);

    return {
      ...data,
      id: snapshot.id,
    };
  },
};
