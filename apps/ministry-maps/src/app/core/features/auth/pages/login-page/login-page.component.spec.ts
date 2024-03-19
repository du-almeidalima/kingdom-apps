import { LoginPageComponent } from './login-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { AuthModule } from '../../auth.module';
import { RepositoryModule } from '../../../../../repositories/repository.module';

describe('LoginPageComponent', () => {
  beforeEach(() => MockBuilder(LoginPageComponent, [AuthModule, RepositoryModule]));

  it('should create', () => {
    const fixture = MockRender(LoginPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
