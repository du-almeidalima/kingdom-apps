import { Injectable } from '@angular/core';
import {
  collection,
  CollectionReference,
  doc,
  docData,
  Firestore,
  getDocs,
  orderBy,
  query,
} from '@angular/fire/firestore';
import { from, map, Observable } from 'rxjs';

import { CongregationRepository } from '../congregation.repository';
import { Congregation } from '../../../models/congregation';
import { congregationConverter } from '../../../models/firebase/firebase-congregation-model';

@Injectable({
  providedIn: 'root',
})
export class FirebaseCongregationDatasourceService implements CongregationRepository {
  static readonly COLLECTION_NAME = 'congregations';
  private readonly congregationCollection: CollectionReference<Congregation>;

  constructor(private readonly firestore: Firestore) {
    this.congregationCollection = collection(
      this.firestore,
      FirebaseCongregationDatasourceService.COLLECTION_NAME,
    ).withConverter(congregationConverter);
  }

  getById(id: string): Observable<Congregation | undefined> {
    const congregationReference = doc(this.firestore, `${FirebaseCongregationDatasourceService.COLLECTION_NAME}/${id}`);

    return docData(congregationReference, {
      idField: 'id',
    }) as Observable<Congregation | undefined>;
  }

  getCongregations(): Observable<Pick<Congregation, 'name' | 'id'>[]> {
    const q = query(this.congregationCollection, orderBy('name', 'asc'));
    return from(getDocs(q))
      .pipe(
        map(snapshot => {
          return snapshot.docs.map(d => ({
            name: d.data().name,
            id: d.data().id,
          }));
        }),
      );
  }
}
