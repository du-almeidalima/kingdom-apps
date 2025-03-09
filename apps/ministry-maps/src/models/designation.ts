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
  expiresAt: Date;
  settings?: DesignationSettings
};
