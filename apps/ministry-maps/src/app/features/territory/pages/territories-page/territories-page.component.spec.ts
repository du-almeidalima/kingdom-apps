import { TerritoriesPageComponent } from './territories-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { TerritoryModule } from '../../territory.module';
import { RepositoriesModule } from '../../../../repositories/repositories-providers';

describe('TerritoriesPageComponent', () => {
  beforeEach(() => MockBuilder(TerritoriesPageComponent, [TerritoryModule, RepositoriesModule]));

  it('should create', () => {
    const fixture = MockRender(TerritoriesPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
