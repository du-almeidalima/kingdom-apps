import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { finalize, Observable, of, shareReplay } from 'rxjs';

import { SelectComponent, SpinnerComponent } from '@kingdom-apps/common-ui';

import { UserStateService } from '../../../../state/user.state.service';
import { Territory } from '../../../../../models/territory';
import { TerritoryStatisticsBO } from '../../bo/territory-statistics/territory-statistics.bo';
import { TerritoryStatisticsStaticSectionComponent } from '../../components/territory-statistics-static-section/territory-statistics-static-section.component';
import { TerritoryStatisticsDynamicSectionComponent } from '../../components/territory-statistics-dynamic-section/territory-statistics-dynamic-section.component';
import { ALL_OPTION } from '../../../../shared/utils/territories-filter-pipe';

@Component({
  selector: 'kingdom-apps-statistics-territories-page',
  templateUrl: './statistics-territories-page.component.html',
  styleUrls: ['./statistics-territories-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SelectComponent,
    FormsModule,
    ReactiveFormsModule,
    TerritoryStatisticsStaticSectionComponent,
    AsyncPipe,
    TerritoryStatisticsDynamicSectionComponent,
    SpinnerComponent,
  ],
})
export class StatisticsTerritoriesPageComponent implements OnInit {
  private readonly userState = inject(UserStateService);
  private readonly territoryStatisticsBO = inject(TerritoryStatisticsBO);
  dialog = inject(Dialog);

  public readonly ALL_OPTION = ALL_OPTION;

  public cities: string[] = [];
  public selectedCity = this.ALL_OPTION;
  public isLoading = signal(false);
  public filteredTerritories$: Observable<Territory[]> = of([]);

  ngOnInit(): void {
    this.cities = this.userState.currentUser?.congregation?.cities ?? [];

    this.getTerritories();
  }

  handleSelectedCityChange(city: string) {
    this.selectedCity = city;
    this.getTerritories();
  }

  /** Get territories from the repository and create the filtered observable array */
  private getTerritories() {
    this.isLoading.set(true);

    this.filteredTerritories$ = this.territoryStatisticsBO.getTerritories(this.selectedCity).pipe(
      shareReplay(1),
      finalize(() => this.isLoading.set(false)),
    );
  }
}
