import { MockBuilder, MockRender } from 'ng-mocks';

import { CardHeaderComponent } from './card-header.component';

describe('CardHeaderComponent', () => {
  beforeEach(() => {
    return MockBuilder(CardHeaderComponent);
  });

  it('should create', () => {
    const component = MockRender(CardHeaderComponent);
    expect(component.point.componentInstance).toBeTruthy();
  });
});
