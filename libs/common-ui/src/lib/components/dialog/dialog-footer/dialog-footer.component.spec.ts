import { MockBuilder, MockRender } from 'ng-mocks';
import { DialogFooterComponent } from './dialog-footer.component';

describe('DialogFooterComponent', () => {
  beforeEach(() => MockBuilder(DialogFooterComponent));

  it('should create', () => {
    const component = MockRender(DialogFooterComponent);
    expect(component.point.componentInstance).toBeTruthy();
  });
});
