import { AssignTerritoriesPageComponent } from './assign-territories-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { TerritoryModule } from '../../territory.module';
import { RepositoriesModule } from '../../../../repositories/repositories.module';

describe('AssignTerritoriesPageComponent', () => {
  beforeEach(() => MockBuilder(AssignTerritoriesPageComponent, [TerritoryModule, RepositoriesModule]));

  it('should create', () => {
    const fixture = MockRender(AssignTerritoriesPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
