import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormBuilder } from '@angular/forms';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { SortFilterDialogComponent } from './sort-filter-dialog.component';
import { SortFilterConfig } from '../types/sort-filter.model';

const CONFIG: SortFilterConfig = {
  sortConfigs: {
    initial: 'name',
    options: [
      { value: 'name', label: 'Name' },
      { value: 'date', label: 'Date' },
    ],
  },
  filterConfigs: {
    initial: { city: 'A' },
    options: {
      city: { title: 'Cidade', controlName: 'city', filterType: 'select', options: [] },
      active: { title: 'Ativo', controlName: 'active', filterType: 'toggle' },
      note: { title: 'Nota', controlName: 'note', filterType: 'text' },
    },
  },
};

describe('SortFilterDialogComponent', () => {
  let dialogRefMock: { close: jest.Mock };
  let component: SortFilterDialogComponent;

  const render = (config: SortFilterConfig = CONFIG) => {
    const fixture = MockRender(SortFilterDialogComponent, undefined, {
      providers: [
        { provide: FormBuilder, useValue: new FormBuilder() },
        { provide: DialogRef, useValue: dialogRefMock },
        { provide: DIALOG_DATA, useValue: config },
      ],
    });
    component = fixture.point.componentInstance as SortFilterDialogComponent;
    return fixture;
  };

  beforeEach(() => {
    dialogRefMock = { close: jest.fn() };
    return MockBuilder(SortFilterDialogComponent);
  });

  it('builds a control per filter, using config initial when given', () => {
    render();

    expect(component.form.controls['filters'].get('city')?.value).toBe('A');
  });

  it.each([
    ['toggle filters default to false', 'active', false],
    ['non-toggle filters default to empty string', 'note', ''],
  ])('%s', (_desc, controlName, expected) => {
    const config: SortFilterConfig = {
      filterConfigs: {
        initial: undefined,
        options: {
          active: { title: 'Ativo', controlName: 'active', filterType: 'toggle' },
          note: { title: 'Nota', controlName: 'note', filterType: 'text' },
        },
      },
    };

    render(config);

    expect(component.form.controls['filters'].get(controlName as string)?.value).toBe(expected);
  });

  it('defaults the sort control to empty string when there is no sort config', () => {
    render({ filterConfigs: undefined });

    expect(component.form.controls['sort'].value).toBe('');
  });

  it('renders the filter component matching each filter type', () => {
    const fixture = render();

    expect(ngMocks.find(fixture, 'lib-select-filter', undefined)).toBeTruthy();
    expect(ngMocks.find(fixture, 'lib-toggle-filter', undefined)).toBeTruthy();
    expect(ngMocks.find(fixture, 'lib-text-filter', undefined)).toBeTruthy();
  });

  it('apply closes the dialog with the form value', () => {
    render();

    component.form.controls['filters'].get('city')?.setValue('B');
    component.handleApply();

    expect(dialogRefMock.close).toHaveBeenCalledWith({
      sort: 'name',
      filters: { city: 'B', active: false, note: '' },
    });
  });

  it('cancel closes the dialog without a result', () => {
    render();

    component.handleCancel();

    expect(dialogRefMock.close).toHaveBeenCalledWith();
  });
});
