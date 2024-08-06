import { Injectable } from '@angular/core';
import { collection, CollectionReference, doc, docData, Firestore, setDoc } from '@angular/fire/firestore';
import { from, map, Observable, of, switchMap } from 'rxjs';

import { InvitationLink } from '../../../models/invitation-link';
import { InvitationLinkRepository } from '../invitation-link.repository';
import { FirebaseCongregationDatasourceService } from './firebase-congregation-datasource.service';
import { Congregation } from '../../../models/congregation';
import { congregationConverter } from '../../../models/firebase/firebase-congregation-model';
import { firebaseEntityConverterFactory } from '../../shared/utils/firebase-entity-converter';

@Injectable({
  providedIn: 'root',
})
export class FirebaseInvitationLinkDataSourceService implements InvitationLinkRepository {
  static readonly COLLECTION_NAME = 'invitation_links';
  private readonly invitationLinkCollection: CollectionReference<InvitationLink>;
  private readonly congregationCollection: CollectionReference<Congregation>;

  constructor(private readonly firestore: Firestore) {
    // USERS COLLECTION
    this.invitationLinkCollection = collection(
      this.firestore,
      FirebaseInvitationLinkDataSourceService.COLLECTION_NAME
    ).withConverter<InvitationLink>(firebaseEntityConverterFactory());

    // CONGREGATION COLLECTION
    this.congregationCollection = collection(
      this.firestore,
      FirebaseCongregationDatasourceService.COLLECTION_NAME
    ).withConverter(congregationConverter);
  }

  /**
   * Gets the Invitation Link using the ID and also resolve the Congregation reference.
   */
  getById(id: string): Observable<InvitationLink | undefined> {
    const designationDocReference = doc(this.invitationLinkCollection, `${id}`);

    return docData(designationDocReference, {
      idField: 'id',
    }).pipe(
      switchMap(invitationLink => {
        if (!invitationLink) {
          return of(undefined);
        }

        const EMPTY_CONGREGATION: Congregation = {
          id: '',
          name: '',
          locatedOn: '',
          cities: [],
        };

        // Resolving FireBase Congregation Reference
        const congregationDocRef = this.createCongregationDoc(invitationLink.congregation.id);

        return FirebaseCongregationDatasourceService.resolveUserCongregationReference(congregationDocRef).pipe(
          map(congregation => {
            if (!congregation) {
              // User with congregation deleted
              return { ...invitationLink, congregation: EMPTY_CONGREGATION };
            }

            // Overriding congregation reference with congregation data
            return { ...invitationLink, congregation: { ...congregation } };
          })
        );
      })
    );
  }

  add(invitationLink: Omit<InvitationLink, 'id'>): Observable<InvitationLink> {
    const congregationDocReference = this.createCongregationDoc(invitationLink.congregation.id);

    const data = {
      ...invitationLink,
      congregation: congregationDocReference,
    };

    // Creating a reference to the new document, so we can get the id
    const newInvitationLinkDocRef = doc(this.invitationLinkCollection);

    // @ts-expect-error Set doc expects a type of InvitationLink; however, to establish the Congregation reference, it becomes another type We should find a better way around this limitation.
    const newInvitationLink$ = from(setDoc(newInvitationLinkDocRef, { ...data, id: newInvitationLinkDocRef.id }));

    return newInvitationLink$.pipe(
      switchMap(() => {
        return this.getById(newInvitationLinkDocRef.id) as Observable<InvitationLink>;
      })
    );
  }

  // TODO: This should be simpler... Maybe the collections should defined in a saperated file so they could be
  //  reused on other DataSource classes
  private createCongregationDoc(congregationId: string) {
    return doc(this.congregationCollection, congregationId);
  }
}
