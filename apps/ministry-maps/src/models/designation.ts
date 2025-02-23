import { DesignationStatusEnum } from './enums/designation-status';
import { Territory } from './territory';

export type DesignationTerritory = Omit<Territory, 'recentHistory'> & {
  status: DesignationStatusEnum;
};

export type Designation = {
  id: string;
  congregationId: string;
  territories: DesignationTerritory[];
  createdAt: Date;
  createdBy: string;
  expiresAt?: Date;
};
