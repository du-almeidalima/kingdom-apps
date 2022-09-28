import { Injectable } from '@angular/core';
import { collection, CollectionReference, doc, docData, Firestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

import { CongregationRepository } from '../congregation.repository';
import { Congregation } from '../../../models/congregation';
import { congregationConverter } from '../../../models/firebase/firebase-congregation-model';

@Injectable({
  providedIn: 'root',
})
export class FirebaseCongregationDatasourceService implements CongregationRepository {
  private readonly collectionName = 'congregations';
  private readonly congregationCollection: CollectionReference;

  constructor(private readonly firestore: Firestore) {
    this.congregationCollection = collection(this.firestore, this.collectionName).withConverter(congregationConverter);
  }

  getById(id: string): Observable<Congregation | undefined> {
    const congregationReference = doc(this.firestore, `${this.collectionName}/${id}`);

    return docData(congregationReference, {
      idField: 'id',
    }) as Observable<Congregation | undefined>;
  }
}
