import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Territory } from '../../../../../models/territory';
import { TerritoryStatisticsBO } from '../../bo/territory-statistics.bo';

@Component({
  selector: 'kingdom-apps-territory-statistics-static-section',
  standalone: true,
  imports: [CommonModule],
  styleUrls: [
    './territory-statistics-static-section.component.scss',
    '../../pages/statistics-territories-page/statistics-territories-page.component.scss',
  ],
  template: `
    <h2 class="mt-8">Gerais</h2>
    <section class="parent-grid mt-4">
      <div class="statistics-item p-4 mb-3">
        Territórios: <span>{{ statistics().territoryCount }}</span>
      </div>
      <div class="statistics-item p-4 mb-3">
        Pessoas: <span>{{ statistics().peopleCount }}</span>
      </div>
      <div class="statistics-item p-4 mb-3">
        Estudos bíblicos: <span>{{ statistics().bibleStudiesCount }}</span>
      </div>
      <div class="statistics-item p-4 mb-3">
        Mudaram: <span>{{ statistics().movedCount }}</span>
      </div>
    </section>
  `,
})
export class TerritoryStatisticsStaticSectionComponent {
  territoryStatisticsBO = inject(TerritoryStatisticsBO);

  territories = input.required<Territory[]>();
  statistics = computed(() => this.territoryStatisticsBO.deriveTerritoryStatistics(this.territories()));
}
