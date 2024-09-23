import { SignInPageComponent } from './sign-in-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { AuthModule } from '../../auth.module';
import { RepositoriesModule } from '../../../../../repositories/repositories.module';

describe('SignInPageComponent', () => {
  beforeEach(() => MockBuilder(SignInPageComponent, [AuthModule, RepositoriesModule]));

  it('should create', () => {
    const fixture = MockRender(SignInPageComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
