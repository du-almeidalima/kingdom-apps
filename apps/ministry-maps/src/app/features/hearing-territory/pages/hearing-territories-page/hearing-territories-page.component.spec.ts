import { HearingTerritoriesPageComponent } from './hearing-territories-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { UserStateService } from '../../../../state/user.state.service';

describe('HearingTerritoriesPageComponent', () => {
  beforeEach(() => MockBuilder(HearingTerritoriesPageComponent).mock(UserStateService));

  it('should create', () => {
    const fixture = MockRender(HearingTerritoriesPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
