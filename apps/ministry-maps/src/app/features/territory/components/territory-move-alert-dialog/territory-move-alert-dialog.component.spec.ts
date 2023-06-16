import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TerritoryMoveAlertDialogComponent } from './territory-move-alert-dialog.component';

describe('TerritoryMoveAlertDialogComponent', () => {
  let component: TerritoryMoveAlertDialogComponent;
  let fixture: ComponentFixture<TerritoryMoveAlertDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TerritoryMoveAlertDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TerritoryMoveAlertDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
