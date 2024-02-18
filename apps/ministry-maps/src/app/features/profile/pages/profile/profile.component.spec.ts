import { ProfileComponent } from './profile.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { UserStateService } from '../../../../state/user.state.service';
import { AuthService } from '../../../../core/features/auth/services/auth.service';
import { Dialog } from '@angular/cdk/dialog';

describe('ProfileComponent', () => {
  beforeEach(() => MockBuilder(ProfileComponent).mock(UserStateService).mock(AuthService).mock(Dialog));

  it('should create', () => {
    const fixture = MockRender(ProfileComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
