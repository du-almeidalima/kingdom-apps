import { TerritoriesPageComponent } from './territories-page.component';
import { MockBuilder, MockInstance, MockRender, ngMocks } from 'ng-mocks';
import { TerritoryAlertsBO } from '../../bo/territory-alerts/territory-alerts.bo';
import { TerritoryBO } from '../../bo/territory/territory.bo';
import { TerritoryStatisticsBO } from '../../bo/territory-statistics/territory-statistics.bo';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';
import { TerritoryRepositoryMock } from '../../../../../test/mocks';
import { CityLocatorService } from '../../../../shared/services/city-locator/city-locator.service';
import { AsyncPipe } from '@angular/common';
import { signal } from '@angular/core';

describe('TerritoriesPageComponent', () => {
  MockInstance.scope('case');

  beforeEach(() =>
    MockBuilder(TerritoriesPageComponent, [TerritoryAlertsBO, TerritoryBO, TerritoryStatisticsBO])
      .provide(MOCK_REPOSITORIES_PROVIDERS)
      .keep(AsyncPipe),
  );

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create and initialize selectedCity from CityLocatorService', () => {
    const fixture = MockRender(TerritoriesPageComponent);
    fixture.detectChanges();
    const component = fixture.point.componentInstance;

    expect(component).toBeTruthy();
    expect(component.selectedCity()).toBe('City 1');
    expect(ngMocks.findAll(fixture, '[data-testid="territories-loading"]')).toHaveLength(0);
    expect(ngMocks.find(fixture, '[data-testid="territories-list"]')).toBeTruthy();
  });

  it('renders loading spinner and defers territory fetch while locator is loading', () => {
    const getAllSpy = jest.spyOn(TerritoryRepositoryMock.prototype, 'getAllByCongregation');
    MockInstance(CityLocatorService, () => ({
      isLoading: signal(true),
      resolvedCity: signal<string | null>(null),
    }));

    const fixture = MockRender(TerritoriesPageComponent);

    expect(ngMocks.find(fixture, '[data-testid="territories-loading"]')).toBeTruthy();
    expect(ngMocks.findAll(fixture, '[data-testid="territories-list"]')).toHaveLength(0);
    expect(getAllSpy).not.toHaveBeenCalled();
  });

  it('waits for in-flight locator to resolve before fetching territories once with the resolved city', () => {
    const getAllSpy = jest.spyOn(TerritoryRepositoryMock.prototype, 'getAllByCongregation');
    const isLocatorLoading = signal(true);
    const resolvedCity = signal<string | null>(null);

    MockInstance(CityLocatorService, () => ({
      isLoading: isLocatorLoading,
      resolvedCity,
    }));

    const fixture = MockRender(TerritoriesPageComponent);
    const component = fixture.point.componentInstance;

    expect(ngMocks.find(fixture, '[data-testid="territories-loading"]')).toBeTruthy();
    expect(getAllSpy).not.toHaveBeenCalled();

    isLocatorLoading.set(false);
    resolvedCity.set('City 2');
    fixture.detectChanges();

    expect(component.selectedCity()).toBe('City 2');
    expect(getAllSpy).toHaveBeenCalledTimes(1);
    expect(ngMocks.findAll(fixture, '[data-testid="territories-loading"]')).toHaveLength(0);
    expect(ngMocks.find(fixture, '[data-testid="territories-list"]')).toBeTruthy();
  });

  it('does not overwrite user city selection or re-fetch when resolvedCity updates after initial fetch', () => {
    const getAllSpy = jest.spyOn(TerritoryRepositoryMock.prototype, 'getAllByCongregation');
    const resolvedCity = signal<string | null>('City 1');

    MockInstance(CityLocatorService, () => ({
      isLoading: signal(false),
      resolvedCity,
    }));

    const fixture = MockRender(TerritoriesPageComponent);
    fixture.detectChanges();
    const component = fixture.point.componentInstance;

    expect(component.selectedCity()).toBe('City 1');
    expect(getAllSpy).toHaveBeenCalledTimes(1);

    component.handleSelectedCityChange('City 2');
    resolvedCity.set('City 3');
    fixture.detectChanges();

    expect(component.selectedCity()).toBe('City 2');
    expect(getAllSpy).toHaveBeenCalledTimes(1);
  });
});
