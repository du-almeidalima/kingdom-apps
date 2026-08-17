import { DesignationStatusEnum } from './enums/designation-status';
import { Territory } from './territory';
import { CongregationSettings } from './congregation';

export type DesignationTerritory = Omit<Territory, 'recentHistory'> & {
  status: DesignationStatusEnum;
};

export type DesignationSettings = Partial<Pick<CongregationSettings, 'shouldDesignationBlockAfterExpired'>>;

export type Designation = {
  id: string;
  congregationId: string;
  territories: DesignationTerritory[];
  createdAt: Date;
  createdBy: string;
  /** Business expiry: when the designation stops being workable (drives the disabled state). */
  expiresAt: Date;
  /** Firestore TTL deletion date (`expireAt` field policy). Deleted automatically ~6 months after creation. */
  expireAt?: Date;
  settings?: DesignationSettings;
};
