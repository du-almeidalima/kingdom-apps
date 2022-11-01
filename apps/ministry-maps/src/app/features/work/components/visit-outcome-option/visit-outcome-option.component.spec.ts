import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisitOutcomeOptionComponent } from './visit-outcome-option.component';

describe('VisitOutcomeOptionComponent', () => {
  let component: VisitOutcomeOptionComponent;
  let fixture: ComponentFixture<VisitOutcomeOptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VisitOutcomeOptionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VisitOutcomeOptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
