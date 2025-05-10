import { LoginPageComponent } from './login-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { Router } from '@angular/router';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../../test/mocks/providers/mock-repositories-providers';

describe('LoginPageComponent', () => {
  beforeEach(() => MockBuilder(LoginPageComponent).provide(MOCK_REPOSITORIES_PROVIDERS).mock(Router));

  it('should create', () => {
    const fixture = MockRender(LoginPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
