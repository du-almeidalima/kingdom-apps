import { inject, Injectable } from '@angular/core';
import { TerritoryRepository } from '../../../repositories/territories.repository';
import { DesignationRepository } from '../../../repositories/designation.repository';
import { catchError, EMPTY, forkJoin, map, Observable, switchMap, tap } from 'rxjs';
import { Designation, DesignationTerritory } from '../../../../models/designation';
import { DesignationStatusEnum } from '../../../../models/enums/designation-status';
import { Territory } from '../../../../models/territory';
import { UserStateService } from '../../../state/user.state.service';
import { LoggerService } from '../../../shared/services/logger/logger.service';
import { CongregationSettingsBO } from '../../../core/features/congregation-settings/bo/congregation-settings.bo';

@Injectable()
export class TerritoryBO {
  private readonly territoryRepository = inject(TerritoryRepository);
  private readonly designationRepository = inject(DesignationRepository);
  private readonly userStateService = inject(UserStateService);
  private readonly loggerService = inject(LoggerService);
  private readonly congregationSettingsBO = inject(CongregationSettingsBO);

  createDesignationForTerritories(territoriesIds: string[]) {
    const user = this.userStateService.currentUser;
    const congregation = user?.congregation;

    if (!congregation || !user) {
      this.loggerService.error('No User: [{}] or Congregation: [{}] found while creating Designation.');
      return EMPTY;
    }

    if (!territoriesIds.length) {
      return EMPTY;
    }

    const territories$ = this.batchGetTerritoriesInIds(territoriesIds);

    const expiresInDays = this.congregationSettingsBO.getSettingOrDefault('designationAccessExpiryDays');
    const designationExpirationDate = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    return territories$.pipe(
      switchMap(territories => {
        const designationTerritories: DesignationTerritory[] = territories.map(t => {
          // This is not needed for the Designation Territory
          delete t['recentHistory'];

          return {
            ...t,
            status: DesignationStatusEnum.PENDING,
            history: t?.history?.slice(-5) ?? [],
          };
        });

        const newDesignation: Omit<Designation, 'id'> = {
          territories: designationTerritories,
          congregationId: congregation.id,
          createdAt: new Date(),
          createdBy: user.id,
          expiresAt: designationExpirationDate,
        };

        return this.designationRepository.add(newDesignation);
      }),
      catchError(err => {
        this.loggerService.error(err);
        return EMPTY;
      }),
      tap(designation => {
        if (designation) {
          this.loggerService.info(
            `Congregation [${congregation.name}] (${congregation.id}) created Designation [${designation.id}] by User [${user.name}] (${user.id}).`
          );
        }
      })
    );
  }

  public deleteTerritory(territoryId: string) {
    return this.territoryRepository.delete(territoryId).pipe(
      tap(() => {
        const user = this.userStateService.currentUser;
        const congregation = user?.congregation;

        this.loggerService.info(`Congregation [${congregation?.name}] (${congregation?.id}) deleted Territory [${territoryId}] by User [${user?.name}] (${user?.id}).`);
      })
    );
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

    return forkJoin(getTerritoriesIn$).pipe(map(territoriesBatches => territoriesBatches.flat()));
  }
}
