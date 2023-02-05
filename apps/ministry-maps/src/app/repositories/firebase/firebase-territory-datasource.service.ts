import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  CollectionReference,
  deleteDoc,
  doc,
  documentId,
  Firestore,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { combineLatest, from, map, Observable, switchMap } from 'rxjs';

import {
  convertFirebaseTimestampToDateFactory,
  firebaseEntityConverterFactory,
} from '../../shared/utils/firebase-entity-converter';
import { TerritoryRepository } from '../territories.repository';
import { Territory } from '../../../models/territory';
import { TerritoryVisitHistory } from '../../../models/territory-visit-history';
import { removeUndefinedKeys } from '../../shared/utils/remove-undefined-keys';

@Injectable({
  providedIn: 'root',
})
export class FirebaseTerritoryDatasourceService implements TerritoryRepository {
  private readonly collectionName = 'territories';
  private readonly historySubCollectionName = 'history';
  private readonly territoriesCollection: CollectionReference<Territory>;

  constructor(private readonly firestore: Firestore) {
    this.territoriesCollection = collection(this.firestore, this.collectionName).withConverter(
      firebaseEntityConverterFactory<Territory>(convertFirebaseTimestampToDateFactory('lastVisit'))
    ) as CollectionReference<Territory>;
  }

  getAllByCongregation(congregationId: string): Observable<Territory[]> {
    const q = query(this.territoriesCollection, where('congregationId', '==', congregationId));

    return from(collectionData(q));
  }

  getAllByCongregationAndCity(congregationId: string, city: string): Observable<Territory[]> {
    const q = query(
      this.territoriesCollection,
      where('congregationId', '==', congregationId),
      where('city', '==', city)
    );

    return from(collectionData(q));
  }

  getAllInIds(ids: string[]) {
    const q = query(this.territoriesCollection, where(documentId(), 'in', ids));

    return from(getDocs(q)).pipe(
      switchMap(territoriesSnapshot => {
        // Looping through each territory and resolving the history sub collection documents
        const territoriesObservables = territoriesSnapshot.docs.map(ts => {
          const territory = ts.data();

          const path = `${this.collectionName}/${territory.id}/${this.historySubCollectionName}`;
          const territoryVisitHistoryCollection = collection(
            this.firestore,
            path
          ) as CollectionReference<TerritoryVisitHistory>;

          return from(getDocs(territoryVisitHistoryCollection)).pipe(
            map(territoryVisitHistorySnapshots => {
              return {
                ...territory,
                history: territoryVisitHistorySnapshots.docs.map(visitHistorySnapshot => visitHistorySnapshot.data()),
              };
            })
          );
        });

        // Combining all territoriesObservables into one array
        return combineLatest(territoriesObservables);
      })
    );
  }

  add(territory: Omit<Territory, 'id'>) {
    // History will be a collection in FireStore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { history, ...territoryWithoutHistory } = {
      ...territory,
    };

    return from(addDoc(this.territoriesCollection, territoryWithoutHistory)).pipe(
      switchMap(territoryDocRef =>
        from(getDoc(territoryDocRef)).pipe(map(territorySnapshot => territorySnapshot.data() as Territory))
      )
    );
  }

  update(territory: Territory): Observable<void> {
    const territoryDocRef = doc(this.territoriesCollection, `${territory.id}`);
    // History will be a collection in FireStore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { history, ...territoryWithoutHistory } = {
      ...territory,
    };

    removeUndefinedKeys(territoryWithoutHistory);

    return from(updateDoc(territoryDocRef, { ...territoryWithoutHistory }));
  }

  delete(id: string): Observable<void> {
    const deletePromise = deleteDoc(doc(this.territoriesCollection, id));
    return from(deletePromise);
  }

  addVisitHistory(territoryId: string, visitHistory: TerritoryVisitHistory): Observable<void> {
    const path = `${this.collectionName}/${territoryId}/${this.historySubCollectionName}`;
    const territoryVisitHistoryCollection = collection(this.firestore, path);
    const visitHistoryDocRef = doc(territoryVisitHistoryCollection, visitHistory.id);

    return from(setDoc(visitHistoryDocRef, visitHistory));
  }
}
