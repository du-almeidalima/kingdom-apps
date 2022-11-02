import { VisitOutcomeEnum } from './enums/visit-outcome';

export type TerritoryVisitHistory = {
  date: Date;
  outcome: VisitOutcomeEnum;
  comments?: string;
};
