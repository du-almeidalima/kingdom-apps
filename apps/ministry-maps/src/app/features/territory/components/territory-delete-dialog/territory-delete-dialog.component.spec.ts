import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TerritoryDeleteDialogComponent } from './territory-delete-dialog.component';

describe('TerritoryDeleteDialogComponent', () => {
  let component: TerritoryDeleteDialogComponent;
  let fixture: ComponentFixture<TerritoryDeleteDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TerritoryDeleteDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TerritoryDeleteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
