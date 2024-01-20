import { Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  CollectionReference,
  deleteDoc,
  doc,
  documentId,
  Firestore,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { combineLatest, from, map, Observable, switchMap } from 'rxjs';

import { firebaseEntityConverterFactory, removeUndefined } from '../../shared/utils/firebase-entity-converter';
import { TerritoryRepository } from '../territories.repository';
import { Territory } from '../../../models/territory';
import { TerritoryVisitHistory } from '../../../models/territory-visit-history';
import { FirebaseTerritoryModel } from '../../../models/firebase/firebase-territory-model';

/** Converts the Firebase Timestamps to Date objects */
const convertTerritoryFirebaseTimestampsToDate = (data: FirebaseTerritoryModel): Territory => {
  return {
    ...data,
    lastVisit: data.lastVisit?.toDate(),
    recentHistory: data.recentHistory?.map(h => ({
      ...h,
      date: h?.date?.toDate(),
    })),
  };
};

@Injectable({
  providedIn: 'root',
})
export class FirebaseTerritoryDatasourceService implements TerritoryRepository {
  static readonly COLLECTION_NAME = 'territories';
  private readonly historySubCollectionName = 'history';
  private readonly territoriesCollection: CollectionReference<Territory>;

  constructor(private readonly firestore: Firestore) {
    this.territoriesCollection = collection(
      this.firestore,
      FirebaseTerritoryDatasourceService.COLLECTION_NAME
    ).withConverter<Territory>(firebaseEntityConverterFactory(convertTerritoryFirebaseTimestampsToDate));
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
        const territories$ = territoriesSnapshot.docs.map(ts => {
          const territory = ts.data();

          const path = `${FirebaseTerritoryDatasourceService.COLLECTION_NAME}/${territory.id}/${this.historySubCollectionName}`;
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
        return combineLatest(territories$);
      })
    );
  }

  add(territory: Omit<Territory, 'id'>) {
    // History will be a collection in FireStore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { history, ...territoryWithoutHistory } = {
      ...territory,
    };

    const newTerritoryDocRef = doc(this.territoriesCollection);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // Creating a reference to the new document, so we can get the id
    const newTerritory$ = from(setDoc(newTerritoryDocRef, { ...territoryWithoutHistory, id: newTerritoryDocRef.id }));

    return newTerritory$.pipe(
      switchMap(() =>
        from(getDoc(newTerritoryDocRef)).pipe(map(territorySnapshot => territorySnapshot.data() as Territory))
      )
    );
  }

  update(territory: Territory): Observable<void> {
    const territoryDocRef = doc(this.territoriesCollection, `${territory.id}`);
    // History will be a collection in FireStore
    const { history, ...territoryWithoutHistory } = {
      ...territory,
    };

    if (history && history.length) {
      territoryWithoutHistory.recentHistory = history.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-5);
    }

    const territoryCopy = structuredClone(territoryWithoutHistory);
    // FIXME: I don't know why the converter is not getting this on the 'toFirestore'
    removeUndefined(territoryCopy);

    return from(updateDoc(territoryDocRef, territoryCopy));
  }

  batchUpdate(territories: Territory[]): Observable<void> {
    if (!territories || territories.length === 0) {
      console.warn('Aborting batch update, ,o territories to update');
    }

    const transactionPromise = runTransaction(this.firestore, async transaction => {
      return territories.map(territory => {
        const territoryDocRef = doc(this.territoriesCollection, `${territory.id}`);

        // FIXME: I don't know why the converter is not getting this on the 'toFirestore'
        const territoryCopy = structuredClone(territory);
        removeUndefined(territoryCopy);

        return transaction.update(territoryDocRef, territoryCopy);
      });
    });

    return from(transactionPromise as unknown as Promise<void>);
  }

  delete(id: string): Observable<void> {
    const deletePromise = deleteDoc(doc(this.territoriesCollection, id));
    return from(deletePromise);
  }

  getTerritoryVisitHistory(id: string): Observable<TerritoryVisitHistory[]> {
    const territoryHistoryCollection = collection(this.territoriesCollection, `${id}/history`);

    return from(getDocs(territoryHistoryCollection)).pipe(
      map(snapshot => {
        return snapshot.docs.map(historySnapshot => {
          const firebaseHistory = historySnapshot.data();

          return {
            ...firebaseHistory,
            date: firebaseHistory['date']?.toDate(),
          } as TerritoryVisitHistory;
        });
      })
    );
  }

  setVisitHistory(territoryId: string, visitHistory: TerritoryVisitHistory): Observable<void> {
    const path = `${FirebaseTerritoryDatasourceService.COLLECTION_NAME}/${territoryId}/${this.historySubCollectionName}`;
    const territoryVisitHistoryCollection = collection(this.firestore, path);
    const visitHistoryDocRef = doc(territoryVisitHistoryCollection, visitHistory.id);

    return from(setDoc(visitHistoryDocRef, visitHistory));
  }

  getNextPositionIndexForCity(city: string): Observable<number> {
    const lastPositionIndexQuery = query(
      this.territoriesCollection,
      where('city', '==', city),
      orderBy('positionIndex', 'desc'),
      limit(1)
    );

    return from(getDocs(lastPositionIndexQuery)).pipe(
      map(territories => {
        if (territories.empty) {
          return 0;
        }

        const lastTerritory = territories.docs[0].data();

        return (lastTerritory.positionIndex ?? 0) + 1;
      })
    );
  }
}
