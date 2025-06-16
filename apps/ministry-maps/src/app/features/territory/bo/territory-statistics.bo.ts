import { Injectable } from '@angular/core';
import { map, Observable, of, take, tap } from 'rxjs';

import { TerritoryRepository } from '../../../repositories/territories.repository';
import type { Territory } from '../../../../models/territory';
import type { TerritoryStatisticsDTO, TerritoryStatisticsDynamicDTO } from '../dto/territory-statistics.dto';
import { UserStateService } from '../../../state/user.state.service';
import { cityFilter } from '../../../shared/utils/territories-filter-pipe';
import { VisitOutcomeEnum } from '../../../../models/enums/visit-outcome';
import { TerritoryAlertsBO } from './territory-alerts.bo';

/**
 * Represents the interval for dynamic calculations
 * @see TerritoryStatisticsBO.deriveTerritoryDynamicStatistics
 */
export type TStatisticsPeriod =
  | 'YEAR_TO_DATE'
  | 'ONE_YEAR'
  | 'SIX_MONTHS'
  | 'THREE_MONTHS'
  | 'ONE_MONTH'
  | 'THIS_MONTH';

/**
 * This Business Object (BO) can be used to get {@link TerritoryStatisticsDTO} data.
 * <br />
 * <b>Note:</b> This class keeps a cache of fetched {@link TerritoryBO#territories|territories} to reduce request to the API. This means, it needs to be
 * provided where it's used and disposed of correctly.
 */
@Injectable()
export class TerritoryStatisticsBO {
  /** All the territories fetched from remote. The cache is only set on the first request and reused on later requests. */
  private territories: Territory[] = [];

  constructor(
    private readonly territoryRepository: TerritoryRepository,
    private readonly userState: UserStateService
  ) {}

  /**
   * Gets the {@link TerritoryStatisticsDTO} for the given city, if no city is provided, it returns the statistics for all
   * territories of this logged user congregation.
   */
  getTerritories(city: string | undefined): Observable<Territory[]> {
    const userCongregationId = this.userState.currentUser?.congregation?.id;

    if (!userCongregationId) {
      throw new Error('No user congregation id provided');
    }

    // If the territory cache is not set, fetch from remote, otherwise reuse what's in memory
    const territories$ =
      this.territories?.length > 0
        ? of(this.territories)
        : this.territoryRepository.getAllByCongregation(userCongregationId, { getHistory: true }).pipe(
            take(1),
            tap((territoriesRes) => {
              // Setting the cache.
              this.territories = territoriesRes;
            })
          );

    return territories$.pipe(
      map((territoriesRes) => {
        // When no city is provided, return everything
        return city ? territoriesRes.filter((t) => cityFilter(t, city)) : territoriesRes;
      })
    );
  }

  /** This method derives the {@link TerritoryStatisticsDTO} based on the provided {@link Territory|Territories} */
  deriveTerritoryStatistics(territories: Territory[]): TerritoryStatisticsDTO {
    const territoryStatistics: TerritoryStatisticsDTO = {
      territoryCount: 0,
      peopleCount: 0,
      bibleStudiesCount: 0,
      movedCount: 0,
    };

    return territories.reduce((acc, cur) => {
      acc.territoryCount++;
      acc.peopleCount += cur.peopleQuantity ? cur.peopleQuantity : 1;
      if (TerritoryAlertsBO.hasRecentlyMoved(cur)) acc.movedCount++;

      if (cur.isBibleStudent) acc.bibleStudiesCount++;

      return acc;
    }, territoryStatistics);
  }

  /** This method derives the {@link TerritoryStatisticsDynamicDTO} based on the provided {@link Territory|Territories} */
  deriveTerritoryDynamicStatistics(
    territories: Territory[],
    period: TStatisticsPeriod = 'ONE_MONTH'
  ): TerritoryStatisticsDynamicDTO {
    const baseDate = this.getDateFromPeriod(period);
    const territoryStatistics: TerritoryStatisticsDynamicDTO = {
      visitCount: 0,
      revisitCount: 0,
    };

    return territories.reduce((acc, cur) => {
      acc.visitCount += TerritoryStatisticsBO.getVisitCountInPeriod(cur, baseDate);
      acc.revisitCount += TerritoryStatisticsBO.getRevisitCountInPeriod(cur, baseDate);

      return acc;
    }, territoryStatistics);
  }

  /**
   * Looks into territory {@link Territory.history} to find if it was marked as revisit.
   * @param territory The territory to perform the check.
   * @param basedDate The date to match. Acts like a minimum base where only more recent dates are considered.
   */
  static getRevisitCountInPeriod(territory: Territory, basedDate: Date) {
    const revisit = territory.history?.reduce((count, history) => {
      if (basedDate > history.date) {
        return count;
      }

      return history.isRevisit ? count + 1 : count;
    }, 0);

    return revisit ?? 0;
  }

  /**
   * Looks into territory {@link Territory.history} to find the amount of time it was contacted successfully.
   * @param territory The territory to perform the check.
   * @param basedDate The date to match. Acts like a minimum base where only more recent dates are considered.
   */
  static getVisitCountInPeriod(territory: Territory, basedDate: Date) {
    const visitCount = territory.history?.reduce((count, history) => {
      if (basedDate > history.date) {
        return count;
      }

      const wasContacted =
        history.visitOutcome === VisitOutcomeEnum.REVISIT || history.visitOutcome === VisitOutcomeEnum.SPOKE;

      return wasContacted ? count + 1 : count;
    }, 0);

    return visitCount ?? 0;
  }

  /**
   * Converts a StatisticsPeriod to a Date representing the start of that period.
   */
  private getDateFromPeriod(period: TStatisticsPeriod): Date {
    const result = new Date();
    result.setHours(0, 0, 0, 0);
    result.setDate(1);

    switch (period) {
      case 'YEAR_TO_DATE':
        result.setMonth(0, 1);
        break;
      case 'ONE_YEAR':
        result.setFullYear(result.getFullYear() - 1);
        break;
      case 'SIX_MONTHS':
        result.setMonth(result.getMonth() - 6);
        break;
      case 'THREE_MONTHS':
        result.setMonth(result.getMonth() - 3);
        break;
      case 'ONE_MONTH':
        result.setMonth(result.getMonth() - 1);
        break;
      case 'THIS_MONTH':
        result.setDate(1);
        break;
    }

    return result;
  }
}
