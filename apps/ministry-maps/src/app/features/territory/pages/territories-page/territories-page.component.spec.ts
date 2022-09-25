import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TerritoriesPageComponent } from './territories-page.component';

describe('TerritoriesPageComponent', () => {
  let component: TerritoriesPageComponent;
  let fixture: ComponentFixture<TerritoriesPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TerritoriesPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TerritoriesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
