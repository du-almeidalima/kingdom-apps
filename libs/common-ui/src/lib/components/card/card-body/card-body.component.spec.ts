import { MockBuilder, MockRender } from 'ng-mocks';

import { CardBodyComponent } from './card-body.component';

describe('CardBodyComponent', () => {
  beforeEach(() => {
    return MockBuilder(CardBodyComponent);
  });

  it('should create', () => {
    const component = MockRender(CardBodyComponent);
    expect(component.point.componentInstance).toBeTruthy();
  });
});
