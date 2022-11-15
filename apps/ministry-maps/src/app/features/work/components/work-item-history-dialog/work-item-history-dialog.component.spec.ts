import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkItemHistoryDialogComponent } from './work-item-history-dialog.component';

describe('WorkItemHistoryDialogComponent', () => {
  let component: WorkItemHistoryDialogComponent;
  let fixture: ComponentFixture<WorkItemHistoryDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WorkItemHistoryDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkItemHistoryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
