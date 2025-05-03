import { MockBuilder, MockRender } from 'ng-mocks';
import { DialogCloseDirective } from './dialog-close.directive';
import { DialogRef } from '@angular/cdk/dialog';

describe('DialogCloseDirective', () => {
  beforeEach(() => {
    return MockBuilder(DialogCloseDirective).mock(DialogRef);
  });

  it('should create an instance', () => {
    const component = MockRender(DialogCloseDirective);
    expect(component.point.componentInstance).toBeTruthy();
  });
});
