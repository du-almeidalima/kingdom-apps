import type { Timestamp } from 'firebase-admin/firestore';

export enum VisitOutcomeEnum {
  SPOKE,
  NOT_ANSWERED,
  MOVED,
  ASKED_TO_NOT_VISIT_AGAIN,
  REVISIT,
}

export type DesignationProgressEntry = { territoriesTotal: number; createdAt: Timestamp; expiresAt: Timestamp };
export type TerritoryProgressEntry = {
  designationId: string;
  territoryId: string;
  outcome: VisitOutcomeEnum;
  completedAt: Timestamp;
};
export type DesignationsProgressDoc = {
  id: string;
  headerId: string;
  congregationId: string;
  designations: Record<string, DesignationProgressEntry>;
  territories: Record<string, TerritoryProgressEntry>;
  expireAt: Timestamp;
};
