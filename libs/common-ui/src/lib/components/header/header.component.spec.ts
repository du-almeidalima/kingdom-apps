import { HeaderComponent } from './header.component';
import { MockBuilder, MockRender } from 'ng-mocks';

describe('HeaderComponent', () => {
  beforeEach(() => MockBuilder(HeaderComponent));

  it('should create', () => {
    const fixture = MockRender(HeaderComponent);
    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
