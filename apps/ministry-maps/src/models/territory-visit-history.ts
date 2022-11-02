import { VisitOutcomeEnum } from './enums/visit-outcome';

export type TerritoryVisitHistory = {
  id: string;
  date: Date;
  visitOutcome: VisitOutcomeEnum;
  isRevisit: boolean;
  notes: string;
};
