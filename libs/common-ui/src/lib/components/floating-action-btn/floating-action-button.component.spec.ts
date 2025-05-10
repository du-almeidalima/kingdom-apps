import { MockBuilder, MockRender } from 'ng-mocks';

import { FloatingActionButtonComponent } from './floating-action-button.component';

describe('FloatingActionBtnComponent', () => {
  let component: FloatingActionButtonComponent;

  beforeEach(() => MockBuilder(FloatingActionButtonComponent));

  it('should create', () => {
    const fixture = MockRender(FloatingActionButtonComponent);
    component = fixture.point.componentInstance;
    expect(component).toBeTruthy();
  });
});
