import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { SelectComponent } from '@kingdom-apps/common-ui';

import { TerritoryStatisticsBO, type TStatisticsPeriod } from '../../bo/territory-statistics/territory-statistics.bo';
import type { Territory } from '../../../../../models/territory';

export type TPeriodOption = {
  label: string;
  value: TStatisticsPeriod;
};

@Component({
  selector: 'kingdom-apps-territory-statistics-dynamic-section',
  imports: [CommonModule, SelectComponent, ReactiveFormsModule],
  styleUrls: [
    './territory-statistics-dynamic-section.component.scss',
    '../../pages/statistics-territories-page/statistics-territories-page.component.scss',
  ],
  template: `
    <section class="parent-grid select-period mt-8">
      <h2 class="h2-period">Por período</h2>
      <select lib-select name="Periodo" [formControl]="statisticsPeriodControl">
        @for (period of periods; track period) {
          <option [value]="period.value">{{ period.label }}</option>
        }
      </select>
    </section>

    <section class="parent-grid mt-4">
      <div class="statistics-item p-4 mb-3">
        Revisitas: <span>{{ statistics().revisitCount }}</span>
      </div>
      <div class="statistics-item p-4 mb-3">
        Visitas: <span>{{ statistics().visitCount }}</span>
      </div>
    </section>
  `,
})
export class TerritoryStatisticsDynamicSectionComponent {
  public periods: TPeriodOption[] = [
    { label: 'Este Mês', value: 'THIS_MONTH' },
    { label: '1 Mês', value: 'ONE_MONTH' },
    { label: '3 Meses', value: 'THREE_MONTHS' },
    { label: '6 meses', value: 'SIX_MONTHS' },
    { label: '1 ano', value: 'ONE_YEAR' },
    { label: 'Este Ano', value: 'YEAR_TO_DATE' },
  ];

  protected statisticsPeriodControl = new FormControl('THIS_MONTH' as TStatisticsPeriod, { nonNullable: true });
  protected territoryStatisticsBO = inject(TerritoryStatisticsBO);
  protected period = toSignal(this.statisticsPeriodControl.valueChanges, {
    initialValue: this.statisticsPeriodControl.value,
  });
  protected statistics = computed(() => {
    return this.territoryStatisticsBO.deriveTerritoryDynamicStatistics(this.territories(), this.period());
  });

  territories = input.required<Territory[]>();
}
