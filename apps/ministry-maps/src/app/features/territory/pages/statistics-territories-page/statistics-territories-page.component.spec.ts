import { StatisticsTerritoriesPageComponent } from './statistics-territories-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';
import { TerritoryStatisticsBO } from '../../bo/territory-statistics/territory-statistics.bo';
import { of } from 'rxjs';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { territoryMockBuilder } from '../../../../../test/mocks/models/territory.mock';

describe('StatisticsTerritoriesPageComponent', () => {
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

  beforeEach(() =>
    MockBuilder(StatisticsTerritoriesPageComponent)
      .provide([...MOCK_REPOSITORIES_PROVIDERS])
      .mock(TerritoryStatisticsBO, {
        getTerritories: jest.fn().mockReturnValue(of(territories)),
      })
  );

  it('should create', () => {
    const component = MockRender(StatisticsTerritoriesPageComponent);

    expect(component.point.componentInstance).toBeTruthy();
  });
});
