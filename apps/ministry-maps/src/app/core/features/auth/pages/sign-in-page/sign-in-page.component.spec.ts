import { SignInPageComponent } from './sign-in-page.component';
import { MockBuilder, MockInstance, MockRender } from 'ng-mocks';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../../test/mocks/providers/mock-repositories-providers';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute } from '@angular/router';

describe('SignInPageComponent', () => {
  beforeEach(() =>
    MockBuilder(SignInPageComponent)
      .mock(AuthService)
      .mock(ActivatedRoute)
      .provide(MOCK_REPOSITORIES_PROVIDERS)
  );

  it('should create', () => {
    // Configure the ActivatedRoute mock
    MockInstance(ActivatedRoute, instance => {
      instance.snapshot = {
        params: {
          inviteId: '1234',
        }
      } as any;
    });

    const fixture = MockRender(SignInPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
