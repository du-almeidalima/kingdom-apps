import { MockBuilder, MockRender } from 'ng-mocks';
import { FormFieldComponent } from './form-field.component';

describe('FormFieldComponent', () => {
  beforeEach(() => {
    return MockBuilder(FormFieldComponent);
  });

  it('should create', () => {
    const component = MockRender(FormFieldComponent);
    expect(component.point.componentInstance).toBeTruthy();
  });
});
