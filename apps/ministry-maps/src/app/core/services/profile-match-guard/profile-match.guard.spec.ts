import { TestBed } from '@angular/core/testing';

import { profileMatchGuard } from './profile-match.guard';
import { MockProvider } from 'ng-mocks';
import { UserStateService } from '../../../state/user.state.service';
import { organizerUserStateServiceMock } from '../../../../test/mocks';
import { RouterTestingModule } from '@angular/router/testing';
import { Route } from '@angular/router';

describe('ProfileMatchGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RouterTestingModule, MockProvider(UserStateService, organizerUserStateServiceMock)],
    });
  });

  it('should return true when the congregation profile matches', () => {
    const route: Route = {
      data: { profiles: ['sign-language'] },
    };

    const result = TestBed.runInInjectionContext(() => profileMatchGuard(route, []));

    expect(result).toBeTruthy();
  });

  it(`should return false when the congregation profile doesn't matches`, () => {
    // The organizerUserStateServiceMock uses a congregation with sign-language profile
    const route: Route = {
      data: { profiles: ['hearing'] },
    };

    const result = TestBed.runInInjectionContext(() => profileMatchGuard(route, []));

    expect(result).toBeFalsy();
  });
});
