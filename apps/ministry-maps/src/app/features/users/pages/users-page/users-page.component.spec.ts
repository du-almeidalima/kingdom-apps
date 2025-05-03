import { MockBuilder, MockRender } from 'ng-mocks';
import { UsersPageComponent } from './users-page.component';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';

describe('UsersPageComponent', () => {
  beforeEach(() => MockBuilder(UsersPageComponent).provide(MOCK_REPOSITORIES_PROVIDERS));

  it('should create', () => {
    const fixture = MockRender(UsersPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
