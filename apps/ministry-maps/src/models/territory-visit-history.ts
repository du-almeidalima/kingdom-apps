import { VisitOutcome } from './enums/visit-outcome';

export type TerritoryVisitHistory = {
  date: Date;
  outcome: VisitOutcome;
  comments?: string;
};
