import { WelcomePageComponent } from './welcome-page.component';
import { MockBuilder, MockRender } from 'ng-mocks';

describe('WelcomePageComponent', () => {
  beforeEach(() => MockBuilder(WelcomePageComponent));

  it('should create', () => {
    const component = MockRender(WelcomePageComponent);

    expect(component.point.componentInstance).toBeTruthy();
  });
});
