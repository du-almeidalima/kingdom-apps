import { Injectable } from '@angular/core';
import {
  collection,
  CollectionReference,
  doc,
  docData,
  DocumentData,
  DocumentReference,
  Firestore,
  getDoc,
  getDocs,
  orderBy,
  query,
} from '@angular/fire/firestore';
import { from, map, Observable } from 'rxjs';

import { CongregationRepository } from '../congregation.repository';
import { Congregation } from '../../../models/congregation';
import { congregationConverter, FirebaseCongregationModel } from '../../../models/firebase/firebase-congregation-model';
import { FirebaseDatasource } from './firebase-datasource';

@Injectable({
  providedIn: 'root',
})
export class FirebaseCongregationDatasourceService implements CongregationRepository, FirebaseDatasource<Congregation> {
  static readonly COLLECTION_NAME = 'congregations';
  private readonly congregationCollection: CollectionReference<Congregation>;

  constructor(private readonly firestore: Firestore) {
    this.congregationCollection = collection(
      this.firestore,
      FirebaseCongregationDatasourceService.COLLECTION_NAME
    ).withConverter(congregationConverter);
  }

  /**
   * Resolves a congregation reference by id or by reference
   * @param congregation
   * @private
   */
  static resolveUserCongregationReference(
    congregation: DocumentReference<Congregation, FirebaseCongregationModel | DocumentData>
  ): Observable<Congregation | undefined> {
    return from(getDoc(congregation)).pipe(
      map(congregationDocSnapshot => {
        if (!congregationDocSnapshot.exists()) {
          return undefined;
        }

        return congregationDocSnapshot.data();
      })
    );
  }

  createDocumentRef(id: string): DocumentReference<Congregation> {
    return doc(this.congregationCollection, id);
  }

  getById(id: string): Observable<Congregation | undefined> {
    const congregationReference = doc(this.firestore, `${FirebaseCongregationDatasourceService.COLLECTION_NAME}/${id}`);

    return docData(congregationReference, {
      idField: 'id',
    }) as Observable<Congregation | undefined>;
  }

  getCongregations(): Observable<Pick<Congregation, 'name' | 'id'>[]> {
    const q = query(this.congregationCollection, orderBy('name', 'asc'));
    return from(getDocs(q)).pipe(
      map(snapshot => {
        return snapshot.docs.map(d => ({
          name: d.data().name,
          id: d.data().id,
        }));
      })
    );
  }
}
