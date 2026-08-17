import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { UsersPageComponent } from './users-page.component';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';
import { SpinnerComponent } from '@kingdom-apps/common-ui';

describe('UsersPageComponent', () => {
  beforeEach(() => MockBuilder(UsersPageComponent).provide(MOCK_REPOSITORIES_PROVIDERS));

  it('should create', () => {
    const fixture = MockRender(UsersPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });

  it('should render spinner when isLoading is true', () => {
    const fixture = MockRender(UsersPageComponent);
    fixture.point.componentInstance.isLoading = true;
    fixture.detectChanges();

    const spinner = ngMocks.find(SpinnerComponent, null);
    const usersList = ngMocks.find('[data-testid="users-list"]', null);

    expect(spinner).toBeTruthy();
    expect(usersList).toBeNull();
  });

  it('should render users list when isLoading is false', () => {
    const fixture = MockRender(UsersPageComponent);
    fixture.point.componentInstance.isLoading = false;
    fixture.detectChanges();

    const spinner = ngMocks.find(SpinnerComponent, null);
    const usersList = ngMocks.find('[data-testid="users-list"]', null);

    expect(spinner).toBeNull();
    expect(usersList).toBeTruthy();
  });
});
