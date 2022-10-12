import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TerritoryManageDialogComponent } from './territory-manage-dialog.component';

describe('TerritoryManageDialogComponent', () => {
  let component: TerritoryManageDialogComponent;
  let fixture: ComponentFixture<TerritoryManageDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TerritoryManageDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TerritoryManageDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
