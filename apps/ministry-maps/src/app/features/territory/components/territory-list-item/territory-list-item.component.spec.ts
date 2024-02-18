import { TerritoryListItemComponent } from './territory-list-item.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { TerritoryModule } from '../../territory.module';
import { territoryMockBuilder } from '../../../../../test/mocks/models/territory.mock';

describe('TerritoryListItemComponent', () => {
  beforeEach(() => MockBuilder(TerritoryListItemComponent, TerritoryModule));

  it('should create', () => {
    const fixture = MockRender(TerritoryListItemComponent, {
      territory: territoryMockBuilder({})
    });

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
