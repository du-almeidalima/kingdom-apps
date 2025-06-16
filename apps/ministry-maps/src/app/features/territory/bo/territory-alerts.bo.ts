import { type Territory } from '../../../../models/territory';
import { VisitOutcomeEnum } from '../../../../models/enums/visit-outcome';
import { differenceInMonths } from '../../../shared/utils/date';
import { TerritoryVisitHistory } from '../../../../models/territory-visit-history';
import { Injectable } from '@angular/core';
import { TerritoryRepository } from '../../../repositories/territories.repository';
import { concat, Observable, retry } from 'rxjs';

@Injectable()
export class TerritoryAlertsBO {
  constructor(private readonly territoryRepository: TerritoryRepository) {}

  /**
   * Looks into territory [recentHistory]{@link Territory.recentHistory} to find if it has recently been visited.
   * @return boolean if found.
   */
  static hasRecentRevisit(territory: Territory) {
    return !!territory.recentHistory?.some(history => history.isRevisit);
  }

  /**
   * Looks into territory [recentHistory]{@link Territory.recentHistory} to find if it was marked as moved.
   * @return boolean if found.
   */
  static hasRecentlyMoved(territory: Territory) {
    return !!territory.recentHistory?.some(history => {
      if (history.isResolved) {
        return false;
      }

      return history.visitOutcome === VisitOutcomeEnum.MOVED;
    });
  }

  /**
   * Looks into territory [recentHistory]{@link Territory.recentHistory} to find if it was asked to not visit again.
   * It looks for one month window.
   * @return boolean if found.
   */
  static hasRecentlyAskedToStopVisiting(territory: Territory) {
    return !!territory.recentHistory?.some(history => {
      if (history.isResolved) {
        return false;
      }

      if (history.visitOutcome === VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN && history.date) {
        const currentDate = new Date();
        const difference = differenceInMonths(history.date, currentDate);

        return difference < 24;
      }

      return false;
    });
  }

  /** Finds if a Territory is from a Bible student by checking the {@link Territory#isBibleStudent|isBibleStudent} */
  static isBibleStudent(territory: Territory) {
    return !!territory.isBibleStudent;
  }

  /** Finds alerts that need attention from the Organizer. Useful when assigning territories */
  static findImportantAlert(territory: Territory) {
    if (TerritoryAlertsBO.hasRecentlyMoved(territory)) {
      return VisitOutcomeEnum.MOVED;
    }
    if (TerritoryAlertsBO.hasRecentlyAskedToStopVisiting(territory)) {
      return VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN;
    }

    return null;
  }

  static alertMessaging(alert: VisitOutcomeEnum): { title: string; bodyText: string } {
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
  }

  /**
   * Give the visitOutcome it will mark all recentHistory as resolved and update them in repository.
   *
   * __NOTE:__ This will only update {@link Territory.recentHistory} since it's what's looked for to display alerts.
   * No changes will be made on history.
   */
  resolveTerritoryHistoryAlert(
    territory: Territory,
    histories: TerritoryVisitHistory[],
    visitOutcome: VisitOutcomeEnum
  ): Observable<void> {
    const copiedTerritory = structuredClone(territory);
    // Update all entries for the given outcome
    const updatedHistories = histories.map(history => {
      const historyClone: TerritoryVisitHistory = structuredClone(history);

      if (history.visitOutcome === visitOutcome) {
        historyClone.isResolved = true;
      }

      if (visitOutcome === VisitOutcomeEnum.REVISIT && history.isRevisit) {
        historyClone.isRevisit = false;
      }

      return historyClone;
    });

    // This will be used to update recentHistory in repository
    copiedTerritory.history = updatedHistories;
    const updateRecentHistoryArray$ = this.territoryRepository.update(copiedTerritory);

    // Updating the history collection
    const updateHistoryCollection$ = updatedHistories.map(history => {
      return this.territoryRepository.setVisitHistory(territory.id, history);
    });

    return concat(updateRecentHistoryArray$, ...updateHistoryCollection$).pipe(retry(2));
  }
}
