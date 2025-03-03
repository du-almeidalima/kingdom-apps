import { MockBuilder, MockRender } from 'ng-mocks';
import { UsersPageComponent } from './users-page.component';
import { RepositoriesModule } from '../../../../repositories/repositories-providers';

describe('UsersPageComponent', () => {
  beforeEach(() => MockBuilder(UsersPageComponent, [RepositoriesModule]));

  it('should create', () => {
    const fixture = MockRender(UsersPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
