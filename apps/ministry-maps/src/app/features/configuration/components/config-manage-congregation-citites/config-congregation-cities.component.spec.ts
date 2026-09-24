import { of, throwError } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';
import { ToasterService } from '@kingdom-apps/common-ui';

import { ConfigCongregationCitiesComponent } from './config-congregation-cities.component';
import { ConfigurationBO } from '../../../../shared/business-objects/configuration.bo';
import { UserStateService } from '../../../../state/user.state.service';
import { congregationMock, userMockBuilder } from '../../../../../test/mocks';

describe('ConfigCongregationCitiesComponent', () => {
  let updateCongregationCities: jest.Mock;
  let component: ConfigCongregationCitiesComponent;

  const toasterMock = { success: jest.fn(), error: jest.fn() };

  const render = () => {
    const fixture = MockRender(ConfigCongregationCitiesComponent, undefined, {
      providers: [
        { provide: ConfigurationBO, useValue: { updateCongregationCities } },
        { provide: ToasterService, useValue: toasterMock },
        {
          provide: UserStateService,
          useValue: (() => {
            const userStateMock = new UserStateService();
            userStateMock.setUser(userMockBuilder({ congregation: congregationMock }));
            return userStateMock;
          })(),
        },
      ],
    });

    component = fixture.point.componentInstance as ConfigCongregationCitiesComponent;
    return fixture;
  };

  beforeEach(() => {
    updateCongregationCities = jest.fn().mockReturnValue(of(void 0));
    toasterMock.success.mockReset();
    toasterMock.error.mockReset();
    return MockBuilder(ConfigCongregationCitiesComponent);
  });

  it('maps the congregation cities into the editable list', () => {
    const fixture = render();

    const rows = ngMocks.findAll(fixture, '[data-testid="config-city-row"]');
    expect(rows).toHaveLength(congregationMock.cities.length);
    expect(component.congregation).toEqual(congregationMock);
  });

  it('shows the no-congregation banner when the user has no congregation', () => {
    const fixture = MockRender(ConfigCongregationCitiesComponent, undefined, {
      providers: [
        { provide: ConfigurationBO, useValue: { updateCongregationCities } },
        {
          provide: UserStateService,
          useValue: (() => {
            const userStateMock = new UserStateService();
            userStateMock.setUser(userMockBuilder({ congregation: undefined }));
            return userStateMock;
          })(),
        },
      ],
    });

    expect(ngMocks.find(fixture, '[data-testid="config-no-congregation-banner"]')).toBeTruthy();
  });

  describe('editing flow', () => {
    it('adds a new city row in edit mode', () => {
      render();

      ngMocks.click(ngMocks.find('[data-testid="config-add-city"]'));

      expect(component.cities()).toHaveLength(congregationMock.cities.length + 1);
      expect(component.cities().at(-1)?.isNew).toBe(true);
    });

    it('canceling a new city removes it, canceling a rename restores the original name', () => {
      render();

      ngMocks.click(ngMocks.find('[data-testid="config-add-city"]'));
      component.cancelEdit(component.cities()[component.cities().length - 1], component.cities().length - 1);
      expect(component.cities()).toHaveLength(congregationMock.cities.length);

      component.editCity(component.cities()[0]);
      component.cities()[0].currentName = 'Renamed City';
      component.cancelEdit(component.cities()[0], 0);
      expect(component.cities()[0].currentName).toBe(congregationMock.cities[0]);
      expect(component.cities()[0].isEditing).toBe(false);
    });

    it('deletes a city only when confirmed', () => {
      render();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValueOnce(false);
      ngMocks.click(ngMocks.findAll('[data-testid="config-delete-city"]')[0]);
      expect(component.cities()).toHaveLength(congregationMock.cities.length);

      confirmSpy.mockReturnValueOnce(true);
      ngMocks.click(ngMocks.findAll('[data-testid="config-delete-city"]')[0]);
      expect(component.cities()).toHaveLength(congregationMock.cities.length - 1);

      confirmSpy.mockRestore();
    });
  });

  describe('hasChanges / Save gating', () => {
    it('disables Save for the untouched list', () => {
      render();

      expect(component.hasChanges()).toBe(false);
      expect(ngMocks.find('[data-testid="config-save"]').nativeElement.disabled).toBe(true);
    });

    it.each([
      ['a rename', (c: ConfigCongregationCitiesComponent) => (c.cities()[0].currentName = 'Renamed')],
      ['a new city', (c: ConfigCongregationCitiesComponent) => c.addCity()],
      [
        'a deletion (regression: delete-only changes must be savable)',
        (c: ConfigCongregationCitiesComponent) => c.deleteCity(0),
      ],
    ])('enables Save after %s', (_desc, mutate) => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      const fixture = render();
      mutate(component);
      // Direct in-place mutations (rename) carry no change notification — mimic the
      // template-event notification the real app gets from ngModel.
      fixture.point.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();

      expect(component.hasChanges()).toBe(true);
      expect(ngMocks.find('[data-testid="config-save"]').nativeElement.disabled).toBe(false);
      jest.restoreAllMocks();
    });
  });

  describe('saveChanges', () => {
    it('rejects empty city names with a toast and no repository call', () => {
      render();

      component.addCity();
      component.saveChanges();

      expect(toasterMock.error).toHaveBeenCalledWith('All cities must have a name.');
      expect(updateCongregationCities).not.toHaveBeenCalled();
    });

    it('rejects duplicate city names case-insensitively', () => {
      render();
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      // rename the first city to a case variant of the still-present third city
      component.editCity(component.cities()[0]);
      component.cities()[0].currentName = congregationMock.cities[2].toUpperCase();
      component.saveChanges();

      expect(toasterMock.error).toHaveBeenCalledWith('City names must be unique.');
      expect(updateCongregationCities).not.toHaveBeenCalled();
      jest.restoreAllMocks();
    });

    it('sends rename/add/delete DTOs, shows a success toast and resets the local state', () => {
      render();

      jest.spyOn(window, 'confirm').mockReturnValue(true);

      // rename first city, delete second, add a new one
      component.editCity(component.cities()[0]);
      component.cities()[0].currentName = 'Renamed City';
      component.deleteCity(1);
      component.addCity();
      component.cities()[component.cities().length - 1].currentName = 'Brand New City';

      component.saveChanges();

      expect(updateCongregationCities).toHaveBeenCalledWith([
        { oldCityName: congregationMock.cities[0], newCityName: 'Renamed City' },
        { oldCityName: congregationMock.cities[2], newCityName: congregationMock.cities[2] },
        { oldCityName: undefined, newCityName: 'Brand New City' },
      ]);
      expect(toasterMock.success).toHaveBeenCalledWith('Cities updated successfully!');
      expect(component.isLoading()).toBe(false);
      expect(component.cities().map((c) => c.currentName)).toEqual([
        'Renamed City',
        congregationMock.cities[2],
        'Brand New City',
      ]);
      expect(component.cities().every((c) => !c.isNew && !c.isEditing)).toBe(true);
      jest.restoreAllMocks();
    });

    it('shows an error toast and stops loading when the update fails', () => {
      updateCongregationCities.mockReturnValue(throwError(() => new Error('boom')));
      render();

      component.editCity(component.cities()[0]);
      component.cities()[0].currentName = 'Renamed City';
      component.saveChanges();

      expect(toasterMock.error).toHaveBeenCalledWith('Error updating cities: boom');
      expect(component.isLoading()).toBe(false);
    });
  });
});
