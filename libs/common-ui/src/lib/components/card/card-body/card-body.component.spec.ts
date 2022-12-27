import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardBodyComponent } from './card-body.component';

describe('CardBodyComponent', () => {
  let component: CardBodyComponent;
  let fixture: ComponentFixture<CardBodyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CardBodyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardBodyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
