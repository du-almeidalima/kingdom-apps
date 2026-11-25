import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject, lastValueFrom, of } from 'rxjs';

import { Designation } from '../../../../../models/designation';
import { DesignationsHeader } from '../../../../../models/designations-header';
import { DesignationsProgress, territoryProgressKey } from '../../../../../models/designations-progress';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { DesignationRepository } from '../../../../repositories/designation.repository';
import { DesignationsHeaderRepository } from '../../../../repositories/designations-header.repository';
import { DesignationsProgressRepository } from '../../../../repositories/designations-progress.repository';
import { designationsHeaderMockBuilder, territoryMockBuilder } from '../../../../../test/mocks';
import { DesignationsHistoryBO } from './designations-history.bo';

describe('DesignationsHistoryBO', () => {
  let bo: DesignationsHistoryBO;
  let headerRepo: jest.Mocked<DesignationsHeaderRepository>;
  let progressRepo: jest.Mocked<DesignationsProgressRepository>;
  let designationRepo: jest.Mocked<DesignationRepository>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      DesignationsHistoryBO,
      MockProvider(DesignationsHeaderRepository, { getPageByCongregation: jest.fn().mockReturnValue(of([])), getById: jest.fn().mockReturnValue(of(undefined)) }),
      MockProvider(DesignationsProgressRepository, { getStreamByHeaderId: jest.fn().mockReturnValue(of(undefined)) }),
      MockProvider(DesignationRepository, { getById: jest.fn().mockReturnValue(of(undefined)) }),
    ] });
    bo = TestBed.inject(DesignationsHistoryBO);
    headerRepo = TestBed.inject(DesignationsHeaderRepository) as jest.Mocked<DesignationsHeaderRepository>;
    progressRepo = TestBed.inject(DesignationsProgressRepository) as jest.Mocked<DesignationsProgressRepository>;
    designationRepo = TestBed.inject(DesignationRepository) as jest.Mocked<DesignationRepository>;
  });

  it('requests 21 headers, forwards the cursor, and returns at most 20 with hasMore', async () => {
    const headers = Array.from({ length: 21 }, (_, i) => designationsHeaderMockBuilder({ id: `H${i}` }));
    const cursor = new Date('2026-09-01T00:00:00Z');
    headerRepo.getPageByCongregation.mockReturnValue(of(headers));
    const page = await lastValueFrom(bo.getHeadersPage('C1', cursor));
    expect(headerRepo.getPageByCongregation).toHaveBeenCalledWith('C1', 21, cursor);
    expect(page.headers).toHaveLength(20);
    expect(page.hasMore).toBe(true);
    headerRepo.getPageByCongregation.mockReturnValue(of(headers.slice(0, 20)));
    expect((await lastValueFrom(bo.getHeadersPage('C1'))).hasMore).toBe(false);
  });

  it('streams missing headers, missing progress, and subsequent progress updates', (done) => {
    const header$ = new BehaviorSubject<DesignationsHeader | undefined>(undefined);
    const progress$ = new BehaviorSubject<DesignationsProgress | undefined>(undefined);
    headerRepo.getById.mockReturnValue(header$);
    progressRepo.getStreamByHeaderId.mockReturnValue(progress$);
    const seen: Array<{ territoriesDone: number | null } | undefined> = [];
    const sub = bo.getHeaderDetailStream('H1').subscribe((detail) => {
      seen.push(detail ? { territoriesDone: detail.progress?.territoriesDone ?? null } : undefined);
      if (seen.length === 3) {
        expect(seen).toEqual([undefined, { territoriesDone: null }, { territoriesDone: 1 }]);
        sub.unsubscribe();
        done();
      }
    });
    header$.next(designationsHeaderMockBuilder({ id: 'H1' }));
    progress$.next({ id: 'summary', headerId: 'H1', congregationId: 'C1', designations: {}, territories: {
      D1_T1: { designationId: 'D1', territoryId: 'T1', outcome: VisitOutcomeEnum.SPOKE, completedAt: new Date() },
    } });
  });

  it('summarizes totals, rounded percentages, ordered designations and outcome counts', () => {
    const now = new Date('2026-09-28T00:00:00Z');
    const progress: DesignationsProgress = {
      id: 'summary', headerId: 'H1', congregationId: 'C1',
      designations: {
        D2: { territoriesTotal: 2, createdAt: new Date('2026-01-02'), expiresAt: new Date('2027-01-01') },
        D1: { territoriesTotal: 1, createdAt: new Date('2026-01-01'), expiresAt: new Date('2026-01-02') },
      },
      territories: {
        D1_T1: { designationId: 'D1', territoryId: 'T1', outcome: VisitOutcomeEnum.SPOKE, completedAt: now },
        D2_T1: { designationId: 'D2', territoryId: 'T1', outcome: VisitOutcomeEnum.NOT_ANSWERED, completedAt: now },
      },
    };
    const summary = DesignationsHistoryBO.summarize(progress, now);
    expect(summary).toMatchObject({ territoriesTotal: 3, territoriesDone: 2, percent: 67 });
    expect(summary.designations.map((item) => [item.designationId, item.index, item.territoriesDone, item.percent, item.isExpired])).toEqual([
      ['D1', 1, 1, 100, true], ['D2', 2, 1, 50, false],
    ]);
    expect(summary.outcomeCounts).toEqual([{ outcome: VisitOutcomeEnum.SPOKE, count: 1 }, { outcome: VisitOutcomeEnum.NOT_ANSWERED, count: 1 }]);
    expect(DesignationsHistoryBO.summarize({ ...progress, designations: {}, territories: {} }, now).percent).toBe(0);
  });

  it('builds rows in designation order and ignores progress from other designations', () => {
    const designation: Designation = {
      id: 'D1', congregationId: 'C1', createdAt: new Date(), createdBy: 'U1', expiresAt: new Date(),
      territories: [territoryMockBuilder({ id: 'T2' }), territoryMockBuilder({ id: 'T1' })].map((t) => ({ ...t, status: 'PENDING' as never })),
    };
    const map: DesignationsProgress['territories'] = {
      [territoryProgressKey('D1', 'T1')]: { designationId: 'D1', territoryId: 'T1', outcome: VisitOutcomeEnum.SPOKE, completedAt: new Date() },
      [territoryProgressKey('D2', 'T2')]: { designationId: 'D2', territoryId: 'T2', outcome: VisitOutcomeEnum.MOVED, completedAt: new Date() },
    };
    const rows = DesignationsHistoryBO.buildTerritoryRows(designation, map);
    expect(rows.map((row) => [row.territoryId, row.isDone])).toEqual([['T2', false], ['T1', true]]);
  });

  it('loads a designation only through its first emission', async () => {
    designationRepo.getById.mockReturnValue(new BehaviorSubject(undefined));
    await expect(lastValueFrom(bo.getDesignation('D1'))).resolves.toBeUndefined();
    expect(designationRepo.getById).toHaveBeenCalledWith('D1');
  });
});
