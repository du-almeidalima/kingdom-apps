import { HistoryDialogComponent } from './history-dialog.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { DialogRef } from '@angular/cdk/dialog';

describe('WorkItemHistoryDialogComponent', () => {
  beforeEach(() =>
    MockBuilder(HistoryDialogComponent).provide({
      provide: DialogRef,
      useValue: {},
    })
  );

  it('should create', () => {
    const fixture = MockRender(HistoryDialogComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
