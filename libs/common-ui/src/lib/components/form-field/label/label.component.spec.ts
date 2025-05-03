import { MockBuilder, MockRender } from 'ng-mocks';

import { LabelComponent } from './label.component';

describe('LabelComponent', () => {
  let component: LabelComponent;

  beforeEach(() => {
    return MockBuilder(LabelComponent);
  });

  it('should create', () => {
    const fixture = MockRender(LabelComponent);
    component = fixture.point.componentInstance;
    expect(component).toBeTruthy();
  });
});
