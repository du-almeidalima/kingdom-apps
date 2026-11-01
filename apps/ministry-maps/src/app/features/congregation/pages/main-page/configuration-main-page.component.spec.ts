import { ConfigurationMainPageComponent } from './configuration-main-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { UserStateService } from '../../../../state/user.state.service';
import { Dialog } from '@angular/cdk/dialog';

describe('ConfigurationComponent', () => {
  beforeEach(() => MockBuilder(ConfigurationMainPageComponent).mock(UserStateService).mock(Dialog));

  it('should create', () => {
    const fixture = MockRender(ConfigurationMainPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
