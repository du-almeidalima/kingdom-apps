import { TerritoryGenericAlertDialogComponent } from './territory-generic-alert-dialog.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { TerritoryModule } from '../../territory.module';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { EMPTY } from 'rxjs';
import { TerritoryMoveAlertDialogComponent } from '../territory-move-alert-dialog/territory-move-alert-dialog.component';

describe('TerritoryGenericAlertDialogComponent', () => {
  beforeEach(() =>
    MockBuilder(TerritoryGenericAlertDialogComponent, TerritoryModule)
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
        },
      })
  );

  it('should create', () => {
    const fixture = MockRender(TerritoryMoveAlertDialogComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
