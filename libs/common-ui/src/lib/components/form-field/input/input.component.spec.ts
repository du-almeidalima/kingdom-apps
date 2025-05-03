import { MockBuilder, MockRender } from 'ng-mocks';
import { InputComponent } from './input.component';

describe('InputComponent', () => {
  let component: InputComponent;

  beforeEach(() => {
    return MockBuilder(InputComponent);
  });

  beforeEach(() => {
    const fixture = MockRender(InputComponent);
    component = fixture.point.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
