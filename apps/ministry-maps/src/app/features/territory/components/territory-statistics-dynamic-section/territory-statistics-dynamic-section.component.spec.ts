import { MockBuilder, MockedComponentFixture, MockRender, ngMocks } from 'ng-mocks';

import { TerritoryStatisticsDynamicSectionComponent } from './territory-statistics-dynamic-section.component';
import { TerritoryStatisticsBO, TStatisticsPeriod } from '../../bo/territory-statistics/territory-statistics.bo';
import { mockTerritories } from '../../bo/territory-alerts/territory-statistics.bo.spec';
import { MOCK_REPOSITORIES_PROVIDERS } from '../../../../../test/mocks/providers/mock-repositories-providers';
import { Territory } from '../../../../../models/territory';

describe('TerritoryStatisticsDynamicSectionComponent', () => {
  let component: TerritoryStatisticsDynamicSectionComponent;
  let fixture: MockedComponentFixture<TerritoryStatisticsDynamicSectionComponent, { territories: Territory[] }>;
  let territoryStatisticsBO: TerritoryStatisticsBO;

  beforeEach(() => {
    return MockBuilder(TerritoryStatisticsDynamicSectionComponent)
      .provide([...MOCK_REPOSITORIES_PROVIDERS])
      .provide(TerritoryStatisticsBO);
  });

  beforeEach(() => {
    fixture = MockRender(TerritoryStatisticsDynamicSectionComponent, { territories: mockTerritories });
    component = fixture.point.componentInstance;
    territoryStatisticsBO = fixture.point.injector.get(TerritoryStatisticsBO);
  });

  describe('component initialization', () => {
    it('should initialize with default period control value', () => {
      expect(component['statisticsPeriodControl'].value).toBe('THIS_MONTH');
    });

    it('should have all period options configured', () => {
      expect(component.periods).toEqual([
        { label: 'Este Mês', value: 'THIS_MONTH' },
        { label: '1 Mês', value: 'ONE_MONTH' },
        { label: '3 Meses', value: 'THREE_MONTHS' },
        { label: '6 meses', value: 'SIX_MONTHS' },
        { label: '1 ano', value: 'ONE_YEAR' },
        { label: 'Este Ano', value: 'YEAR_TO_DATE' },
      ]);
    });

    it('should initialize period signal with default value', () => {
      expect(component['period']()).toBe('THIS_MONTH');
    });
  });

  describe('form control behavior', () => {
    it('should update period signal when form control value changes', () => {
      const newPeriod: TStatisticsPeriod = 'THREE_MONTHS';
      component['statisticsPeriodControl'].setValue(newPeriod);

      expect(component['period']()).toBe(newPeriod);
    });

    it('should maintain non-nullable form control', () => {
      expect(component['statisticsPeriodControl'].value).toBeDefined();
      expect(component['statisticsPeriodControl'].value).not.toBeNull();
    });
  });

  describe('statistics computation', () => {
    it('should call territoryStatisticsBO with initial value', () => {
      const spy = jest.spyOn(territoryStatisticsBO, 'deriveTerritoryDynamicStatistics');
      // Trigger statistics computation
      fixture = MockRender(TerritoryStatisticsDynamicSectionComponent, { territories: mockTerritories });
      expect(spy).toHaveBeenCalledWith(mockTerritories, 'THIS_MONTH');
    });

    it('should recalculate statistics when period changes', () => {
      const spy = jest.spyOn(territoryStatisticsBO, 'deriveTerritoryDynamicStatistics');

      // Initial calculation
      fixture = MockRender(TerritoryStatisticsDynamicSectionComponent, { territories: mockTerritories });
      expect(spy).toHaveBeenCalledWith(mockTerritories, 'THIS_MONTH');

      // Change period through the select element
      const selectElement = ngMocks.find('select');
      ngMocks.change(selectElement, 'ONE_YEAR' satisfies TStatisticsPeriod);

      fixture.detectChanges();

      expect(spy).toHaveBeenCalledWith(mockTerritories, 'ONE_YEAR');
    });
  });
});
