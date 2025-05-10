import { StatisticsTerritoriesPageComponent } from './statistics-territories-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';
import { TerritoryStatisticsBO } from '../../bo/territory-statistics.bo';
import { of } from 'rxjs';
import { TerritoryStatistics } from '../../../../../models/territory-statistics';

describe('StatisticsTerritoriesPageComponent', () => {
  const MOCK_TERRITORY_STATISTICS: TerritoryStatistics = {
    territoryCount: 10,
    peopleCount: 15,
    bibleStudiesCount: 3,
    movedCount: 2,
    revisitCount: 5,
  };

  beforeEach(() =>
    MockBuilder(StatisticsTerritoriesPageComponent)
      .provide([...MOCK_REPOSITORIES_PROVIDERS])
      .mock(TerritoryStatisticsBO, {
        getTerritoryStatistics: jest.fn().mockReturnValue(of(MOCK_TERRITORY_STATISTICS))
      })
  );

  it('should create', () => {
    const component = MockRender(StatisticsTerritoriesPageComponent);

    expect(component.point.componentInstance).toBeTruthy();
  });
});
