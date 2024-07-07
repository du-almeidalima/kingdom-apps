import { HearingAssignTerritoriesPageComponent } from './hearing-assign-territories-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { UserStateService } from '../../../../state/user.state.service';

describe('HearingAssignTerritoriesPageComponent', () => {
  beforeEach(() => MockBuilder(HearingAssignTerritoriesPageComponent).mock(UserStateService));

  it('should create', () => {
    const fixture = MockRender(HearingAssignTerritoriesPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
