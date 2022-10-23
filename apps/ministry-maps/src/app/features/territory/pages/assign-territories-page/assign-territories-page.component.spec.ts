import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignTerritoriesPageComponent } from './assign-territories-page.component';

describe('AssignTerritoriesPageComponent', () => {
  let component: AssignTerritoriesPageComponent;
  let fixture: ComponentFixture<AssignTerritoriesPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AssignTerritoriesPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignTerritoriesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
