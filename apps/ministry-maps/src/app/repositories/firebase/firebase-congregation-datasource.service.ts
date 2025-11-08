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
  getDocFromCache,
  getDocs,
  orderBy,
  query,
  updateDoc,
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
   * @param congregationRef The Congregation {@link DocumentReference}
   * @param options Options for resolving the congregation reference
   * @private
   */
  static resolveUserCongregationReference(
    congregationRef: DocumentReference<Congregation, FirebaseCongregationModel | DocumentData>,
    options?: { useCache: boolean }
  ): Observable<Congregation | undefined> {
    const congregationDoc = options?.useCache ? getDocFromCache(congregationRef) : getDoc(congregationRef);

    return from(congregationDoc).pipe(
      map((congregationDocSnapshot) => {
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
      map((snapshot) => {
        return snapshot.docs.map((d) => ({
          name: d.data().name,
          id: d.data().id,
        }));
      })
    );
  }

  /**
   * Updates the {@link Congregation} object in Firestore (patch operation).
   */
  update(congregation: Congregation): Observable<void> {
    const congregationRef = doc(this.congregationCollection, congregation.id);
    const { id: _, ...updateData } = congregation;

    return from(updateDoc(congregationRef, updateData));
  }
}
