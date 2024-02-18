import { WorkItemCompleteDialogComponent, WorkItemCompleteDialogData } from './work-item-complete-dialog.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { WorkModule } from '../../work.module';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

describe('WorkItemCompleteDialogComponent', () => {
  beforeEach(() =>
    MockBuilder(WorkItemCompleteDialogComponent, WorkModule)
      .provide({
        provide: DialogRef,
        useValue: {},
      })
      .provide({
        provide: DIALOG_DATA,
        useValue: {} as WorkItemCompleteDialogData,
      })
  );

  it('should create', () => {
    const fixture = MockRender(WorkItemCompleteDialogComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
