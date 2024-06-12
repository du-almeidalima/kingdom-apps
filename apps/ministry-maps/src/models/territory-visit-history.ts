import { VisitOutcomeEnum } from './enums/visit-outcome';

export type TerritoryVisitHistory = {
  id: string;
  notes: string;
  isRevisit: boolean;
  isResolved?: boolean;
  name?: string;
  date: Date;
  visitOutcome: VisitOutcomeEnum;
};
