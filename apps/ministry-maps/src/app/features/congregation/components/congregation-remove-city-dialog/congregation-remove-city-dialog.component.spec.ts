import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import {
  ButtonComponent,
  DialogCloseDirective,
  DialogComponent,
  DialogFooterComponent,
  IconComponent,
  NoteComponent,
  SelectComponent,
} from '@kingdom-apps/common-ui';

import {
  CongregationRemoveCityDialogComponent,
  CongregationRemoveCityDialogData,
} from './congregation-remove-city-dialog.component';
import { IconRadioComponent } from '../../../../shared/components/visit-outcome-option/icon-radio.component';

describe('CongregationRemoveCityDialogComponent', () => {
  const closeSpy = jest.fn();

  beforeEach(() => {
    closeSpy.mockReset();
    return MockBuilder(CongregationRemoveCityDialogComponent)
      .keep(SelectComponent)
      .keep(IconComponent)
      .keep(NoteComponent)
      .keep(DialogComponent)
      .keep(DialogFooterComponent)
      .keep(ButtonComponent)
      .keep(DialogCloseDirective)
      .keep(IconRadioComponent)
      .keep(ReactiveFormsModule);
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
      territoryCounts: { 'São Paulo': 2 },
    });

    expect(fixture.nativeElement.textContent).toContain('São Paulo');
    expect(fixture.nativeElement.textContent).toContain('não poderá ser desfeita');
    expect(ngMocks.find(fixture, '[data-testid="remove-city-summary"]').nativeElement.textContent).toContain(
      '2 territórios da cidade São Paulo serão transferidos para Osasco.',
    );
    expect(ngMocks.find(fixture, '[data-testid="remove-city-option-transfer"]').nativeElement.getAttribute('role')).toBe(
      'radio',
    );

    const selectEl = ngMocks.find(fixture, '[data-testid="remove-city-target-select"]')
      .nativeElement as HTMLSelectElement;
    expect(selectEl.disabled).toBe(false);
    expect(Array.from(selectEl.options).map((o) => o.value)).toEqual(['Osasco', 'Barueri']);

    ngMocks.click(ngMocks.find(fixture, '[data-testid="remove-city-confirm"]'));

    expect(closeSpy).toHaveBeenCalledWith({
      action: 'transfer',
      targetCity: 'Osasco',
    });
    expect(ngMocks.find(fixture, '[data-testid="remove-city-confirm"]').nativeElement.textContent).toContain(
      'Transferir territórios',
    );
  });

  it('shows the delete summary and danger button when the user selects Excluir territórios', () => {
    const fixture = renderWithData({
      cityName: 'São Paulo',
      remainingCities: ['Osasco'],
      territoryCounts: { 'São Paulo': 1 },
    });

    ngMocks.click(ngMocks.find(fixture, '[data-testid="remove-city-option-delete"]'));
    fixture.detectChanges();

    expect(ngMocks.find(fixture, '[data-testid="remove-city-summary"]').nativeElement.textContent).toContain(
      '1 território da cidade São Paulo será excluído permanentemente.',
    );
    const confirmButton = ngMocks.find(fixture, '[data-testid="remove-city-confirm"]').nativeElement as HTMLButtonElement;
    expect(confirmButton.className).toContain('button--danger');
    expect(confirmButton.textContent).toContain('Excluir cidade e territórios');
    ngMocks.click(ngMocks.find(fixture, '[data-testid="remove-city-confirm"]'));

    expect(closeSpy).toHaveBeenCalledWith({
      action: 'delete',
    });
  });

  it('disables the transfer option and defaults to delete when the congregation has no other cities', () => {
    const fixture = renderWithData({
      cityName: 'São Paulo',
      remainingCities: [],
      territoryCounts: {},
    });

    const transferOption = ngMocks.find(fixture, '[data-testid="remove-city-option-transfer"]')
      .nativeElement as HTMLElement;
    expect(transferOption.getAttribute('aria-disabled')).toBe('true');
    expect(transferOption.hasAttribute('disabled')).toBe(true);
    expect(ngMocks.find(fixture, '[data-testid="remove-city-option-delete"]').nativeElement.getAttribute('aria-checked')).toBe(
      'true',
    );

    const selectEl = ngMocks.find(fixture, '[data-testid="remove-city-target-select"]')
      .nativeElement as HTMLSelectElement;
    expect(selectEl.disabled).toBe(true);

    ngMocks.click(ngMocks.find(fixture, '[data-testid="remove-city-confirm"]'));

    expect(closeSpy).toHaveBeenCalledWith({
      action: 'delete',
    });
  });
});
