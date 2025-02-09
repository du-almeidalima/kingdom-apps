import { Injectable } from '@angular/core';
import { TerritoryRepository } from '../../../repositories/territories.repository';
import { map, Observable, of, take, tap } from 'rxjs';
import { Territory } from '../../../../models/territory';
import { TerritoryStatistics } from '../../../../models/territory-statistics';
import { UserStateService } from '../../../state/user.state.service';
import { TerritoryAlertsBO } from './territory-alerts.bo';

/**
 * This Business Object (BO) can be used to get {@link TerritoryStatistics} data.
 * <br />
 * <b>Note:</b> This class keeps a cache of fetched {@link TerritoryBO#territories|territories} to reduce request to the API. This means, it needs to be
 * provided where it's used and disposed correctly.
 */
@Injectable()
export class TerritoryStatisticsBO {
  /** All the territories fetched from remote. The cache is only set on the first request and reused on subsequent requests. */
  private territories: Territory[] = [];

  constructor(
    private readonly territoryRepository: TerritoryRepository,
    private readonly userState: UserStateService
  ) {}

  /**
   * Gets the {@link TerritoryStatistics} for the given city, if no city is provided, it returns the statistics for all
   * territories of this logged user congregation.
   */
  getTerritoryStatistics(city: string | undefined): Observable<TerritoryStatistics> {
    const userCongregationId = this.userState.currentUser?.congregation?.id;

    if (!userCongregationId) {
      throw new Error('No user congregation id provided');
    }

    // If the territories cache is not set, fetch from remote, otherwise reuse what's in memory
    const territories$ = this.territories?.length > 0
      ? of(this.territories)
      : this.territoryRepository.getAllByCongregation(userCongregationId).pipe(
          take(1),
          tap(territoriesRes => {
            // Setting the cache.
            this.territories = territoriesRes;
          })
        );

    return territories$.pipe(
      map(territoriesRes => {
        // When no city is provided, return everything
        const filteredTerritories = city ? territoriesRes.filter(t => t.city === city) : territoriesRes;

        return this.deriveTerritoryStatistics(filteredTerritories);
      })
    );
  }

  /** This method derives the {@link TerritoryStatistics} based on the provided {@link Territory|Territories} */
  deriveTerritoryStatistics(territories: Territory[]): TerritoryStatistics {
    const territoryStatistics: TerritoryStatistics = {
      territoryCount: 0,
      peopleCount: 0,
      bibleStudiesCount: 0,
      movedCount: 0,
      revisitCount: 0,
    };

    return territories.reduce((acc, cur) => {
      acc.territoryCount++;
      acc.peopleCount += cur.peopleQuantity ? cur.peopleQuantity : 1;
      cur.isBibleStudent && acc.bibleStudiesCount++;
      TerritoryAlertsBO.hasRecentlyMoved(cur) && acc.movedCount++;
      TerritoryAlertsBO.hasRecentRevisit(cur) && acc.revisitCount++;

      return acc;
    }, territoryStatistics);
  }
}
