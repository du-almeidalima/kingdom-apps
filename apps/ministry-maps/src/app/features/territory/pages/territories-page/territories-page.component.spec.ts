import { TerritoriesPageComponent } from './territories-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { TerritoryModule } from '../../territory.module';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';

describe('TerritoriesPageComponent', () => {
  beforeEach(() => MockBuilder(TerritoriesPageComponent, [TerritoryModule]).provide(MOCK_REPOSITORIES_PROVIDERS));

  it('should create', () => {
    const fixture = MockRender(TerritoriesPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
