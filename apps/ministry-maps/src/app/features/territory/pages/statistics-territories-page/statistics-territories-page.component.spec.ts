import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatisticsTerritoriesPageComponent } from './statistics-territories-page.component';

describe('StatisticsTerritoriesPageComponent', () => {
  let component: StatisticsTerritoriesPageComponent;
  let fixture: ComponentFixture<StatisticsTerritoriesPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StatisticsTerritoriesPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatisticsTerritoriesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
