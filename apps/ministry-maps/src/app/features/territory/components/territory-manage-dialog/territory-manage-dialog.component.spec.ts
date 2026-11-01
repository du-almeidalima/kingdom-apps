import { TerritoryDialogData, TerritoryManageDialogComponent } from './territory-manage-dialog.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { of } from 'rxjs';
import { TerritoryAlertsBO } from '../../bo/territory-alerts/territory-alerts.bo';
import { TerritoryBO } from '../../bo/territory/territory.bo';
import { TerritoryStatisticsBO } from '../../bo/territory-statistics/territory-statistics.bo';
import { territoryMockBuilder } from '../../../../../test/mocks/models/territory.mock';
import { congregationMock } from '../../../../../test/mocks';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';

describe('TerritoryManageDialogComponent', () => {
  beforeEach(() =>
    MockBuilder(TerritoryManageDialogComponent, [TerritoryAlertsBO, TerritoryBO, TerritoryStatisticsBO])
      .provide(MOCK_REPOSITORIES_PROVIDERS)
      .provide({
        provide: DialogRef,
        useValue: {},
      })
      .provide({
        provide: DIALOG_DATA,
        useValue: {
          territory: territoryMockBuilder({}),
          cities: congregationMock.cities,
          congregationId: congregationMock.id,
        } as TerritoryDialogData,
      }),
  );

  it('should create', () => {
    const fixture = MockRender(TerritoryManageDialogComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });

  it('calls territoryBO.updateTerritory when editing a territory', () => {
    const dialogRefMock = { close: jest.fn() };
    const territoryBOMock = { updateTerritory: jest.fn().mockReturnValue(of(undefined)) };

    const fixture = MockRender(
      TerritoryManageDialogComponent,
      {},
      {
        providers: [
          { provide: DialogRef, useValue: dialogRefMock },
          { provide: TerritoryBO, useValue: territoryBOMock },
        ],
      },
    );

    const component = fixture.point.componentInstance;
    component.form.patchValue({
      address: 'Rua das Flores, 123',
    });

    component.handleSubmission();

    expect(territoryBOMock.updateTerritory).toHaveBeenCalledWith(
      expect.objectContaining({
        address: 'Rua das Flores, 123',
      }),
    );
    expect(dialogRefMock.close).toHaveBeenCalled();
  });
});
