import { TerritoryListItemComponent } from './territory-list-item.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { TerritoryAlertsBO } from '../../bo/territory-alerts/territory-alerts.bo';
import { TerritoryBO } from '../../bo/territory/territory.bo';
import { TerritoryStatisticsBO } from '../../bo/territory-statistics/territory-statistics.bo';
import { territoryMockBuilder } from '../../../../../test/mocks/models/territory.mock';

describe('TerritoryListItemComponent', () => {
  beforeEach(() => MockBuilder(TerritoryListItemComponent, [TerritoryAlertsBO, TerritoryBO, TerritoryStatisticsBO]));

  it('should create', () => {
    const fixture = MockRender(TerritoryListItemComponent, {
      territory: territoryMockBuilder({}),
    });

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
