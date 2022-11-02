import { Injectable } from '@angular/core';
import { addDoc, collection, CollectionReference, doc, docData, Firestore, updateDoc } from '@angular/fire/firestore';
import { from, Observable, switchMap, take } from 'rxjs';

import { Designation } from '../../../models/designation';
import { firebaseEntityConverterFactory } from '../../shared/utils/firebase-entity-converter';
import { DesignationRepository } from '../designation.repository';

@Injectable({
  providedIn: 'root',
})
export class FirebaseDesignationDatasourceService implements DesignationRepository {
  private readonly collectionName = 'designations';
  private readonly designationCollection: CollectionReference<Designation>;

  constructor(private readonly firestore: Firestore) {
    this.designationCollection = collection(this.firestore, this.collectionName).withConverter<Designation>(
      firebaseEntityConverterFactory<Designation>()
    );
  }

  getById(id: string): Observable<Designation | undefined> {
    const designationDocReference = doc(this.firestore, `${this.collectionName}/${id}`);

    return docData(designationDocReference, {
      idField: 'id',
    }) as Observable<Designation | undefined>;
  }

  add(designation: Designation): Observable<Designation> {
    return from(addDoc(this.designationCollection, designation)).pipe(
      switchMap(designationDocReference => {
        return docData(designationDocReference, { idField: 'id' }) as Observable<Designation>;
      }),
      take(1)
    );
  }

  update(designationTerritory: Designation): Observable<void> {
    const designationDocReference = doc(this.designationCollection, `${designationTerritory.id}`);

    return from(updateDoc<Designation>(designationDocReference, designationTerritory));
  }
}
