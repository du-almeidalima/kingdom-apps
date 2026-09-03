import { Timestamp } from 'firebase/firestore';
import { DesignationsHeader } from '../designations-header';

export type FirebaseDesignationsHeaderModel = Omit<DesignationsHeader, 'createdAt' | 'closedAt' | 'expireAt'> & {
  createdAt: Timestamp;
  closedAt?: Timestamp;
  expireAt?: Timestamp;
};
