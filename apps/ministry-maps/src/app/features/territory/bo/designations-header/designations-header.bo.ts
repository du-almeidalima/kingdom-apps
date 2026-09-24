import { inject, Injectable } from '@angular/core';
import { catchError, EMPTY, forkJoin, map, Observable, of, switchMap, tap, throwError } from 'rxjs';

import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { DesignationRepository } from '../../../../repositories/designation.repository';
import { DesignationsHeaderRepository } from '../../../../repositories/designations-header.repository';
import { Designation, DesignationSettings, DesignationTerritory } from '../../../../../models/designation';
import { DesignationStatusEnum } from '../../../../../models/enums/designation-status';
import { DesignationsHeader } from '../../../../../models/designations-header';
import { DesignationsHeaderStatusEnum } from '../../../../../models/enums/designations-header-status';
import { DesignationsHeaderClosedByEnum } from '../../../../../models/enums/designations-header-closed-by';
import { Territory } from '../../../../../models/territory';
import { UserStateService } from '../../../../state/user.state.service';
import { LoggerService } from '../../../../shared/services/logger/logger.service';
import { CongregationSettingsBO } from '../../../../core/features/congregation-settings/bo/congregation-settings.bo';

/**
 * Stateless orchestrator of the resumable designations cycle (`designations_header`).
 * Provided in root to be injected by `AssignTerritoriesStateService` (`providedIn: 'root'`).
 */
@Injectable({ providedIn: 'root' })
export class DesignationsHeaderBO {
  private readonly territoryRepository = inject(TerritoryRepository);
  private readonly designationRepository = inject(DesignationRepository);
  private readonly designationsHeaderRepository = inject(DesignationsHeaderRepository);
  private readonly userStateService = inject(UserStateService);
  private readonly loggerService = inject(LoggerService);
  private readonly congregationSettingsBO = inject(CongregationSettingsBO);

  /**
   * Creates a `Designation` for the given territories, attached to the congregation's active `designations_header`
   * (creating the header lazily on the first designation of a cycle).
   */
  createDesignation(
    territoriesIds: string[],
    activeHeader: DesignationsHeader | null,
  ): Observable<{ designation: Designation; header: DesignationsHeader }> {
    const user = this.userStateService.currentUser;
    const congregation = user?.congregation;

    if (!congregation || !user) {
      this.loggerService.error('No User: [{}] or Congregation: [{}] found while creating Designation.');
      return EMPTY;
    }

    if (!territoriesIds.length) {
      return EMPTY;
    }

    const header$ = this.resolveActiveHeader(activeHeader, congregation.id, user.id);
    const territories$ = this.batchGetTerritoriesInIds(territoriesIds);

    return forkJoin({ header: header$, territories: territories$ }).pipe(
      switchMap(({ header, territories }) => {
        const designationTerritories = this.buildDesignationTerritories(territories);
        const newDesignation = this.buildNewDesignation(congregation.id, user.id, header.id, designationTerritories);

        return this.designationRepository.add(newDesignation).pipe(map((designation) => ({ designation, header })));
      }),
      catchError((err) => {
        this.loggerService.error(err);
        return throwError(() => err);
      }),
      tap(({ designation, header }) => {
        this.loggerService.info(
          `Congregation [${congregation.name}] (${congregation.id}) created Designation [${designation.id}] under Designations Header [${header.id}] by User [${user.name}] (${user.id}).`,
        );
      }),
    );
  }

  /** Closes the header manually (Stop button), stamping `closedBy: 'USER'`. */
  closeHeader(headerId: string): Observable<void> {
    return this.designationsHeaderRepository.close(headerId, DesignationsHeaderClosedByEnum.USER).pipe(
      tap(() => {
        const user = this.userStateService.currentUser;

        this.loggerService.info(
          `Congregation User [${user?.name}] (${user?.id}) closed Designations Header [${headerId}] by manual stop.`,
        );
      }),
    );
  }

  /** Live stream of the congregation's active header cycle and its designations in real time. */
  getActiveSessionStream(
    congregationId: string,
  ): Observable<{ header: DesignationsHeader | null; designations: Designation[] }> {
    return this.designationsHeaderRepository.getInProgressStreamByCongregation(congregationId).pipe(
      switchMap((header) => {
        if (!header) {
          return of({ header: null, designations: [] });
        }

        return this.designationRepository
          .getStreamByHeaderId(header.id)
          .pipe(map((designations) => ({ header, designations })));
      }),
    );
  }

  private resolveActiveHeader(
    activeHeader: DesignationsHeader | null,
    congregationId: string,
    userId: string,
  ): Observable<DesignationsHeader> {
    if (activeHeader) {
      return of(activeHeader);
    }

    return this.designationsHeaderRepository
      .getInProgressByCongregation(congregationId)
      .pipe(
        switchMap((existingHeader) =>
          existingHeader ? of(existingHeader) : this.createHeader(congregationId, userId),
        ),
      );
  }

  private createHeader(congregationId: string, createdBy: string): Observable<DesignationsHeader> {
    const newHeader: Omit<DesignationsHeader, 'id'> = {
      congregationId,
      status: DesignationsHeaderStatusEnum.IN_PROGRESS,
      createdAt: new Date(),
      createdBy,
    };

    return this.designationsHeaderRepository.add(newHeader);
  }

  private buildDesignationTerritories(territories: Territory[]): DesignationTerritory[] {
    return territories.map((t) => {
      delete t['recentHistory'];

      return {
        ...t,
        status: DesignationStatusEnum.PENDING,
        history: t?.history?.slice(-5) ?? [],
      };
    });
  }

  private buildNewDesignation(
    congregationId: string,
    userId: string,
    headerId: string,
    territories: DesignationTerritory[],
  ): Omit<Designation, 'id'> {
    return {
      territories,
      congregationId,
      createdAt: new Date(),
      createdBy: userId,
      expiresAt: this.calculateExpirationDate(),
      settings: this.getDesignationSettings(),
      designationHeaderId: headerId,
    };
  }

  private calculateExpirationDate(): Date {
    const expiresInDays = this.congregationSettingsBO.getSettingOrDefault('designationAccessExpiryDays');
    return new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  }

  private getDesignationSettings(): DesignationSettings {
    return {
      shouldDesignationBlockAfterExpired: this.congregationSettingsBO.getSettingOrDefault(
        'shouldDesignationBlockAfterExpired',
      ),
    };
  }

  /**
   * Due to a limitation in Firebase that only allow 10 Firebase Query "IN", we are batching the Territory IDs call
   * And then joining the observables.
   */
  private batchGetTerritoriesInIds(territoriesIds: string[]): Observable<Territory[]> {
    const BATCH_SIZE = 10;

    if (territoriesIds.length <= BATCH_SIZE) {
      return this.territoryRepository.getAllInIds(territoriesIds);
    }

    // Sending batches of BATCH_SIZE territories and joining the response
    const getTerritoriesIn$: Observable<Territory[]>[] = [];

    const territoryIdsCopy = [...territoriesIds];

    while (territoryIdsCopy.length) {
      const batchIds = territoryIdsCopy.splice(0, BATCH_SIZE);

      getTerritoriesIn$.push(this.territoryRepository.getAllInIds(batchIds));
    }

    return forkJoin(getTerritoriesIn$).pipe(map((territoriesBatches) => territoriesBatches.flat()));
  }
}
