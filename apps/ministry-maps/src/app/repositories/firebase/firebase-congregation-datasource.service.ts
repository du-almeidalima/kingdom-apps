import { Injectable } from '@angular/core';
import {
  collection,
  CollectionReference,
  doc,
  docData,
  DocumentData,
  DocumentReference,
  Firestore,
  getDocFromCache,
  getDocFromServer,
  getDocs,
  orderBy,
  query,
} from '@angular/fire/firestore';
import { catchError, from, map, Observable, of, switchMap } from 'rxjs';

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
    // Since Congregation isn't something that changes frequently, fetching from cache to increase Performance
    const cachedCongregationSnapshot = from(getDocFromCache(congregation));

    return cachedCongregationSnapshot.pipe(
      catchError(err => {
        console.warn(`Cache for Congregation not found: `, err);
        return of(null);
      }),
      switchMap(cachedCongregationRes => {
        // Cache user found, returning it
        if (cachedCongregationRes) {
          return of(cachedCongregationRes);
        }

        // Fetching from the server
        return from(getDocFromServer(congregation));
      }),
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
