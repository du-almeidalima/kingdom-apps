import { inject, Injectable } from '@angular/core';
import { deleteField, doc, FieldPath, setDoc, updateDoc } from 'firebase/firestore';
import type { DocumentReference } from 'firebase/firestore';
import { defer, from, Observable } from 'rxjs';

import { DesignationsHeader } from '../../../models/designations-header';
import {
  DESIGNATIONS_PROGRESS_DOC_ID,
  DesignationProgressEntry,
  DesignationsProgress,
  territoryProgressKey,
  TerritoryProgressEntry,
} from '../../../models/designations-progress';
import { FirebaseDesignationsProgressModel } from '../../../models/firebase/firebase-designations-progress-model';
import { firebaseEntityConverterFactory } from '../../shared/utils/firebase-entity-converter';
import { DesignationsProgressRepository } from '../designations-progress.repository';
import { FirebaseDesignationsHeaderDatasourceService } from './firebase-designations-header-datasource.service';
import { docData$ } from './firebase-rxjs-interop';
import { FIRESTORE } from './firebase-providers';

const convertDesignationsProgressFirebaseTimestampsToDate = (
  data: FirebaseDesignationsProgressModel,
): DesignationsProgress => ({
  ...data,
  expireAt: data.expireAt?.toDate(),
  designations: Object.fromEntries(
    Object.entries(data.designations ?? {}).map(([id, entry]) => [
      id,
      {
        ...entry,
        createdAt: entry.createdAt.toDate(),
        expiresAt: entry.expiresAt.toDate(),
      },
    ]),
  ),
  territories: Object.fromEntries(
    Object.entries(data.territories ?? {}).map(([key, entry]) => [
      key,
      {
        ...entry,
        completedAt: entry.completedAt.toDate(),
      },
    ]),
  ),
});

@Injectable({ providedIn: 'root' })
export class FirebaseDesignationsProgressDatasourceService implements DesignationsProgressRepository {
  static readonly SUBCOLLECTION_NAME = 'progress';
  private static readonly TTL_DAYS = 180;
  private static readonly MS_PER_DAY = 24 * 60 * 60 * 1000;
  private readonly firestore = inject(FIRESTORE);

  private rawProgressDocRef(headerId: string): DocumentReference {
    return doc(
      this.firestore,
      FirebaseDesignationsHeaderDatasourceService.COLLECTION_NAME,
      headerId,
      FirebaseDesignationsProgressDatasourceService.SUBCOLLECTION_NAME,
      DESIGNATIONS_PROGRESS_DOC_ID,
    );
  }

  private progressDocRef(headerId: string): DocumentReference<DesignationsProgress> {
    return this.rawProgressDocRef(headerId).withConverter<DesignationsProgress>(
      firebaseEntityConverterFactory(convertDesignationsProgressFirebaseTimestampsToDate),
    );
  }

  getStreamByHeaderId(headerId: string): Observable<DesignationsProgress | undefined> {
    return docData$<DesignationsProgress>(this.progressDocRef(headerId));
  }

  registerDesignation(
    header: DesignationsHeader,
    designationId: string,
    entry: DesignationProgressEntry,
  ): Observable<void> {
    const ref = this.progressDocRef(header.id);
    return defer(() =>
      from(
        setDoc(
          ref,
          {
            id: DESIGNATIONS_PROGRESS_DOC_ID,
            headerId: header.id,
            congregationId: header.congregationId,
            expireAt:
              header.expireAt ??
              new Date(
                header.createdAt.getTime() +
                  FirebaseDesignationsProgressDatasourceService.TTL_DAYS *
                    FirebaseDesignationsProgressDatasourceService.MS_PER_DAY,
              ),
            designations: { [designationId]: entry },
          },
          { merge: true },
        ),
      ),
    );
  }

  setTerritoryProgress(headerId: string, entry: TerritoryProgressEntry): Observable<void> {
    return defer(() =>
      from(
        updateDoc(
          this.rawProgressDocRef(headerId),
          new FieldPath('territories', territoryProgressKey(entry.designationId, entry.territoryId)),
          entry,
        ),
      ),
    );
  }

  removeTerritoryProgress(headerId: string, designationId: string, territoryId: string): Observable<void> {
    return defer(() =>
      from(
        updateDoc(
          this.rawProgressDocRef(headerId),
          new FieldPath('territories', territoryProgressKey(designationId, territoryId)),
          deleteField(),
        ),
      ),
    );
  }
}
