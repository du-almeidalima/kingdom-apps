import { inject, Injectable } from '@angular/core';
import { TerritoryRepository } from '../../../repositories/territories.repository';
import { Designation, DesignationTerritory } from '../../../../models/designation';
import { catchError, defaultIfEmpty, forkJoin, Observable, of } from 'rxjs';
import { DesignationRepository } from '../../../repositories/designation.repository';
import { DesignationStatusEnum } from '../../../../models/enums/designation-status';
import { DesignationsProgressRepository } from '../../../repositories/designations-progress.repository';
import { LoggerService } from '../../../shared/services/logger/logger.service';

/**
 * This class contains Business Logic use cases about the Work (Assignment) domain.
 * For example, operations related to {@code Designation} and {@code DesignationTerritory} should be handled here.
 */
@Injectable()
export class WorkBO {
  private readonly territoryRepository = inject(TerritoryRepository);
  private readonly designationRepository = inject(DesignationRepository);
  private readonly designationsProgressRepository = inject(DesignationsProgressRepository);
  private readonly loggerService = inject(LoggerService);

  /** Records the territory's latest visit on its header progress doc. No-op for legacy designations. Never errors. */
  recordTerritoryProgress(designation: Designation, territory: DesignationTerritory): Observable<void> {
    const lastVisit = territory.history?.[territory.history.length - 1];
    if (!designation.designationHeaderId || territory.status !== DesignationStatusEnum.DONE || !lastVisit) {
      return of(undefined);
    }

    return this.designationsProgressRepository
      .setTerritoryProgress(designation.designationHeaderId, {
        designationId: designation.id,
        territoryId: territory.id,
        outcome: lastVisit.visitOutcome,
        completedAt: lastVisit.date,
      })
      .pipe(
        defaultIfEmpty(undefined),
        catchError((err) => this.swallowProgressError(err, designation, territory)),
      );
  }

  /**
   * This method is used to undo changes made on the last visit of a Territory, commonly used when a publisher
   * mistakenly checked the wrong territory when completing a visit.
   */
  undoLastVisitChanges(designation: Designation, designationTerritory: DesignationTerritory) {
    const designationTerritoryCopy = structuredClone(designationTerritory);

    const removedHistory = designationTerritoryCopy.history?.pop();
    if (!removedHistory) {
      throw Error(`Territory don't have any history to undo.`);
    }
    designationTerritoryCopy.lastVisit =
      designationTerritoryCopy.history?.[designationTerritoryCopy.history.length - 1]?.date ?? null;
    designationTerritoryCopy.status = DesignationStatusEnum.PENDING;

    const { status: _status, ...territory } = designationTerritoryCopy;
    const updatedDesignation = this.updateDesignationTerritoryObject(designation, designationTerritoryCopy);

    const designationUpdate$ = this.designationRepository.update(updatedDesignation);
    const territoryUpdate$ = this.territoryRepository.update(territory);
    const visitHistoryDelete$ = this.territoryRepository.deleteVisitHistory(territory.id, removedHistory.id);

    const progressRevert$ = this.revertTerritoryProgress(designation, designationTerritoryCopy);
    return forkJoin([designationUpdate$, territoryUpdate$, visitHistoryDelete$, progressRevert$]);
  }

  private revertTerritoryProgress(designation: Designation, territory: DesignationTerritory): Observable<void> {
    if (!designation.designationHeaderId) return of(undefined);
    return this.designationsProgressRepository
      .removeTerritoryProgress(designation.designationHeaderId, designation.id, territory.id)
      .pipe(
        defaultIfEmpty(undefined),
        catchError((err) => this.swallowProgressError(err, designation, territory)),
      );
  }

  private swallowProgressError(
    err: unknown,
    designation: Designation,
    territory: DesignationTerritory,
  ): Observable<void> {
    void this.loggerService.warn(
      `Failed to update progress for Designation [${designation.id}], Territory [${territory.id}]: ${err}`,
    );
    return of(undefined);
  }

  /**
   * This method updates the provided {@linkcode designation} territories array, replacing the {@linkcode territory}.
   *
   * <b>Note: </b>This is needed because the territories is stored as an array in the {@link Designation} object. So,
   * whenever one of its items is updated, we need to send the entire array back to Firebase.
   *
   * @param designation The designation object that contains the {@linkcode territory}
   * @param territory The item that will replace its old reference in {@link Designation.territories}
   */
  updateDesignationTerritoryObject(designation: Designation, territory: DesignationTerritory): Designation {
    const designationCopy = structuredClone(designation);
    // Manually mutating the designations territories so order is preserved. Maybe it should be collection?
    const designationTerritories = designationCopy.territories;
    const updatedDesignationTerritories = designationTerritories.map((t) => {
      return t.id === territory.id
        ? {
            ...territory,
          }
        : t;
    });

    return {
      ...designationCopy,
      territories: updatedDesignationTerritories,
    };
  }
}
