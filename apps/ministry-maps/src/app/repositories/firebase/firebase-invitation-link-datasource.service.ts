import { Injectable } from '@angular/core';
import {
  collection,
  CollectionReference,
  doc,
  DocumentReference,
  Firestore,
  getDoc,
  setDoc,
} from '@angular/fire/firestore';
import { from, map, Observable, of, switchMap } from 'rxjs';

import { InvitationLink } from '../../../models/invitation-link';
import { InvitationLinkRepository } from '../invitation-link.repository';
import { FirebaseCongregationDatasourceService } from './firebase-congregation-datasource.service';
import { Congregation } from '../../../models/congregation';
import { firebaseEntityConverterFactory } from '../../shared/utils/firebase-entity-converter';
import { FirebaseDatasource } from './firebase-datasource';

@Injectable({
  providedIn: 'root',
})
export class FirebaseInvitationLinkDataSourceService
  implements InvitationLinkRepository, FirebaseDatasource<InvitationLink>
{
  static readonly COLLECTION_NAME = 'invitation_links';
  private readonly invitationLinkCollection: CollectionReference<InvitationLink>;

  constructor(
    private readonly firestore: Firestore,
    private readonly congregationDatasourceService: FirebaseCongregationDatasourceService
  ) {
    // USERS COLLECTION
    this.invitationLinkCollection = collection(
      this.firestore,
      FirebaseInvitationLinkDataSourceService.COLLECTION_NAME
    ).withConverter<InvitationLink>(firebaseEntityConverterFactory());
  }

  createDocumentRef(id: string): DocumentReference<InvitationLink> {
    return doc(this.invitationLinkCollection, id);
  }

  /**
   * Gets the Invitation Link using the ID and also resolve the Congregation reference.
   */
  getById(id: string): Observable<InvitationLink | undefined> {
    const invitationLinkReference = doc(this.invitationLinkCollection, `${id}`);

    return from(getDoc(invitationLinkReference)).pipe(
      switchMap(invitationLinkSnapshot => {
        if (!invitationLinkSnapshot?.exists()) {
          return of(undefined);
        }

        const invitationLink = invitationLinkSnapshot.data();

        const EMPTY_CONGREGATION: Congregation = {
          id: '',
          name: '',
          locatedOn: '',
          cities: [],
        };

        // Resolving FireBase Congregation Reference
        const congregationDocRef = this.congregationDatasourceService.createDocumentRef(invitationLink.congregation.id);

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
    const congregationDocReference = this.congregationDatasourceService.createDocumentRef(
      invitationLink.congregation.id
    );

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

  update(invitationLink: Partial<InvitationLink>): Observable<void> {
    const invitationLinkReference = doc(this.invitationLinkCollection, `${invitationLink.id}`);

    return from(setDoc(invitationLinkReference, { ...invitationLink }));
  }
}
