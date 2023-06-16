import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IconRadioComponent } from './icon-radio.component';

describe('IconRadioComponent', () => {
  let component: IconRadioComponent;
  let fixture: ComponentFixture<IconRadioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IconRadioComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IconRadioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
