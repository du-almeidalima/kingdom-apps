import { Injectable } from '@angular/core';
import { TerritoryRepository } from '../../../repositories/territories.repository';
import { DesignationRepository } from '../../../repositories/designation.repository';
import { forkJoin, map, Observable, switchMap } from 'rxjs';
import { Designation, DesignationTerritory } from '../../../../models/designation';
import { DesignationStatusEnum } from '../../../../models/enums/designation-status';
import { Territory } from '../../../../models/territory';

@Injectable()
export class TerritoryBO {
  constructor(
    private readonly territoryRepository: TerritoryRepository,
    private readonly designationRepository: DesignationRepository
  ) {}

  createDesignationForTerritories(territoriesIds: string[], userId?: string) {
    const territories$ = this.batchGetTerritoriesInIds(territoriesIds);

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
          createdAt: new Date(),
          createdBy: userId ?? '',
        };

        return this.designationRepository.add(newDesignation);
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
    const getTerritoriesIn$: Observable<Territory[]>[] = []

    const territoryIdsCopy = [...territoriesIds];

    while (territoryIdsCopy.length) {
      const batchIds = territoryIdsCopy.splice(0, BATCH_SIZE)

      getTerritoriesIn$.push(this.territoryRepository.getAllInIds(batchIds));
    }

    return forkJoin(getTerritoriesIn$)
      .pipe(
        map(territoriesBatches => territoriesBatches.flat())
      )
  }
}
