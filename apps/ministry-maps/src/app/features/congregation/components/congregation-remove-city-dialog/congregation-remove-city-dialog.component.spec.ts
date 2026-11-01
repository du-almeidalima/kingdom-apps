import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { FormsModule } from '@angular/forms';
import {
  ButtonComponent,
  DialogCloseDirective,
  DialogComponent,
  DialogFooterComponent,
  FormFieldComponent,
  LabelComponent,
  RadioGroupComponent,
  SelectComponent,
} from '@kingdom-apps/common-ui';

import {
  CongregationRemoveCityDialogComponent,
  CongregationRemoveCityDialogData,
} from './congregation-remove-city-dialog.component';

describe('CongregationRemoveCityDialogComponent', () => {
  const closeSpy = jest.fn();

  beforeEach(() => {
    closeSpy.mockReset();
    return MockBuilder(CongregationRemoveCityDialogComponent).keep(FormsModule).keep(RadioGroupComponent).keep(
      SelectComponent,
    ).keep(FormFieldComponent).keep(LabelComponent).keep(DialogComponent).keep(DialogFooterComponent).keep(
      ButtonComponent,
    ).keep(DialogCloseDirective);
  });

  const renderWithData = (data: CongregationRemoveCityDialogData) =>
    MockRender(
      CongregationRemoveCityDialogComponent,
      {},
      {
        providers: [
          { provide: DIALOG_DATA, useValue: data },
          { provide: DialogRef, useValue: { close: closeSpy } },
        ],
      },
    );

  it('defaults to transfer and populates remaining cities when other cities exist', () => {
    const fixture = renderWithData({
      cityName: 'São Paulo',
      remainingCities: ['Osasco', 'Barueri'],
    });

    expect(fixture.nativeElement.textContent).toContain('São Paulo');
    expect(fixture.nativeElement.textContent).toContain('não poderá ser desfeita');

    const selectEl = ngMocks.find(fixture, '[data-testid="remove-city-target-select"]')
      .nativeElement as HTMLSelectElement;
    expect(selectEl.disabled).toBe(false);
    expect(Array.from(selectEl.options).map((o) => o.value)).toEqual(['Osasco', 'Barueri']);

    ngMocks.click(ngMocks.find(fixture, '[data-testid="remove-city-confirm"]'));

    expect(closeSpy).toHaveBeenCalledWith({
      action: 'transfer',
      targetCity: 'Osasco',
    });
  });

  it('emits delete resolution when the user selects Excluir territórios', () => {
    const fixture = renderWithData({
      cityName: 'São Paulo',
      remainingCities: ['Osasco'],
    });

    const deleteRadio = ngMocks.find(fixture, '[data-testid="remove-city-option-delete"] input[type="radio"]');
    ngMocks.trigger(deleteRadio, 'change');
    fixture.detectChanges();

    ngMocks.click(ngMocks.find(fixture, '[data-testid="remove-city-confirm"]'));

    expect(closeSpy).toHaveBeenCalledWith({
      action: 'delete',
    });
  });

  it('disables the transfer option and defaults to delete when the congregation has no other cities', () => {
    const fixture = renderWithData({
      cityName: 'São Paulo',
      remainingCities: [],
    });

    const transferRadio = ngMocks.find(fixture, '[data-testid="remove-city-option-transfer"] input[type="radio"]')
      .nativeElement as HTMLInputElement;
    expect(transferRadio.disabled).toBe(true);

    const selectEl = ngMocks.find(fixture, '[data-testid="remove-city-target-select"]')
      .nativeElement as HTMLSelectElement;
    expect(selectEl.disabled).toBe(true);

    ngMocks.click(ngMocks.find(fixture, '[data-testid="remove-city-confirm"]'));

    expect(closeSpy).toHaveBeenCalledWith({
      action: 'delete',
    });
  });
});
