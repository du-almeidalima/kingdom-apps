import { TerritoryDialogData, TerritoryManageDialogComponent } from './territory-manage-dialog.component';
import { MockBuilder, MockRender } from 'ng-mocks';
import { TerritoryModule } from '../../territory.module';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { territoryMockBuilder } from '../../../../../test/mocks/models/territory.mock';
import { congregationMock } from '../../../../../test/mocks';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';

describe('TerritoryManageDialogComponent', () => {
  beforeEach(() =>
    MockBuilder(TerritoryManageDialogComponent, [TerritoryModule])
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
      })
  );

  it('should create', () => {
    const fixture = MockRender(TerritoryManageDialogComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });
});
