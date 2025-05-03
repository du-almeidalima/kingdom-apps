import { MockBuilder, MockRender } from 'ng-mocks';

import { DialogComponent } from './dialog.component';
import { DialogRef } from '@angular/cdk/dialog';

describe('DialogComponent', () => {
  beforeEach(() => {
    return MockBuilder(DialogComponent).mock(DialogRef);
  });

  it('should create', () => {
    const component = MockRender(DialogComponent);
    expect(component.point.componentInstance).toBeTruthy();
  });
});
