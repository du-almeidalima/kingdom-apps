import { MockBuilder, MockRender } from 'ng-mocks';

import { TerritoryStatisticsStaticSectionComponent } from './territory-statistics-static-section.component';
import { TerritoryStatisticsBO } from '../../bo/territory-statistics.bo';
import { mockTerritories } from '../../bo/territory-statistics.bo.spec';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';

describe('TerritoryStatisticsStaticSectionComponent', () => {
  beforeEach(() => {
    return MockBuilder(TerritoryStatisticsStaticSectionComponent)
      .provide([...MOCK_REPOSITORIES_PROVIDERS])
      .provide(TerritoryStatisticsBO);
  });

  it('should create', () => {
    const component = MockRender(TerritoryStatisticsStaticSectionComponent, { territories: mockTerritories });

    expect(component.point.componentInstance).toBeTruthy();
  });
});
