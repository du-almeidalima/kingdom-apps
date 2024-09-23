import { DocumentReference, Timestamp } from '@angular/fire/firestore';
import { Congregation } from '../congregation';
import { FirebaseCongregationModel } from './firebase-congregation-model';
import { InvitationLink } from '../invitation-link';

export type FirebaseInvitationLinkModel = Omit<InvitationLink, 'congregation' | 'createdAt'> & {
  congregation: DocumentReference<Congregation, FirebaseCongregationModel>;
  createdAt: Timestamp;
};
