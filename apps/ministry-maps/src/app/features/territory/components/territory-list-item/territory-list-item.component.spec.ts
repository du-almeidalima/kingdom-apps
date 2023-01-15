import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TerritoryListItemComponent } from './territory-list-item.component';

describe('TerritoryListItemComponent', () => {
  let component: TerritoryListItemComponent;
  let fixture: ComponentFixture<TerritoryListItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TerritoryListItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TerritoryListItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
