import { HeaderComponent } from './header.component';
import { MockBuilder, MockProvider, MockRender, ngMocks } from 'ng-mocks';
import { UserStateService } from '../../../state/user.state.service';
import { organizerUserStateServiceMock } from '../../../../test/mocks';
import { CommonComponentsModule } from '@kingdom-apps/common-ui';

describe('HeaderComponent', () => {
  beforeEach(() => {
    return MockBuilder(HeaderComponent, CommonComponentsModule).provide(
      MockProvider(UserStateService, organizerUserStateServiceMock)
    );
  });

  it('should create', () => {
    const fixture = MockRender(HeaderComponent);
    expect(fixture.point.componentInstance).toBeTruthy();
  });

  it('should display profile link/button', () => {
    const fixture = MockRender(HeaderComponent);
    const profileLinkButton = ngMocks.find(fixture, '#profile-link');

    expect(fixture.point.componentInstance.userStateService.isLoggedIn).toBeTruthy();
    expect(profileLinkButton).toBeTruthy();
  });

  it('should not display profile link/button if user is not logged in', () => {
    const userService = ngMocks.get(UserStateService);
    userService.setUser(null);
    ngMocks.flushTestBed();

    const fixture = MockRender(HeaderComponent);
    const profileLinkButton = fixture.nativeElement.querySelector('#profile-link');

    expect(fixture.point.componentInstance.userStateService.isLoggedIn).toBeFalsy();
    expect(profileLinkButton).toBeFalsy();
  });
});
