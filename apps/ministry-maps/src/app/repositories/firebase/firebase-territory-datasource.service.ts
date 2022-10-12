import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  CollectionReference,
  Firestore,
  getDoc,
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
  private readonly congregationCollection: CollectionReference<Territory>;

  constructor(private readonly firestore: Firestore) {
    this.congregationCollection = collection(this.firestore, this.collectionName).withConverter(
      firebaseEntityConverterFactory<Territory>()
    ) as CollectionReference<Territory>;
  }

  getAllByCongregation(congregationId: string): Observable<Territory[]> {
    const q = query(this.congregationCollection, where('congregationId', '==', congregationId));

    return from(collectionData(q));
  }

  add(territory: Territory) {
    return from(addDoc(this.congregationCollection, territory)).pipe(
      switchMap(territoryDocRef =>
        from(getDoc(territoryDocRef)).pipe(map(territorySnapshot => territorySnapshot.data() as Territory))
      )
    );
  }
}
