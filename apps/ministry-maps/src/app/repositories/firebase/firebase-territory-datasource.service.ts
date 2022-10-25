import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  CollectionReference,
  documentId,
  Firestore,
  getDoc,
  getDocsFromServer,
  query,
  where,
} from '@angular/fire/firestore';
import { from, map, Observable, switchMap } from 'rxjs';

import { firebaseEntityConverterFactory } from '../../shared/utils/firebase-entity-converter';
import { TerritoryRepository } from '../territories.repository';
import { Territory } from '../../../models/territory';

@Injectable({
  providedIn: 'root',
})
export class FirebaseTerritoryDatasourceService implements TerritoryRepository {
  private readonly collectionName = 'territories';
  private readonly territoriesCollection: CollectionReference<Territory>;

  constructor(private readonly firestore: Firestore) {
    this.territoriesCollection = collection(this.firestore, this.collectionName).withConverter(
      firebaseEntityConverterFactory<Territory>()
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

    return from(getDocsFromServer(q)).pipe(
      map(territoriesSnapshot => {
        return territoriesSnapshot.docs.map(ts => ts.data());
      })
    );
  }

  add(territory: Omit<Territory, 'id'>) {
    return from(addDoc(this.territoriesCollection, territory)).pipe(
      switchMap(territoryDocRef =>
        from(getDoc(territoryDocRef)).pipe(map(territorySnapshot => territorySnapshot.data() as Territory))
      )
    );
  }
}
