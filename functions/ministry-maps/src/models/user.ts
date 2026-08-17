import type { DocumentReference } from 'firebase-admin/firestore';

export type Role = 'PUBLISHER' | 'ORGANIZER' | 'ELDER' | 'ADMIN' | 'SUPERINTENDENT' | 'APP_ADMIN';

export interface UserDoc {
  id: string;
  email: string;
  name: string;
  photoUrl: string;
  role: Role;
  congregation?: DocumentReference;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  photoUrl: string;
  role: Role;
  congregationId: string | null;
}
