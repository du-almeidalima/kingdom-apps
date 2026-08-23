import { VisitOutcomeEnum } from './enums/visit-outcome';

export type TerritoryVisitHistory = {
  id: string;
  notes: string;
  isRevisit: boolean;
  isResolved?: boolean;
  name?: string;
  date: Date;
  visitOutcome: VisitOutcomeEnum;
  /** Congregation ID, stamped at write time to support collection-group queries (statistics). */
  congregationId?: string;
  /** Parent territory ID, stamped at write time. */
  territoryId?: string;
};
