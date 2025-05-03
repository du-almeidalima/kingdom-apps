import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { ConfirmDialogComponent } from './confirm-dialog.component';
import { DialogComponent } from '../dialog/dialog.component';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

const TEST_DATA = {
  title: 'Test Title',
  bodyText: 'Test Body Text',
};

describe('ConfirmDialogComponent', () => {
  beforeEach(() => {
    return MockBuilder(ConfirmDialogComponent).mock(DialogRef).provide({
      provide: DIALOG_DATA,
      useValue: TEST_DATA,
    });
  });

  it('should create', () => {
    const component = MockRender(ConfirmDialogComponent);
    expect(component.point.componentInstance).toBeTruthy();
  });

  it('should display title', () => {
    MockRender(ConfirmDialogComponent);
    const dialogComponent = ngMocks.find(DialogComponent);
    expect(dialogComponent.componentInstance.title).toEqual(TEST_DATA.title);
  });

  it('should display body text', () => {
    const component = MockRender(ConfirmDialogComponent);

    expect(component.nativeElement.textContent).toContain(TEST_DATA.bodyText);
  });
});
