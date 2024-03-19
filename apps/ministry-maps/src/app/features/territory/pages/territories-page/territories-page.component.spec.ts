import { TerritoriesPageComponent } from './territories-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { TerritoryModule } from '../../territory.module';
import { RepositoryModule } from '../../../../repositories/repository.module';

describe('TerritoriesPageComponent', () => {
  beforeEach(() => MockBuilder(TerritoriesPageComponent, [TerritoryModule, RepositoryModule]));

  it('should create', () => {
    const fixture = MockRender(TerritoriesPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
