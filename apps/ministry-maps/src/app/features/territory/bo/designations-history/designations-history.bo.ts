import { inject, Injectable } from '@angular/core';
import { combineLatest, map, Observable, take } from 'rxjs';

import { Designation } from '../../../../../models/designation';
import { DesignationsProgress, territoryProgressKey } from '../../../../../models/designations-progress';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { DesignationRepository } from '../../../../repositories/designation.repository';
import { DesignationsHeaderRepository } from '../../../../repositories/designations-header.repository';
import { DesignationsProgressRepository } from '../../../../repositories/designations-progress.repository';
import {
  DesignationTerritoryRow,
  DesignationsHeaderDetail,
  DesignationsHeaderPage,
  HeaderProgressSummary,
  OutcomeCount,
} from '../../models/designations-history.models';

@Injectable({ providedIn: 'root' })
export class DesignationsHistoryBO {
  static readonly PAGE_SIZE = 20;

  private readonly designationsHeaderRepository = inject(DesignationsHeaderRepository);
  private readonly designationsProgressRepository = inject(DesignationsProgressRepository);
  private readonly designationRepository = inject(DesignationRepository);

  getHeadersPage(congregationId: string, startAfterCreatedAt?: Date): Observable<DesignationsHeaderPage> {
    return this.designationsHeaderRepository
      .getPageByCongregation(congregationId, DesignationsHistoryBO.PAGE_SIZE + 1, startAfterCreatedAt)
      .pipe(
        map((result) => ({
          hasMore: result.length > DesignationsHistoryBO.PAGE_SIZE,
          headers: result.slice(0, DesignationsHistoryBO.PAGE_SIZE),
        })),
      );
  }

  getHeaderDetailStream(headerId: string): Observable<DesignationsHeaderDetail | undefined> {
    return combineLatest([
      this.designationsHeaderRepository.getById(headerId),
      this.designationsProgressRepository.getStreamByHeaderId(headerId),
    ]).pipe(
      map(([header, progress]) =>
        header
          ? {
              header,
              progress: progress ? DesignationsHistoryBO.summarize(progress) : null,
              rawTerritories: progress?.territories ?? {},
            }
          : undefined,
      ),
    );
  }

  getDesignation(designationId: string): Observable<Designation | undefined> {
    return this.designationRepository.getById(designationId).pipe(take(1));
  }

  static summarize(progress: DesignationsProgress, now = new Date()): HeaderProgressSummary {
    const territories = Object.values(progress.territories ?? {});
    const designations = Object.entries(progress.designations ?? {})
      .sort(([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(([designationId, entry], index) => {
        const territoriesDone = territories.filter((territory) => territory.designationId === designationId).length;
        const territoriesTotal = entry.territoriesTotal;
        return {
          designationId,
          index: index + 1,
          territoriesTotal,
          territoriesDone,
          percent: territoriesTotal
            ? Math.min(100, Math.max(0, Math.round((territoriesDone / territoriesTotal) * 100)))
            : 0,
          createdAt: entry.createdAt,
          expiresAt: entry.expiresAt,
          isExpired: entry.expiresAt.getTime() < now.getTime(),
        };
      });
    const territoriesTotal = designations.reduce((sum, item) => sum + item.territoriesTotal, 0);
    const territoriesDone = territories.length;
    const outcomeCounts: OutcomeCount[] = Object.values(VisitOutcomeEnum)
      .filter((value): value is VisitOutcomeEnum => typeof value === 'number')
      .map((outcome) => ({ outcome, count: territories.filter((item) => item.outcome === outcome).length }))
      .filter((item) => item.count > 0);

    return {
      territoriesTotal,
      territoriesDone,
      percent: territoriesTotal
        ? Math.min(100, Math.max(0, Math.round((territoriesDone / territoriesTotal) * 100)))
        : 0,
      outcomeCounts,
      designations,
    };
  }

  static buildTerritoryRows(
    designation: Designation,
    territories: DesignationsProgress['territories'],
  ): DesignationTerritoryRow[] {
    return designation.territories.map((territory) => {
      const entry = territories[territoryProgressKey(designation.id, territory.id)];
      return {
        territoryId: territory.id,
        address: territory.address,
        city: territory.city,
        isDone: !!entry,
        outcome: entry?.outcome,
        completedAt: entry?.completedAt,
      };
    });
  }
}
