import { Territory } from '../../../../models/territory';
import { VisitOutcomeEnum } from '../../../../models/enums/visit-outcome';
import { differenceInMonths } from '../../../shared/utils/date';

/**
 * Looks into territory [recentHistory]{@link Territory.recentHistory} to find if it has recently been visited.
 * @return boolean if found.
 */
export const hasRecentRevisit = (territory: Territory) => {
  return !!territory.recentHistory?.some(history => history.isRevisit);
};

/**
 * Looks into territory [recentHistory]{@link Territory.recentHistory} to find if it was marked as moved.
 * @return boolean if found.
 */
export const hasRecentlyMoved = (territory: Territory) => {
  return !!territory.recentHistory?.some(history => history.visitOutcome === VisitOutcomeEnum.MOVED);
};

/**
 * Looks into territory [recentHistory]{@link Territory.recentHistory} to find if it was asked to not visit again.
 * It looks for one month window.
 * @return boolean if found.
 */
export const hasRecentlyAskedToStopVisiting = (territory: Territory) => {
  return !!territory.recentHistory?.some(history => {
    if (history.visitOutcome === VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN && history.date) {
      const currentDate = new Date();
      const difference = differenceInMonths(history.date, currentDate);

      return difference < 1;
    }

    return false;
  });
};

/** Finds alerts that need attention from the Organizer. Useful when assigning territories */
export const findImportantAlert = (territory: Territory) => {
  if (hasRecentlyMoved(territory)) {
    return VisitOutcomeEnum.MOVED;
  }
  if (hasRecentlyAskedToStopVisiting(territory)) {
    return VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN;
  }

  return null;
};

export const alertMessaging = (alert: VisitOutcomeEnum): { title: string; bodyText: string } => {
  switch (alert) {
    case VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN:
      return {
        title: 'Não visitar',
        bodyText: `
          <p>Esse morador pediu para não ser visitado por uma Testemunha de Jeová recentemente dentro do último mês.</p>
          <p class='mt-5'>Você deseja designar esse território mesmo assim?</p>
        `,
      };
    case VisitOutcomeEnum.MOVED:
      return {
        title: 'Se Mudou',
        bodyText: `
          <p>Um publicador recentemente relatou que esse morador se mudou.</p>
          <p class='mt-5'>Você deseja designar esse território mesmo assim?</p>
        `,
      };
    default:
      return {
        title: 'Alerta Não Mapeado',
        bodyText: `Por favor, desconsidere esse aviso.`,
      };
  }
};
