import { inject, Injectable } from '@angular/core';
import { collection, CollectionReference, doc, setDoc, Timestamp } from 'firebase/firestore';
import type { DocumentReference } from 'firebase/firestore';
import { from, map, Observable, switchMap, take, defer } from 'rxjs';

import { Designation } from '../../../models/designation';
import { FirebaseDesignationModel } from '../../../models/firebase/firebase-designation-territory-model';
import { firebaseEntityConverterFactory } from '../../shared/utils/firebase-entity-converter';
import { DesignationRepository } from '../designation.repository';
import { FirebaseDatasource } from './firebase-datasource';
import { docData$ } from './firebase-rxjs-interop';
import { FIRESTORE } from './firebase-providers';

const convertHistoryDateFirebaseTimestampToDate = (data: FirebaseDesignationModel): Designation => {
  return {
    ...data,
    createdAt: data.createdAt && data.createdAt.toDate(),
    expiresAt: data.expiresAt && data.expiresAt.toDate(),
    expireAt: data.expireAt && data.expireAt.toDate(),
    territories: data.territories.map((t) => ({
      ...t,
      lastVisit: t.lastVisit && t.lastVisit.toDate(),
      history: t.history.map((h) => ({
        ...h,
        date: h.date.toDate(),
      })),
    })),
  };
};

@Injectable({
  providedIn: 'root',
})
export class FirebaseDesignationDatasourceService implements DesignationRepository, FirebaseDatasource<Designation> {
  // TTL retention: 6 months
  private static readonly TTL_DAYS = 180;
  private static readonly MS_PER_DAY = 24 * 60 * 60 * 1000;

  private readonly collectionName = 'designations';
  private readonly designationCollection: CollectionReference<Designation>;

  private readonly firestore = inject(FIRESTORE);

  constructor() {
    this.designationCollection = collection(this.firestore, this.collectionName).withConverter<Designation>(
      firebaseEntityConverterFactory(convertHistoryDateFirebaseTimestampToDate),
    );
  }

  createDocumentRef(id: string): DocumentReference<Designation> {
    return doc(this.designationCollection, id);
  }

  getById(id: string): Observable<Designation | undefined> {
    const designationDocReference = doc(this.designationCollection, `${id}`);

    return docData$<Designation>(designationDocReference);
  }

  add(designation: Designation): Observable<Designation> {
    // Creating a reference to the new document, so we can get the id
    const newDesignationDocRef = doc(this.designationCollection);
    const expireAt = Timestamp.fromDate(
      new Date(
        Date.now() + FirebaseDesignationDatasourceService.TTL_DAYS * FirebaseDesignationDatasourceService.MS_PER_DAY,
      ),
    );
    const newDesignation$ = from(
      setDoc(newDesignationDocRef, { ...designation, id: newDesignationDocRef.id, expireAt }),
    );

    return newDesignation$.pipe(
      switchMap(() => docData$<Designation>(newDesignationDocRef)),
      // The document was just written, so the first snapshot always carries it.
      map((designation) => designation as Designation),
      take(1),
    );
  }

  update(designationTerritory: Designation): Observable<void> {
    const designationDocReference = doc(this.designationCollection, `${designationTerritory.id}`);

    // defer: lazy, so concat/forkJoin/retry can re-subscribe the write.
    return defer(() => from(setDoc(designationDocReference, designationTerritory)));
  }
}
