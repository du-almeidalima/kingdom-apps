import { DocumentReference, Timestamp } from 'firebase/firestore';
import { Congregation } from '../congregation';
import { FirebaseCongregationModel } from './firebase-congregation-model';
import { InvitationLink } from '../invitation-link';

export type FirebaseInvitationLinkModel = Omit<InvitationLink, 'congregation' | 'createdAt'> & {
  congregation: DocumentReference<Congregation, FirebaseCongregationModel>;
  createdAt: Timestamp;
};
