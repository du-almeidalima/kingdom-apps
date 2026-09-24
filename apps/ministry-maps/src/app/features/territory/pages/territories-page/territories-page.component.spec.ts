import { TerritoriesPageComponent } from './territories-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { TerritoryAlertsBO } from '../../bo/territory-alerts/territory-alerts.bo';
import { TerritoryBO } from '../../bo/territory/territory.bo';
import { TerritoryStatisticsBO } from '../../bo/territory-statistics/territory-statistics.bo';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';

describe('TerritoriesPageComponent', () => {
  beforeEach(() =>
    MockBuilder(TerritoriesPageComponent, [TerritoryAlertsBO, TerritoryBO, TerritoryStatisticsBO]).provide(
      MOCK_REPOSITORIES_PROVIDERS,
    ),
  );

  it('should create', () => {
    const fixture = MockRender(TerritoriesPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
