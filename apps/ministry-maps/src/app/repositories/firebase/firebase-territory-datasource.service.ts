import { Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  CollectionReference,
  deleteDoc,
  doc,
  documentId,
  DocumentReference,
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
import { combineLatest, EMPTY, forkJoin, from, map, Observable, of, switchMap } from 'rxjs';

import { firebaseEntityConverterFactory, removeUndefined } from '../../shared/utils/firebase-entity-converter';
import { TerritoryRepository, TerritoryRepositoryQueryOptions } from '../territories.repository';
import { Territory } from '../../../models/territory';
import { TerritoryVisitHistory } from '../../../models/territory-visit-history';
import {
  FirebaseTerritoryVisitHistoryModel,
  FirebaseTerritoryModel,
} from '../../../models/firebase/firebase-territory-model';
import { FirebaseDatasource } from './firebase-datasource';

/** Converts the Firebase Timestamps to Date objects */
export const convertTerritoryFirebaseTimestampsToDate = (data: FirebaseTerritoryModel): Territory => {
  return {
    ...data,
    lastVisit: data.lastVisit?.toDate(),
    recentHistory: data.recentHistory?.map(h => ({
      ...h,
      date: h?.date?.toDate(),
    })),
  };
};

/** Converts the Firebase Timestamps to Date objects for FirebaseHistory  */
export const convertTerritoryHistoryFirebaseTimestampsToDate = (
  data: FirebaseTerritoryVisitHistoryModel
): TerritoryVisitHistory => {
  return {
    ...data,
    date: data?.date.toDate(),
  };
};

@Injectable({
  providedIn: 'root',
})
export class FirebaseTerritoryDatasourceService implements TerritoryRepository, FirebaseDatasource<Territory> {
  static readonly COLLECTION_NAME = 'territories';
  private readonly historySubCollectionName = 'history';
  private readonly territoriesCollection: CollectionReference<Territory>;

  constructor(private readonly firestore: Firestore) {
    this.territoriesCollection = collection(
      this.firestore,
      FirebaseTerritoryDatasourceService.COLLECTION_NAME
    ).withConverter<Territory>(firebaseEntityConverterFactory(convertTerritoryFirebaseTimestampsToDate));
  }

  createDocumentRef(id: string): DocumentReference<Territory> {
    return doc(this.territoriesCollection, id);
  }

  getAllByCongregation(congregationId: string, options?: TerritoryRepositoryQueryOptions): Observable<Territory[]> {
    const q = query(this.territoriesCollection, where('congregationId', '==', congregationId));

    return from(collectionData(q))
      .pipe(
        // Resolve Territory History
        switchMap(territoriesSnapshot => {
          if (!options?.getHistory) {
            return of(territoriesSnapshot);
          }

          // Looping through each territory and resolving the history sub collection documents
          const territories$ = territoriesSnapshot.map(territory => {

            const path = `${FirebaseTerritoryDatasourceService.COLLECTION_NAME}/${territory.id}/${this.historySubCollectionName}`;
            const territoryVisitHistoryCollection = collection(this.firestore, path).withConverter<TerritoryVisitHistory>(
              firebaseEntityConverterFactory(convertTerritoryHistoryFirebaseTimestampsToDate)
            );

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

  getById(id: string): Observable<Territory | undefined> {
    const territoryDocReference = doc(this.territoriesCollection, `${id}`);

    return from(getDoc(territoryDocReference)).pipe(
      map(territoryDocSnapshot => {
        return territoryDocSnapshot.data();
      })
    );
  }

  getAllByCongregationAndCities(congregationId: string, cities: string[]): Observable<Territory[]> {
    const q = query(
      this.territoriesCollection,
      where('congregationId', '==', congregationId),
      where('city', 'in', cities)
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
          const territoryVisitHistoryCollection = collection(this.firestore, path).withConverter<TerritoryVisitHistory>(
            firebaseEntityConverterFactory(convertTerritoryHistoryFirebaseTimestampsToDate)
          );

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
    const territoryVisitHistoryCollection = this.getTerritoryHistoryCollection(territoryId);
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

  /**
   * Deletes a {@link TerritoryVisitHistory} by its ID. This method takes care of deleting the visit in both the
   * <b>history</b> collection and the <b>recentHistory</b> array.
   */
  deleteVisitHistory(territoryId: string, historyId: string): Observable<void> {
    const territoryVisitHistoryCollection = this.getTerritoryHistoryCollection(territoryId);
    const visitHistoryDocRef = doc(territoryVisitHistoryCollection, historyId);

    const deleteHistory$ = from(deleteDoc(visitHistoryDocRef));
    // Since the History is also present in the 'recentHistory' array, we need to manually delete it from there as well
    const deleteRecentHistory$ = this.getById(territoryId).pipe(
      switchMap(territory => {
        const territoryCopy = structuredClone(territory);

        if (!territoryCopy) {
          return EMPTY;
        }

        const updatedTerritory: Territory = {
          ...territoryCopy,
          recentHistory: territoryCopy?.recentHistory?.filter(h => h.id !== historyId),
        };

        return this.update(updatedTerritory);
      })
    );

    return forkJoin([deleteRecentHistory$, deleteHistory$]).pipe(map(_ => undefined));
  }

  /** Gets the {@link CollectionReference} of the Territory History sub-collection */
  private getTerritoryHistoryCollection(territoryId: string) {
    const path = `${FirebaseTerritoryDatasourceService.COLLECTION_NAME}/${territoryId}/${this.historySubCollectionName}`;
    return collection(this.firestore, path);
  }
}
