import { TerritoryDeleteDialogComponent } from './territory-delete-dialog.component';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { DialogRef } from '@angular/cdk/dialog';
import { TerritoryModule } from '../../territory.module';

describe('TerritoryDeleteDialogComponent', () => {
  beforeEach(() =>
    MockBuilder(TerritoryDeleteDialogComponent, [TerritoryModule]).provide({
      provide: DialogRef,
      useValue: { close: jest.fn() },
    })
  );

  it('should create', () => {
    const fixture = MockRender(TerritoryDeleteDialogComponent);

    expect(fixture.point.componentInstance).toBeTruthy();
  });

  it.each([true, false])('it should return close returning %s', outcome => {
    const fixture = MockRender(TerritoryDeleteDialogComponent);
    const dialogRef = ngMocks.get(DialogRef);

    const btn = outcome
      ? ngMocks.find(fixture, '#territory-delete-dialog-confirm-btn')
      : ngMocks.find(fixture, '#territory-delete-dialog-cancel-btn');

    ngMocks.click(btn);

    expect(dialogRef.close).toHaveBeenCalledWith(outcome);
  });
});
