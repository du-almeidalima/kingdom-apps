import { ProfileComponent } from './profile.component';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { UserStateService } from '../../../../state/user.state.service';
import { AuthService } from '../../../../core/features/auth/services/auth.service';
import { Dialog } from '@angular/cdk/dialog';
import { userMockBuilder } from '../../../../../test/mocks';
import { RoleEnum } from '../../../../../models/enums/role';

describe('ProfileComponent', () => {
  beforeEach(() => MockBuilder(ProfileComponent).mock(UserStateService).mock(AuthService).mock(Dialog));

  it('should create', () => {
    const fixture = MockRender(ProfileComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });

  it.each([
    [RoleEnum.PUBLISHER, 'Publicador'],
    [RoleEnum.ADMIN, 'Admin'],
    [RoleEnum.ELDER, 'Ancião'],
    [RoleEnum.ORGANIZER, 'Organizador'],
    [RoleEnum.APP_ADMIN, 'App Admin.'],
    [RoleEnum.SUPERINTENDENT, 'Superintendente'],
  ])(
    'role %s should be %s',
    (role, description) => {
      const roleUser = userMockBuilder({ role });
      const userStateService = ngMocks.get(UserStateService);
      userStateService.setUser(roleUser);

      ngMocks.flushTestBed();

      MockRender(ProfileComponent);
      const roleBadge = ngMocks.find('.user-card__privilege-badge')

      expect(roleBadge.nativeElement.textContent).toBe(description);
    })
});
