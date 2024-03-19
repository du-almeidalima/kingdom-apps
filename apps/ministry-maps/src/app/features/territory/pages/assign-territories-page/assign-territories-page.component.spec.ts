import { AssignTerritoriesPageComponent } from './assign-territories-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { TerritoryModule } from '../../territory.module';
import { RepositoryModule } from '../../../../repositories/repository.module';

describe('AssignTerritoriesPageComponent', () => {
  beforeEach(() => MockBuilder(AssignTerritoriesPageComponent, [TerritoryModule, RepositoryModule]));

  it('should create', () => {
    const fixture = MockRender(AssignTerritoriesPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
