import { inject, Injectable } from '@angular/core';
import {
  collection,
  CollectionReference,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { DocumentReference } from 'firebase/firestore';
import { defer, from, map, Observable, switchMap, take } from 'rxjs';

import { DesignationsHeader } from '../../../models/designations-header';
import { DesignationsHeaderClosedByEnum } from '../../../models/enums/designations-header-closed-by';
import { DesignationsHeaderStatusEnum } from '../../../models/enums/designations-header-status';
import { FirebaseDesignationsHeaderModel } from '../../../models/firebase/firebase-designations-header-model';
import { firebaseEntityConverterFactory } from '../../shared/utils/firebase-entity-converter';
import { DesignationsHeaderRepository } from '../designations-header.repository';
import { FirebaseDatasource } from './firebase-datasource';
import { collectionData$, docData$ } from './firebase-rxjs-interop';
import { FIRESTORE } from './firebase-providers';

const convertDesignationsHeaderFirebaseTimestampsToDate = (
  data: FirebaseDesignationsHeaderModel,
): DesignationsHeader => {
  return {
    ...data,
    createdAt: data.createdAt.toDate(),
    closedAt: data.closedAt?.toDate(),
    expireAt: data.expireAt?.toDate(),
  };
};

@Injectable({
  providedIn: 'root',
})
export class FirebaseDesignationsHeaderDatasourceService
  implements DesignationsHeaderRepository, FirebaseDatasource<DesignationsHeader>
{
  static readonly COLLECTION_NAME = 'designations_header';

  // TTL retention: 6 months (same as designations)
  private static readonly TTL_DAYS = 180;
  private static readonly MS_PER_DAY = 24 * 60 * 60 * 1000;

  private readonly designationsHeaderCollection: CollectionReference<DesignationsHeader>;

  private readonly firestore = inject(FIRESTORE);

  constructor() {
    this.designationsHeaderCollection = collection(
      this.firestore,
      FirebaseDesignationsHeaderDatasourceService.COLLECTION_NAME,
    ).withConverter<DesignationsHeader>(
      firebaseEntityConverterFactory(convertDesignationsHeaderFirebaseTimestampsToDate),
    );
  }

  createDocumentRef(id: string): DocumentReference<DesignationsHeader> {
    return doc(this.designationsHeaderCollection, id);
  }

  getInProgressByCongregation(congregationId: string): Observable<DesignationsHeader | undefined> {
    const q = query(
      this.designationsHeaderCollection,
      where('congregationId', '==', congregationId),
      where('status', '==', DesignationsHeaderStatusEnum.IN_PROGRESS),
      // Deterministic newest-first pick using the composite index in firestore.indexes.json.
      orderBy('createdAt', 'desc'),
      limit(1),
    );

    return from(getDocs(q)).pipe(map((snapshot) => (snapshot.empty ? undefined : snapshot.docs[0].data())));
  }

  getInProgressStreamByCongregation(congregationId: string): Observable<DesignationsHeader | undefined> {
    const q = query(
      this.designationsHeaderCollection,
      where('congregationId', '==', congregationId),
      where('status', '==', DesignationsHeaderStatusEnum.IN_PROGRESS),
      orderBy('createdAt', 'desc'),
      limit(1),
    );

    return collectionData$<DesignationsHeader>(q).pipe(map((headers) => headers[0]));
  }

  add(header: Omit<DesignationsHeader, 'id'>): Observable<DesignationsHeader> {
    // Creating a reference to the new document, so we can get the id
    const newHeaderDocRef = doc(this.designationsHeaderCollection);
    const expireAt = Timestamp.fromDate(
      new Date(
        Date.now() +
          FirebaseDesignationsHeaderDatasourceService.TTL_DAYS * FirebaseDesignationsHeaderDatasourceService.MS_PER_DAY,
      ),
    );
    const newHeader$ = from(setDoc(newHeaderDocRef, { ...header, id: newHeaderDocRef.id, expireAt }));

    return newHeader$.pipe(
      switchMap(() => docData$<DesignationsHeader>(newHeaderDocRef)),
      // The document was just written, so the first snapshot always carries it.
      map((header) => header as DesignationsHeader),
      take(1),
    );
  }

  close(id: string, closedBy: DesignationsHeaderClosedByEnum = DesignationsHeaderClosedByEnum.USER): Observable<void> {
    const headerDocRef = doc(this.designationsHeaderCollection, id);

    // defer: lazy, so concat/forkJoin/retry can re-subscribe the write.
    return defer(() =>
      from(
        updateDoc(headerDocRef, {
          status: DesignationsHeaderStatusEnum.DONE,
          closedAt: new Date(),
          closedBy,
        }),
      ),
    );
  }
}
