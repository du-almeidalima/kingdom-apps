import type { DocumentReference, FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Role } from './user';

export interface InvitationDoc {
  id?: string;
  email?: string;
  role: Role;
  congregation: DocumentReference;
  isValid: boolean;
  usedAt?: Timestamp | FieldValue;
  usedBy?: string;
}
