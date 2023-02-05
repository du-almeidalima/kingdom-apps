import { Injectable } from '@angular/core';
import { collection, CollectionReference, doc, docData, Firestore, setDoc, updateDoc } from '@angular/fire/firestore';
import { from, Observable, switchMap, take } from 'rxjs';

import { Designation } from '../../../models/designation';
import { FirebaseDesignationModel } from '../../../models/firebase/firebase-designation-territory-model';
import { firebaseEntityConverterFactory } from '../../shared/utils/firebase-entity-converter';
import { DesignationRepository } from '../designation.repository';

const convertHistoryDateFirebaseTimestampToDate = (data: FirebaseDesignationModel): Designation => {
  return {
    ...data,
    territories: data.territories.map(t => ({
      ...t,
      history: t.history.map(h => ({
        ...h,
        date: h.date.toDate(),
      })),
    })),
  };
};

@Injectable({
  providedIn: 'root',
})
export class FirebaseDesignationDatasourceService implements DesignationRepository {
  private readonly collectionName = 'designations';
  private readonly designationCollection: CollectionReference<Designation>;

  constructor(private readonly firestore: Firestore) {
    this.designationCollection = collection(this.firestore, this.collectionName).withConverter<Designation>(
      firebaseEntityConverterFactory<Designation>(convertHistoryDateFirebaseTimestampToDate)
    );
  }

  getById(id: string): Observable<Designation | undefined> {
    const designationDocReference = doc(this.designationCollection, `${id}`);

    return docData(designationDocReference, {
      idField: 'id',
    }) as Observable<Designation | undefined>;
  }

  add(designation: Designation): Observable<Designation> {
    // Creating a reference to the new document, so we can get the id
    const newDesignationDocRef = doc(this.designationCollection);
    const newDesignation$ = from(setDoc(newDesignationDocRef, { ...designation, id: newDesignationDocRef.id }));

    return newDesignation$.pipe(
      switchMap(() => {
        return docData(newDesignationDocRef, { idField: 'id' }) as Observable<Designation>;
      }),
      take(1)
    );
  }

  update(designationTerritory: Designation): Observable<void> {
    const designationDocReference = doc(this.designationCollection, `${designationTerritory.id}`);

    return from(updateDoc<Designation>(designationDocReference, designationTerritory));
  }
}
