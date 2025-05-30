import { ChangeCongregationComponent } from './change-congregation.component';
import { MockBuilder, MockProvider, MockRender, ngMocks } from 'ng-mocks';
import { UserStateService } from '../../../state/user.state.service';
import { organizerUserStateServiceMock } from '../../../../test/mocks';
import { ProfileBO } from '../bo/profile.bo';
import { of } from 'rxjs';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../test/mocks/providers/mock-repositories-providers';

describe('ChangeCongregationComponent', () => {
  beforeEach(() => {
    return MockBuilder(ChangeCongregationComponent)
      .provide(MockProvider(UserStateService, organizerUserStateServiceMock))
      .provide(MOCK_REPOSITORIES_PROVIDERS);
  });

  it('should create', () => {
    const fixture = MockRender(ChangeCongregationComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });

  it('should show current user congregation', () => {
    MockRender(ChangeCongregationComponent);
    const user = ngMocks.get(UserStateService);
    const select = ngMocks.find('select');

    expect((select.nativeElement as HTMLSelectElement).value).toBe(user.currentUser?.congregation?.name);
  });

  it('should call ProfileBO to update user congregation', () => {
    MockRender(ChangeCongregationComponent);
    const user = ngMocks.get(UserStateService);
    const select = ngMocks.find('select');
    const profileBo = ngMocks.get(ProfileBO);
    profileBo.changeUserCongregation = jest.fn().mockReturnValue(of(organizerUserStateServiceMock));

    // simulating change
    ngMocks.change(select, select.nativeElement.options[1].value);

    expect((select.nativeElement as HTMLSelectElement).value).toBe(select.nativeElement.options[1].value);
    expect(profileBo.changeUserCongregation).toHaveBeenCalledWith(
      user.currentUser?.id,
      select.nativeElement.options[1].value
    );
  });
});
