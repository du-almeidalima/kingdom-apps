import { MockBuilder, MockRender } from 'ng-mocks';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  beforeEach(() => {
    return MockBuilder(ButtonComponent);
  });

  it('should create', () => {
    const component = MockRender(ButtonComponent);
    expect(component.point.componentInstance).toBeTruthy();
  });
});
