import { Injectable } from '@angular/core';
import { collection, collectionData, CollectionReference, Firestore, query, where } from '@angular/fire/firestore';
import {
  convertFirebaseTimestampToDateFactory,
  firebaseEntityConverterFactory,
} from '../../shared/utils/firebase-entity-converter';
import { from, Observable, of } from 'rxjs';
import { HearingTerritoryRepository } from '../hearing-territory.repository';
import { HearingTerritory } from '../../../models/hearing-territory';

@Injectable({
  providedIn: 'root',
})
export class FirebaseHearingTerritoryDatasourceService implements HearingTerritoryRepository {
  static readonly COLLECTION_NAME = 'hearing_territories';
  private readonly hearingDesignationCollection: CollectionReference<HearingTerritory>;

  constructor(private readonly firestore: Firestore) {
    this.hearingDesignationCollection = collection(
      this.firestore,
      FirebaseHearingTerritoryDatasourceService.COLLECTION_NAME
    ).withConverter<HearingTerritory>(firebaseEntityConverterFactory(convertFirebaseTimestampToDateFactory('createdAt')));
  }

  add(territory: Omit<HearingTerritory, 'id'>): Observable<HearingTerritory> {
    // TODO: IMPLEMENT ME
    return of();
  }

  batchUpdate(territories: HearingTerritory[]): Observable<void> {
    // TODO: IMPLEMENT ME
    return of();
  }

  delete(id: string): Observable<void> {
    // TODO: IMPLEMENT ME
    return of();
  }

  getAllByCongregation(congregationId: string): Observable<HearingTerritory[]> {
    const q = query(this.hearingDesignationCollection, where('congregationId', '==', congregationId));

    return from(collectionData(q));
  }

  getAllInIds(ids: string[]): Observable<HearingTerritory[]> {
    // TODO: IMPLEMENT ME
    return of();
  }

  update(territory: HearingTerritory): Observable<void> {
    // TODO: IMPLEMENT ME
    return of();
  }
}
