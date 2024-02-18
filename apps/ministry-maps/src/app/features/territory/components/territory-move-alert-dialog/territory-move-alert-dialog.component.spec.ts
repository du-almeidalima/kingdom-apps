import {
  TerritoryMoveAlertDialogComponent,
  TerritoryMoveAlertDialogData,
} from './territory-move-alert-dialog.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { TerritoryModule } from '../../territory.module';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { EMPTY } from 'rxjs';

describe('TerritoryMoveAlertDialogComponent', () => {
  beforeEach(() =>
    MockBuilder(TerritoryMoveAlertDialogComponent, TerritoryModule)
      .provide({
        provide: DialogRef,
        useValue: {},
      })
      .provide({
        provide: DIALOG_DATA,
        useValue: {
          history: [],
          markAsResolvedCallback: () => {
            return EMPTY;
          },
        } as TerritoryMoveAlertDialogData,
      })
  );

  it('should create', () => {
    const fixture = MockRender(TerritoryMoveAlertDialogComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
