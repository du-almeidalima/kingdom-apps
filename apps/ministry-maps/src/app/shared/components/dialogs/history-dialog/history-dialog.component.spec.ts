import { HistoryDialogComponent } from './history-dialog.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

describe('WorkItemHistoryDialogComponent', () => {
  beforeEach(() =>
    MockBuilder(HistoryDialogComponent).provide([
      {
        provide: DialogRef,
        useValue: {},
      },
      {
        provide: DIALOG_DATA,
        useValue: [],
      },
    ]),
  );

  it('should create', () => {
    const fixture = MockRender(HistoryDialogComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
