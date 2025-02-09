import { TestBed } from '@angular/core/testing';
import { MockProvider, ngMocks } from 'ng-mocks';
import { lastValueFrom, of } from 'rxjs';

import { territoryMockBuilder } from '../../../../test/mocks/models/territory.mock';
import { VisitOutcomeEnum } from '../../../../models/enums/visit-outcome';
import { TerritoryVisitHistory } from '../../../../models/territory-visit-history';
import { TerritoryStatisticsBO } from './territory-statistics.bo';
import { TerritoryStatistics } from '../../../../models/territory-statistics';
import { UserStateService } from '../../../state/user.state.service';
import { TerritoryRepository } from '../../../repositories/territories.repository';

describe('TerritoryStatisticsBO', () => {
  let territoryStatisticsBO: TerritoryStatisticsBO;

  const mockMoveVisit: TerritoryVisitHistory = {
    id: '1',
    date: new Date(),
    visitOutcome: VisitOutcomeEnum.MOVED,
    isRevisit: false,
    notes: 'MOVED TEST',
  };

  const mockRevisit: TerritoryVisitHistory = {
    id: '2',
    date: new Date(),
    visitOutcome: VisitOutcomeEnum.SPOKE,
    isRevisit: true,
    notes: 'REVISIT',
  };

  const mockMovedTerritory = territoryMockBuilder({ recentHistory: [mockMoveVisit], history: [mockMoveVisit] });
  const mockRevisitTerritory = territoryMockBuilder({ recentHistory: [mockRevisit], history: [mockRevisit] });
  const mockStudentTerritory = territoryMockBuilder({ isBibleStudent: true });
  const territories = [mockMovedTerritory, mockRevisitTerritory, mockStudentTerritory];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TerritoryStatisticsBO,
        MockProvider(UserStateService),
        MockProvider(TerritoryRepository, {
          getAllByCongregation: () => of(territories)
        }),
      ],
    });

    territoryStatisticsBO = TestBed.inject(TerritoryStatisticsBO);
  });

  it('should return derive territories correctly', () => {
    expect(territoryStatisticsBO.deriveTerritoryStatistics(territories)).toEqual(
      expect.objectContaining({
        territoryCount: 3,
        peopleCount: 3,
        revisitCount: 1,
        movedCount: 1,
        bibleStudiesCount: 1,
      } as TerritoryStatistics)
    );
  });

  it('should store the territory in cache', async () => {
    const response: TerritoryStatistics = {
      territoryCount: 3,
      peopleCount: 3,
      revisitCount: 1,
      movedCount: 1,
      bibleStudiesCount: 1,
    };
    const territoryRepository = ngMocks.get(TerritoryRepository);
    const territoryRepositoryMock = jest.spyOn(territoryRepository, 'getAllByCongregation');

    // First call should call remote repo
    const firstCallResponse = await lastValueFrom(territoryStatisticsBO.getTerritoryStatistics(undefined));
    expect(territoryRepository.getAllByCongregation).toHaveBeenCalled();
    expect(firstCallResponse).toEqual(expect.objectContaining(response));
    territoryRepositoryMock.mockClear();
    // Second call should use cache
    const secondCallResponse = await lastValueFrom(territoryStatisticsBO.getTerritoryStatistics(undefined));
    expect(territoryRepository.getAllByCongregation).not.toHaveBeenCalled();
    expect(secondCallResponse).toEqual(expect.objectContaining(response));
  });
})
