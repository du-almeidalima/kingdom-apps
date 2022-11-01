import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkItemCompleteDialogComponent } from './work-item-complete-dialog.component';

describe('WorkItemCompleteDialogComponent', () => {
  let component: WorkItemCompleteDialogComponent;
  let fixture: ComponentFixture<WorkItemCompleteDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WorkItemCompleteDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkItemCompleteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
