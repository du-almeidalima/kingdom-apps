import { DesignationStatusEnum } from './enums/designation-status';
import { Territory } from './territory';

export type DesignationTerritory = Territory & {
  status: DesignationStatusEnum;
};

export type Designation = {
  id: string;
  territories: DesignationTerritory[];
};
