import { Component, OnInit, ViewChild } from '@angular/core';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { finalize, map, Observable, of, shareReplay } from 'rxjs';
import { Territory } from '../../../../../models/territory';
import { SearchInputComponent, SelectComponent } from '@kingdom-apps/common-ui';
import { Dialog } from '@angular/cdk/dialog';
import { TerritoryStatisticsBO } from '../../bo/territory-statistics.bo';
import { TerritoryStatistics } from '../../../../../models/territory-statistics';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'kingdom-apps-statistics-territories-page',
  templateUrl: './statistics-territories-page.component.html',
  styleUrls: ['./statistics-territories-page.component.scss'],
  imports: [SelectComponent, FormsModule],
})
export class StatisticsTerritoriesPageComponent implements OnInit {
  private territories$: Observable<Territory[]> = of([]);
  public readonly ALL_OPTION = 'ALL';

  public cities: string[] = [];
  public selectedCity = this.ALL_OPTION;
  public isLoading = false;
  public filteredTerritories$: Observable<Territory[]> = of([]);

  public territoryStatistics: TerritoryStatistics = {
    territoryCount: 0,
    peopleCount: 0,
    bibleStudiesCount: 0,
    movedCount: 0,
    revisitCount: 0,
  };

  @ViewChild(SearchInputComponent)
  searchInputComponent?: SearchInputComponent;

  constructor(
    private readonly territoryRepository: TerritoryRepository,
    private readonly userState: UserStateService,
    private readonly territoryStatisticsBO: TerritoryStatisticsBO,
    public dialog: Dialog
  ) {}

  ngOnInit(): void {
    this.cities = this.userState.currentUser?.congregation?.cities ?? [];
    // Select First City
    this.selectedCity = this.cities.length >= 0 ? this.cities[0] : this.ALL_OPTION;

    this.getTerritories();
    this.territoryStatisticsBO.getTerritoryStatistics(this.selectedCity).subscribe(statisticsResponse => {
      this.territoryStatistics = statisticsResponse;
    });
  }

  handleSelectedCityChange(city: string) {
    this.selectedCity = city;
    this.filteredTerritories$ = this.filterTerritoriesByCity(city);
    this.territoryStatisticsBO
      .getTerritoryStatistics(city === this.ALL_OPTION ? undefined : this.selectedCity)
      .subscribe(statisticsResponse => {
        this.territoryStatistics = statisticsResponse;
      });
  }

  /** Get territories from the repository and create the filtered observable array */
  private getTerritories() {
    const userCongregationId = this.userState.currentUser?.congregation?.id;
    this.isLoading = true;

    this.territories$ = this.territoryRepository.getAllByCongregation(userCongregationId ?? '').pipe(
      finalize(() => {
        this.isLoading = false;
      }),
      shareReplay(1)
    );

    this.filteredTerritories$ = this.filterTerritoriesByCity(this.selectedCity);
  }

  private filterTerritoriesByCity(city: string) {
    // Don't reset search input for same city
    if (city !== this.selectedCity) {
      this.searchInputComponent?.resetSearch();
    }

    return this.territories$.pipe(
      map(tArr => {
        if (city === this.ALL_OPTION) {
          const allTerritories = [...tArr];

          // Sorting per city when ALL is selected
          return allTerritories.sort((a, b) => {
            return a.city.localeCompare(b.city);
          });
        }

        return tArr
          .filter(t => t.city === city)
          .sort((t1, t2) => {
            return (t1.positionIndex ?? 0) - (t2.positionIndex ?? 0);
          });
      })
    );
  }
}
