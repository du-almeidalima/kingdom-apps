import { MockBuilder, MockRender } from 'ng-mocks';
import { SpinnerComponent } from './spinner.component';

describe('SpinnerComponent', () => {
  beforeEach(() => {
    return MockBuilder(SpinnerComponent);
  });

  it('should create', () => {
    const component = MockRender(SpinnerComponent);
    expect(component.point.componentInstance).toBeTruthy();
  });
});
