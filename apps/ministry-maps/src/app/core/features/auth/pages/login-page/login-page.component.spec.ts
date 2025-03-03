import { LoginPageComponent } from './login-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { AuthModule } from '../../auth.module';
import { RepositoriesModule } from '../../../../../repositories/repositories-providers';

describe('LoginPageComponent', () => {
  beforeEach(() => MockBuilder(LoginPageComponent, [AuthModule, RepositoriesModule]));

  it('should create', () => {
    const fixture = MockRender(LoginPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
