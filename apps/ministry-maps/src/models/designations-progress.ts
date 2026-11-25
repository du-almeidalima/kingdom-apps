import { VisitOutcomeEnum } from './enums/visit-outcome';

/** Fixed id of the single progress document inside `designations_header/{headerId}/progress`. */
export const DESIGNATIONS_PROGRESS_DOC_ID = 'summary';

/** Registered by the Assign flow when a designation is created. */
export type DesignationProgressEntry = { territoriesTotal: number; createdAt: Date; expiresAt: Date };

/** Set by /work when a territory visit is completed (or edited); deleted on undo. */
export type TerritoryProgressEntry = {
  designationId: string;
  territoryId: string;
  outcome: VisitOutcomeEnum;
  completedAt: Date;
};

export type DesignationsProgress = {
  id: string;
  headerId: string;
  congregationId: string;
  designations: Record<string, DesignationProgressEntry>;
  territories: Record<string, TerritoryProgressEntry>;
  expireAt?: Date;
};

/** Map key for {@link DesignationsProgress.territories}. */
export const territoryProgressKey = (designationId: string, territoryId: string) => `${designationId}_${territoryId}`;
