import { HearingWorkPageComponent } from './hearing-work-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { UserStateService } from '../../../../state/user.state.service';

describe('HearingWorkPageComponent', () => {
  beforeEach(() => MockBuilder(HearingWorkPageComponent).mock(UserStateService));

  it('should create', () => {
    const fixture = MockRender(HearingWorkPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});

