import { Component, OnInit, ViewChild } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { finalize, Observable, of, shareReplay } from 'rxjs';

import { SearchInputComponent, SelectComponent } from '@kingdom-apps/common-ui';

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
  imports: [
    SelectComponent,
    FormsModule,
    ReactiveFormsModule,
    TerritoryStatisticsStaticSectionComponent,
    AsyncPipe,
    TerritoryStatisticsDynamicSectionComponent,
  ],
})
export class StatisticsTerritoriesPageComponent implements OnInit {
  public readonly ALL_OPTION = ALL_OPTION;

  public cities: string[] = [];
  public selectedCity = this.ALL_OPTION;
  public isLoading = false;
  public filteredTerritories$: Observable<Territory[]> = of([]);

  @ViewChild(SearchInputComponent)
  searchInputComponent?: SearchInputComponent;

  constructor(
    private readonly userState: UserStateService,
    private readonly territoryStatisticsBO: TerritoryStatisticsBO,
    public dialog: Dialog
  ) {}

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
    this.isLoading = true;

    this.filteredTerritories$ = this.territoryStatisticsBO.getTerritories(this.selectedCity).pipe(
      shareReplay(1),
      finalize(() => (this.isLoading = false))
    );
  }
}
