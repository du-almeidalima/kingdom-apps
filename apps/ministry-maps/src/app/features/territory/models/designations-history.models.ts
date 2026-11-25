import { DesignationsHeader } from '../../../../models/designations-header';
import { DesignationsProgress } from '../../../../models/designations-progress';
import { VisitOutcomeEnum } from '../../../../models/enums/visit-outcome';

export type DesignationsHeaderPage = { headers: DesignationsHeader[]; hasMore: boolean };
export type OutcomeCount = { outcome: VisitOutcomeEnum; count: number };
export type DesignationProgressSummary = {
  designationId: string;
  index: number;
  territoriesTotal: number;
  territoriesDone: number;
  percent: number;
  createdAt: Date;
  expiresAt: Date;
  isExpired: boolean;
};
export type HeaderProgressSummary = {
  territoriesTotal: number;
  territoriesDone: number;
  percent: number;
  outcomeCounts: OutcomeCount[];
  designations: DesignationProgressSummary[];
};
export type DesignationsHeaderDetail = {
  header: DesignationsHeader;
  progress: HeaderProgressSummary | null;
  rawTerritories: DesignationsProgress['territories'];
};
export type DesignationTerritoryRow = {
  territoryId: string;
  address: string;
  city: string;
  isDone: boolean;
  outcome?: VisitOutcomeEnum;
  completedAt?: Date;
};
