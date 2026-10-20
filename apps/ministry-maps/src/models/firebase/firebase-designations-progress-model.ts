import { Timestamp } from 'firebase/firestore';

import { DesignationProgressEntry, DesignationsProgress, TerritoryProgressEntry } from '../designations-progress';

export type FirebaseDesignationProgressEntry = Omit<DesignationProgressEntry, 'createdAt' | 'expiresAt'> & {
  createdAt: Timestamp;
  expiresAt: Timestamp;
};
export type FirebaseTerritoryProgressEntry = Omit<TerritoryProgressEntry, 'completedAt'> & { completedAt: Timestamp };
export type FirebaseDesignationsProgressModel = Omit<DesignationsProgress, 'designations' | 'territories' | 'expireAt'> & {
  designations?: Record<string, FirebaseDesignationProgressEntry>;
  territories?: Record<string, FirebaseTerritoryProgressEntry>;
  expireAt?: Timestamp;
};
