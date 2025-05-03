import { AssignTerritoriesPageComponent } from './assign-territories-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { TerritoryModule } from '../../territory.module';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';

describe('AssignTerritoriesPageComponent', () => {
  beforeEach(() => MockBuilder(AssignTerritoriesPageComponent, [TerritoryModule]).provide(MOCK_REPOSITORIES_PROVIDERS));

  it('should create', () => {
    const fixture = MockRender(AssignTerritoriesPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
