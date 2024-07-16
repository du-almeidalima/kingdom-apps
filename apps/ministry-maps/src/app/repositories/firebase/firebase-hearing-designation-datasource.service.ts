import { Injectable } from '@angular/core';
import { collection, CollectionReference, doc, docData, Firestore } from '@angular/fire/firestore';
import {
  convertFirebaseTimestampToDateFactory,
  firebaseEntityConverterFactory,
} from '../../shared/utils/firebase-entity-converter';
import { HearingDesignationRepository } from '../hearing-designation.repository';
import { HearingDesignation } from '../../../models/hearing-designation';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FirebaseHearingDesignationDatasourceService implements HearingDesignationRepository {
  static readonly COLLECTION_NAME = 'hearing_designations';
  private readonly hearingDesignationCollection: CollectionReference<HearingDesignation>;

  constructor(private readonly firestore: Firestore) {
    this.hearingDesignationCollection = collection(
      this.firestore,
      FirebaseHearingDesignationDatasourceService.COLLECTION_NAME
    ).withConverter<HearingDesignation>(firebaseEntityConverterFactory(convertFirebaseTimestampToDateFactory('createdAt')));
  }

  getById(id: string): Observable<HearingDesignation | undefined> {
    const designationDocReference = doc(this.hearingDesignationCollection, `${id}`);

    return docData(designationDocReference, {
      idField: 'id',
    });
  }

  add(designation: Omit<HearingDesignation, 'id'>): Observable<HearingDesignation> {
    // TODO: IMPLEMENT
    return of();
  }

  update(designationTerritory: HearingDesignation): Observable<void> {
    // TODO: IMPLEMENT
    return of();
  }
}
