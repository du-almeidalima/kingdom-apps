import {
  TerritoryMoveAlertDialogComponent,
  TerritoryMoveAlertDialogData,
} from './territory-move-alert-dialog.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TerritoryAlertsBO } from '../../bo/territory-alerts/territory-alerts.bo';
import { TerritoryBO } from '../../bo/territory/territory.bo';
import { TerritoryStatisticsBO } from '../../bo/territory-statistics/territory-statistics.bo';
import { EMPTY } from 'rxjs';

describe('TerritoryMoveAlertDialogComponent', () => {
  beforeEach(() =>
    MockBuilder(TerritoryMoveAlertDialogComponent, [TerritoryAlertsBO, TerritoryBO, TerritoryStatisticsBO]).provide({
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
      }),
  );

  it('should create', () => {
    const fixture = MockRender(TerritoryMoveAlertDialogComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
