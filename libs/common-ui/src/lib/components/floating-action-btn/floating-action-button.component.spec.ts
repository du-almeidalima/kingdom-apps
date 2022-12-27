import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloatingActionButtonComponent } from './floating-action-button.component';

describe('FloatingActionBtnComponent', () => {
  let component: FloatingActionButtonComponent;
  let fixture: ComponentFixture<FloatingActionButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FloatingActionButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FloatingActionButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
