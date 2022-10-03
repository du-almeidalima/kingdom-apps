import { Injectable } from '@angular/core';
import { collection, CollectionReference, Firestore, getDocs, query, where } from '@angular/fire/firestore';
import { from, map, Observable } from 'rxjs';

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

    return from(getDocs(q)).pipe(map(territoriesDocSnapshot => territoriesDocSnapshot.docs.map(t => t.data())));
  }
}
