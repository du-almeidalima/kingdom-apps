import { type Territory } from '../../../../../models/territory';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { differenceInMonths } from '../../../../shared/utils/date';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { Injectable } from '@angular/core';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
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
   * It looks for unresolved entries within a 24-month window (see commit 029f5f0).
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
          <p>Esse morador pediu para não ser visitado por uma Testemunha de Jeová recentemente dentro dos últimos dois anos.</p>
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
   * Marks the given histories as resolved (or clears `isRevisit` when the outcome is REVISIT) and
   * saves the result in two places:
   *
   * 1. the territory document — the repository rebuilds `recentHistory` from the `history` array
   *    sent here, so alert badges reflect the change;
   * 2. each entry's `history/{id}` subcollection doc — so completing a visit (which appends from
   *    the subcollection) doesn't bring back the resolved flag.
   *
   * `histories` may be a subset of `recentHistory` (the Revisita / Não Visitar dialogs pre-filter):
   * it is merged back into the full list so unrelated entries are kept.
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

    // The repository derives `recentHistory` from the `history` field on update. Callers may pass
    // only a subset of recentHistory (e.g., only revisit entries), so we merge the updated entries
    // back into the full recentHistory to avoid dropping unrelated entries from the document.
    const updatedById = new Map(updatedHistories.map(history => [history.id, history]));
    const currentRecentHistory = copiedTerritory.recentHistory ?? [];
    copiedTerritory.history = [
      ...currentRecentHistory.map(history => updatedById.get(history.id) ?? history),
      ...updatedHistories.filter(history => !currentRecentHistory.some(h => h.id === history.id)),
    ];
    const updateRecentHistoryArray$ = this.territoryRepository.update(copiedTerritory);

    // Updating the history collection
    const updateHistoryCollection$ = updatedHistories.map(history => {
      return this.territoryRepository.setVisitHistory(territory.id, history);
    });

    return concat(updateRecentHistoryArray$, ...updateHistoryCollection$).pipe(retry(2));
  }
}
