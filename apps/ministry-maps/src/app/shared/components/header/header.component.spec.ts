import { HeaderComponent } from './header.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { SharedModule } from '../../shared.module';

describe('HeaderComponent', () => {
  beforeEach(() => MockBuilder(HeaderComponent, [SharedModule]));

  it('should create the app', () => {
    const fixture = MockRender(HeaderComponent);
    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
