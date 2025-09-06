import { TestBed } from '@angular/core/testing';
import { MockProvider, ngMocks } from 'ng-mocks';
import { lastValueFrom, of } from 'rxjs';

import { territoryMockBuilder } from '../../../../../test/mocks/models/territory.mock';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { type TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { TerritoryStatisticsBO, type TStatisticsPeriod } from '../territory-statistics/territory-statistics.bo';
import { type TerritoryStatisticsDTO } from '../../dto/territory-statistics.dto';
import { UserStateService } from '../../../../state/user.state.service';
import { TerritoryRepository } from '../../../../repositories/territories.repository';

// PLEASE DO NOT MODIFY THOSE, AS THEY'RE BEING USED IN OTHER TESTS
export const mockMoveVisit: TerritoryVisitHistory = {
  id: '1',
  date: new Date(),
  visitOutcome: VisitOutcomeEnum.MOVED,
  isRevisit: false,
  notes: 'MOVED TEST',
};

export const mockRevisit: TerritoryVisitHistory = {
  id: '2',
  date: new Date(),
  visitOutcome: VisitOutcomeEnum.SPOKE,
  isRevisit: true,
  notes: 'REVISIT',
};

export const mockNotAnswered: TerritoryVisitHistory = {
  id: '3',
  date: new Date(),
  visitOutcome: VisitOutcomeEnum.NOT_ANSWERED,
  isRevisit: false,
  notes: 'NOT_ANSWERED',
};

export const mockNotVisitAgain: TerritoryVisitHistory = {
  id: '4',
  date: new Date(),
  visitOutcome: VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN,
  isRevisit: false,
  notes: 'ASKED_TO_NOT_VISIT_AGAIN',
};

// PLEASE DO NOT MODIFY THOSE, AS THEY'RE BEING USED IN OTHER TESTS
export const mockMovedTerritory = territoryMockBuilder({ recentHistory: [mockMoveVisit], history: [mockMoveVisit] });
export const mockNotAnsweredTerritory = territoryMockBuilder({
  recentHistory: [mockNotAnswered],
  history: [mockNotAnswered],
});
export const mockNotVisitTerritory = territoryMockBuilder({
  recentHistory: [mockNotVisitAgain],
  history: [mockNotVisitAgain],
});
export const mockRevisitTerritory = territoryMockBuilder({ recentHistory: [mockRevisit], history: [mockRevisit] });
export const mockStudentTerritory = territoryMockBuilder({ isBibleStudent: true });

// PLEASE DO NOT MODIFY IT, AS THIS IS BEING USED IN OTHER TESTS
export const mockTerritories = [mockMovedTerritory, mockRevisitTerritory, mockStudentTerritory, mockNotAnsweredTerritory, mockNotVisitTerritory];

describe('TerritoryStatisticsBO', () => {
  let territoryStatisticsBO: TerritoryStatisticsBO;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TerritoryStatisticsBO,
        MockProvider(UserStateService),
        MockProvider(TerritoryRepository, {
          getAllByCongregation: () => of(mockTerritories),
        }),
      ],
    });

    territoryStatisticsBO = TestBed.inject(TerritoryStatisticsBO);
  });

  describe('deriveTerritoryStatistics', () => {
    it('should return derive territories correctly', () => {
      expect(territoryStatisticsBO.deriveTerritoryStatistics(mockTerritories)).toEqual(
        expect.objectContaining({
          territoryCount: 5,
          peopleCount: 5,
          movedCount: 1,
          bibleStudiesCount: 1,
        } as TerritoryStatisticsDTO)
      );
    });

    it('should store the territory in cache', async () => {
      const territoryRepository = ngMocks.get(TerritoryRepository);
      const territoryRepositoryMock = jest.spyOn(territoryRepository, 'getAllByCongregation');

      // First call should call remote repo
      const firstCallResponse = await lastValueFrom(territoryStatisticsBO.getTerritories(undefined));
      expect(territoryRepository.getAllByCongregation).toHaveBeenCalled();
      expect(firstCallResponse).toEqual(expect.objectContaining(mockTerritories));
      territoryRepositoryMock.mockClear();

      // Second call should use cache
      const secondCallResponse = await lastValueFrom(territoryStatisticsBO.getTerritories(undefined));
      expect(territoryRepository.getAllByCongregation).not.toHaveBeenCalled();
      expect(secondCallResponse).toEqual(expect.objectContaining(mockTerritories));
    });
  });

  describe('deriveTerritoryDynamicStatistics', () => {
    const currentDate = new Date('2025-06-15');

    const thisMonthVisit: TerritoryVisitHistory = {
      id: '3',
      date: new Date('2025-06-01T00:00:00-03:00'),
      visitOutcome: VisitOutcomeEnum.SPOKE,
      isRevisit: true,
      notes: 'Last month visit',
    };

    const lastMonthVisit: TerritoryVisitHistory = {
      id: '4',
      date: new Date('2025-05-15'),
      visitOutcome: VisitOutcomeEnum.SPOKE,
      isRevisit: true,
      notes: 'Last month visit',
    };

    const twoMonthsNonVisit: TerritoryVisitHistory = {
      id: '5',
      date: new Date('2025-04-15'),
      visitOutcome: VisitOutcomeEnum.NOT_ANSWERED,
      isRevisit: false,
      notes: 'Two months ago non answered',
    };

    const threeMonthsVisit: TerritoryVisitHistory = {
      id: '6',
      date: new Date('2025-03-15'),
      visitOutcome: VisitOutcomeEnum.SPOKE,
      isRevisit: true,
      notes: 'Three months ago revisit',
    };

    const sixMonthsVisit: TerritoryVisitHistory = {
      id: '7',
      date: new Date('2025-01-15'),
      visitOutcome: VisitOutcomeEnum.SPOKE,
      isRevisit: true,
      notes: 'Two months ago revisit',
    };

    const oneYearVisit: TerritoryVisitHistory = {
      id: '8',
      date: new Date('2024-06-15'),
      visitOutcome: VisitOutcomeEnum.REVISIT,
      isRevisit: true,
      notes: 'Two months ago revisit',
    };

    const territoryOneHistory = [lastMonthVisit, threeMonthsVisit, oneYearVisit];
    const territoryTwoHistory = [thisMonthVisit, twoMonthsNonVisit, sixMonthsVisit];
    const territory1 = territoryMockBuilder({
      note: 'Territory 1',
      history: territoryOneHistory,
      recentHistory: territoryOneHistory,
    });
    const territory2 = territoryMockBuilder({
      note: 'Territory 2',
      history: territoryTwoHistory,
      recentHistory: territoryTwoHistory,
    });

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(currentDate);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it.each([
      'THIS_MONTH',
      'ONE_MONTH',
      'THREE_MONTHS',
      'SIX_MONTHS',
      'ONE_YEAR',
      'YEAR_TO_DATE',
    ] as TStatisticsPeriod[])('should derive statistics correctly for period: %s', (period) => {
      const result = territoryStatisticsBO.deriveTerritoryDynamicStatistics([territory1, territory2], period);

      const expectedCounts: Record<TStatisticsPeriod, { visitCount: number; revisitCount: number }> = {
        THIS_MONTH: { visitCount: 1, revisitCount: 1 },
        ONE_MONTH: { visitCount: 2, revisitCount: 2 },
        THREE_MONTHS: { visitCount: 3, revisitCount: 3 },
        SIX_MONTHS: { visitCount: 4, revisitCount: 4 },
        ONE_YEAR: { visitCount: 5, revisitCount: 5 },
        YEAR_TO_DATE: { visitCount: 4, revisitCount: 4 },
      };

      expect(result).toEqual(expectedCounts[period]);
    });

    it('should return zero counts for empty territory list', () => {
      const result = territoryStatisticsBO.deriveTerritoryDynamicStatistics([], 'ONE_MONTH');

      expect(result).toEqual({
        visitCount: 0,
        revisitCount: 0,
      });
    });

    it('should not count for dynamic statistics', () => {
      const result = territoryStatisticsBO.deriveTerritoryDynamicStatistics(
        [mockMovedTerritory, mockNotAnsweredTerritory, mockNotVisitTerritory],
        'ONE_MONTH'
      );

      expect(result).toEqual({
        visitCount: 0,
        revisitCount: 0,
      });
    });
  });
});
