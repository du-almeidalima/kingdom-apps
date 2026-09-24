import type { Timestamp } from 'firebase-admin/firestore';

export type DesignationsHeaderStatus = 'IN_PROGRESS' | 'DONE';
export type DesignationsHeaderClosedBy = 'USER' | 'CRON';

export interface DesignationsHeaderDoc {
  id: string;
  congregationId: string;
  status: DesignationsHeaderStatus;
  createdAt: Timestamp;
  createdBy: string;
  closedAt?: Timestamp | null;
  closedBy?: DesignationsHeaderClosedBy | null;
  expireAt?: Timestamp | null;
}
