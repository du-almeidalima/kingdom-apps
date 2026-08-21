import { Dialog } from '@angular/cdk/dialog';
import { of } from 'rxjs';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { SortFilterComponent } from './sort-filter.component';
import { SortFilterDialogComponent } from './sort-filter-dialog/sort-filter-dialog.component';
import { SortFilterConfig, SortFilterValue } from './types/sort-filter.model';

const CONFIG: SortFilterConfig = {
  sortConfigs: {
    initial: 'name',
    options: [
      { value: 'name', label: 'Name' },
      { value: 'date', label: 'Date' },
    ],
  },
  filterConfigs: {
    initial: {},
    options: {
      city: { title: 'Cidade', controlName: 'city', filterType: 'select', options: [] },
      active: { title: 'Ativo', controlName: 'active', filterType: 'toggle' },
    },
  },
};

describe('SortFilterComponent', () => {
  const dialogMock = { open: jest.fn() };

  let changedValues: SortFilterValue[];
  let fixture: ReturnType<typeof MockRender<SortFilterComponent>>;
  let component: SortFilterComponent;

  const render = (
    inputs: Partial<Record<'config' | 'initialValue' | 'storeFilterState' | 'storageKey', unknown>> = {},
    options: { detectChanges?: boolean } = {}
  ) => {
    fixture = MockRender(
      SortFilterComponent,
      { config: CONFIG, ...inputs } as never,
      {
        providers: [{ provide: Dialog, useValue: dialogMock }],
        ...(options.detectChanges === false ? { detectChanges: false } : {}),
      }
    );
    component = fixture.point.componentInstance as SortFilterComponent;
    component.changed.subscribe(value => changedValues.push(value));
    if (options.detectChanges === false) {
      fixture.detectChanges();
    }
    return fixture;
  };

  const dialogReturns = (result: SortFilterValue | undefined) =>
    dialogMock.open.mockReturnValue({ closed: of(result) });

  beforeEach(() => {
    changedValues = [];
    dialogMock.open.mockReset();
    localStorage.clear();
    jest.spyOn(Storage.prototype, 'setItem');
    jest.spyOn(Storage.prototype, 'getItem');
    return MockBuilder(SortFilterComponent);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('emits the merged initial value once on init', () => {
    render({ initialValue: { sort: 'date', filters: { city: 'B' } } }, { detectChanges: false });

    expect(changedValues).toEqual([{ sort: 'date', filters: { city: 'B' } }]);
  });

  it('falls back to the config initial when no initial value is provided', () => {
    render({}, { detectChanges: false });

    expect(changedValues).toEqual([{ sort: 'name', filters: {} }]);
  });

  describe('badge', () => {
    it('is hidden when no filter differs from the initial value', () => {
      render();

      expect(ngMocks.find(fixture, '[data-testid="sort-filter-badge"]', undefined)).toBeUndefined();
    });

    it('counts filters that differ from the initial value', () => {
      render();
      dialogReturns({ sort: 'name', filters: { city: 'B', active: true } });

      ngMocks.click(ngMocks.find(fixture, '[data-testid="sort-filter-trigger"]'));
      fixture.detectChanges();

      expect(ngMocks.find(fixture, '[data-testid="sort-filter-badge"]').nativeElement.textContent.trim()).toBe('2');
    });
  });

  describe('handleOpenDialog', () => {
    it('opens the dialog with current values merged into the config', () => {
      render({ initialValue: { filters: { city: 'B' } } });
      dialogReturns(undefined);

      ngMocks.click(ngMocks.find(fixture, '[data-testid="sort-filter-trigger"]'));

      expect(dialogMock.open).toHaveBeenCalledWith(
        SortFilterDialogComponent,
        expect.objectContaining({
          data: expect.objectContaining({
            sortConfigs: expect.objectContaining({ initial: 'name' }),
            filterConfigs: expect.objectContaining({ initial: expect.objectContaining({ city: 'B' }) }),
          }),
        })
      );
    });

    it('emits changed only when the dialog result differs from the current value', () => {
      render({}, { detectChanges: false });
      changedValues = []; // drop the init emission

      dialogReturns({ sort: 'name', filters: {} });
      ngMocks.click(ngMocks.find(fixture, '[data-testid="sort-filter-trigger"]'));
      expect(changedValues).toHaveLength(0);

      dialogReturns({ sort: 'name', filters: { city: 'B' } });
      ngMocks.click(ngMocks.find(fixture, '[data-testid="sort-filter-trigger"]'));
      expect(changedValues).toEqual([{ sort: 'name', filters: { city: 'B' } }]);
    });

    it('does not emit or persist when the dialog is dismissed without a result', () => {
      render({}, { detectChanges: false });
      changedValues = [];
      dialogReturns(undefined);

      ngMocks.click(ngMocks.find(fixture, '[data-testid="sort-filter-trigger"]'));

      expect(changedValues).toHaveLength(0);
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('localStorage persistence', () => {
    it('does not touch localStorage when storeFilterState is off', () => {
      render({}, { detectChanges: false });

      expect(localStorage.getItem).not.toHaveBeenCalled();

      dialogReturns({ sort: 'name', filters: { city: 'B' } });
      ngMocks.click(ngMocks.find(fixture, '[data-testid="sort-filter-trigger"]'));

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('restores persisted values on init and saves dialog results under the storage key', () => {
      localStorage.setItem('custom-key', JSON.stringify({ sort: 'date', filters: { city: 'C' } }));

      render({ storeFilterState: true, storageKey: 'custom-key' }, { detectChanges: false });

      expect(changedValues).toEqual([{ sort: 'date', filters: { city: 'C' } }]);

      dialogReturns({ sort: 'name', filters: { city: 'B' } });
      ngMocks.click(ngMocks.find(fixture, '[data-testid="sort-filter-trigger"]'));

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'custom-key',
        JSON.stringify({ sort: 'name', filters: { city: 'B' } })
      );
    });
  });
});
