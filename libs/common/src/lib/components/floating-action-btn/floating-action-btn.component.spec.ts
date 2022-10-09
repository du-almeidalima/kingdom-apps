import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloatingActionBtnComponent } from './floating-action-btn.component';

describe('FloatingActionBtnComponent', () => {
  let component: FloatingActionBtnComponent;
  let fixture: ComponentFixture<FloatingActionBtnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FloatingActionBtnComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FloatingActionBtnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
