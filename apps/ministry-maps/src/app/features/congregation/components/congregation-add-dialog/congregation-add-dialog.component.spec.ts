import { DialogRef } from '@angular/cdk/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { of } from 'rxjs';
import {
  ButtonComponent,
  ChipComponent,
  ChipListComponent,
  DialogCloseDirective,
  DialogComponent,
  DialogFooterComponent,
  DividerComponent,
  FormFieldComponent,
  InputComponent,
  LabelComponent,
  OnlyNumbersDirective,
  SpinnerComponent,
  ToasterService,
} from '@kingdom-apps/common-ui';

import { CongregationAddDialogComponent } from './congregation-add-dialog.component';
import { CongregationBO } from '../../bo/congregation/congregation.bo';
import { environment } from '../../../../../environments/environment';
import { Congregation } from '../../../../../models/congregation';

describe('CongregationAddDialogComponent', () => {
  let createCongregationSpy: jest.Mock;
  let closeSpy: jest.Mock;
  const toasterMock = { success: jest.fn(), error: jest.fn() };

  beforeEach(() => {
    createCongregationSpy = jest.fn();
    closeSpy = jest.fn();
    toasterMock.success.mockReset();
    toasterMock.error.mockReset();

    return MockBuilder(CongregationAddDialogComponent)
      .keep(ReactiveFormsModule)
      .keep(DialogComponent)
      .keep(DialogFooterComponent)
      .keep(FormFieldComponent)
      .keep(InputComponent)
      .keep(LabelComponent)
      .keep(ButtonComponent)
      .keep(DialogCloseDirective)
      .keep(DividerComponent)
      .keep(ChipComponent)
      .keep(ChipListComponent)
      .keep(OnlyNumbersDirective)
      .keep(SpinnerComponent)
      .provide({ provide: CongregationBO, useValue: { createCongregation: createCongregationSpy } })
      .provide({ provide: DialogRef, useValue: { close: closeSpy, disableClose: false } })
      .provide({ provide: ToasterService, useValue: toasterMock });
  });

  it('pre-fills default settings and disables submit until name, location, and at least one city are provided', () => {
    const fixture = MockRender(CongregationAddDialogComponent);

    const expiryInput = ngMocks.find(fixture, '[data-testid="add-congregation-expiry-days-input"]')
      .nativeElement as HTMLInputElement;
    const blockCheckbox = ngMocks.find(fixture, '[data-testid="add-congregation-block-expired-checkbox"]')
      .nativeElement as HTMLInputElement;
    const submitBtn = ngMocks.find(fixture, '[data-testid="add-congregation-submit"]')
      .nativeElement as HTMLButtonElement;

    expect(Number(expiryInput.value)).toBe(environment.congregationSettingsDefaultValues.designationAccessExpiryDays);
    expect(blockCheckbox.checked).toBe(
      environment.congregationSettingsDefaultValues.shouldDesignationBlockAfterExpired,
    );
    expect(submitBtn.disabled).toBe(true);
    expect(ngMocks.find(fixture, '[data-testid="divider"]')).toBeTruthy();
  });

  it('adds unique cities as chips via Enter or button, ignores empty/duplicate cities, allows chip removal, and submits', () => {
    const created: Congregation = {
      id: 'new-cong-1',
      name: 'Congregação Leste',
      locatedOn: 'São Paulo, SP',
      cities: ['São Paulo', 'Guarulhos'],
      settings: {
        designationAccessExpiryDays: 60,
        shouldDesignationBlockAfterExpired: true,
      },
    };
    createCongregationSpy.mockReturnValue(of(created));

    const fixture = MockRender(CongregationAddDialogComponent);
    const comp = fixture.point.componentInstance;

    comp.form.controls.name.setValue('Congregação Leste');
    comp.form.controls.locatedOn.setValue('São Paulo, SP');
    comp.form.controls.designationAccessExpiryDays.setValue(60);
    comp.form.controls.shouldDesignationBlockAfterExpired.setValue(true);

    const cityInput = ngMocks.find(fixture, '[data-testid="add-congregation-city-input"]');

    // Add via Enter key without submitting the form
    cityInput.nativeElement.value = '  São Paulo  ';
    ngMocks.trigger(cityInput, 'input', { target: cityInput.nativeElement } as unknown as Event);
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    cityInput.triggerEventHandler('keydown.enter', enterEvent);
    fixture.detectChanges();

    expect(createCongregationSpy).not.toHaveBeenCalled();
    expect(comp.cities()).toEqual(['São Paulo']);

    // Duplicate (case-insensitive) and empty are ignored
    cityInput.nativeElement.value = 'são paulo';
    ngMocks.trigger(cityInput, 'input', { target: cityInput.nativeElement } as unknown as Event);
    ngMocks.click(ngMocks.find(fixture, '[data-testid="add-congregation-add-city-btn"]'));

    cityInput.nativeElement.value = '   ';
    ngMocks.trigger(cityInput, 'input', { target: cityInput.nativeElement } as unknown as Event);
    ngMocks.click(ngMocks.find(fixture, '[data-testid="add-congregation-add-city-btn"]'));
    expect(comp.cities()).toEqual(['São Paulo']);

    // Add two more cities and remove one via chip remove button
    cityInput.nativeElement.value = 'Temp City';
    ngMocks.trigger(cityInput, 'input', { target: cityInput.nativeElement } as unknown as Event);
    ngMocks.click(ngMocks.find(fixture, '[data-testid="add-congregation-add-city-btn"]'));

    cityInput.nativeElement.value = 'Guarulhos';
    ngMocks.trigger(cityInput, 'input', { target: cityInput.nativeElement } as unknown as Event);
    ngMocks.click(ngMocks.find(fixture, '[data-testid="add-congregation-add-city-btn"]'));
    fixture.detectChanges();

    expect(comp.cities()).toEqual(['São Paulo', 'Temp City', 'Guarulhos']);

    const removeButtons = ngMocks.findAll(fixture, '[data-testid="chip-remove"]');
    ngMocks.click(removeButtons[1]);
    fixture.detectChanges();

    expect(comp.cities()).toEqual(['São Paulo', 'Guarulhos']);

    // Submit form
    const form = ngMocks.find(fixture, '#add-congregation-form');
    ngMocks.trigger(form, 'ngSubmit');
    fixture.detectChanges();

    expect(createCongregationSpy).toHaveBeenCalledWith({
      name: 'Congregação Leste',
      locatedOn: 'São Paulo, SP',
      cities: ['São Paulo', 'Guarulhos'],
      settings: {
        designationAccessExpiryDays: 60,
        shouldDesignationBlockAfterExpired: true,
      },
    });
    expect(closeSpy).toHaveBeenCalledWith(created);
  });
});
