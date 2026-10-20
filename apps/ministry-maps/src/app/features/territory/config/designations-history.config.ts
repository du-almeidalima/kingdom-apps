import { DesignationsHeaderClosedByEnum } from '../../../../models/enums/designations-header-closed-by';
import { VisitOutcomeEnum } from '../../../../models/enums/visit-outcome';

/** Plural outcome labels for the header summary counts (e.g. `Contatados 2`). */
export const VISIT_OUTCOME_COUNT_LABELS: Record<VisitOutcomeEnum, string> = {
  [VisitOutcomeEnum.SPOKE]: 'Contatados',
  [VisitOutcomeEnum.NOT_ANSWERED]: 'Ninguém atendeu',
  [VisitOutcomeEnum.MOVED]: 'Mudaram',
  [VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN]: 'Não visitar',
  [VisitOutcomeEnum.REVISIT]: 'Revisita',
};

export const CLOSED_BY_LABELS: Record<DesignationsHeaderClosedByEnum, string> = {
  [DesignationsHeaderClosedByEnum.USER]: 'manualmente',
  [DesignationsHeaderClosedByEnum.CRON]: 'automaticamente',
};
