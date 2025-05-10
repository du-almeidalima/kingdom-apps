import { MockBuilder, MockRender } from 'ng-mocks';
import { SelectComponent } from './select.component';

describe('SelectComponent', () => {
  beforeEach(() => {
    return MockBuilder(SelectComponent);
  });

  it('should create', () => {
    const component = MockRender(SelectComponent);
    expect(component.point.componentInstance).toBeTruthy();
  });
});
