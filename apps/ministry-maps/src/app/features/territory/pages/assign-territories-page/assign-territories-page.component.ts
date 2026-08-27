import { ChangeDetectionStrategy, Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { finalize, Observable, of, shareReplay } from 'rxjs';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
  FloatingActionButtonComponent,
  green200,
  IconComponent,
  SearchInputComponent,
  SelectComponent,
  SortFilterComponent,
  SortFilterValue,
  white200,
} from '@kingdom-apps/common-ui';

import { Territory } from '../../../../../models/territory';
import { User } from '../../../../../models/user';
import { TERRITORY_SORT_FILTER_CONFIG } from '../../config/territory-filter.config';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { FeatureRoutesEnum } from '../../../../app-routes';
import { isMobileDevice } from '../../../../shared/utils/user-agent';
import { TerritoryAlertsBO } from '../../bo/territory-alerts/territory-alerts.bo';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { Dialog } from '@angular/cdk/dialog';
import { TerritoryBO } from '../../bo/territory/territory.bo';
import {
  ALL_OPTION,
  territoriesFilterPipe,
  TerritoriesOrderBy,
  TerritoryFilterSettings,
} from '../../../../shared/utils/territories-filter-pipe';
import { createSendWhatsAppLink } from '../../../../shared/utils/share-utils';
import { FormsModule } from '@angular/forms';
import { TerritoryCheckboxComponent } from '../../components/territory-checkbox/territory-checkbox.component';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'kingdom-apps-assign-territories-page',
  templateUrl: './assign-territories-page.component.html',
  styleUrls: ['./assign-territories-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SelectComponent,
    FormsModule,
    SearchInputComponent,
    TerritoryCheckboxComponent,
    AsyncPipe,
    FloatingActionButtonComponent,
    IconComponent,
    SortFilterComponent,
  ],
})
export class AssignTerritoriesPageComponent implements OnInit {
  private readonly territoryRepository = inject(TerritoryRepository);
  private readonly userState = inject(UserStateService);
  private readonly territoryBO = inject(TerritoryBO);
  private readonly dialog = inject(Dialog);

  /**
   * This page is only reachable for a signed-in user whose congregation reference is resolved,
   * so the state values are asserted here instead of guarded at every call site.
   */
  private get currentCongregation(): NonNullable<User['congregation']> {
    const user = this.userState.currentUser;
    if (!user?.congregation) {
      throw new Error('Assign Territories requires a signed-in user with a resolved congregation.');
    }
    return user.congregation;
  }

  private territories$: Observable<Territory[]> = of([]);

  public readonly ALL_OPTION = ALL_OPTION;
  public readonly green200 = green200;
  public readonly white200 = white200;

  isCreatingAssignment = signal(false);
  cities: string[] = [];
  selectedCity = '';
  searchTerm?: string | null;
  searchFilters: TerritoryFilterSettings['filters'] = TERRITORY_SORT_FILTER_CONFIG.filterConfigs.initial;
  orderBy: TerritoriesOrderBy = TerritoriesOrderBy.SAVED_INDEX;
  filteredTerritories$: Observable<Territory[]> = of([]);
  selectedTerritoriesModel = signal(new Set<string>());
  assignedTerritories = signal(new Set<string>());

  public sortFilterConfig = TERRITORY_SORT_FILTER_CONFIG;

  searchInputComponent = viewChild.required(SearchInputComponent);

  ngOnInit(): void {
    const { id, cities } = this.currentCongregation;
    const firstCity = cities.length > 0 ? cities[0] : ALL_OPTION;

    this.selectedCity = firstCity;
    this.cities = cities;

    this.fetchTerritories(id, firstCity);
  }

  /**
   * Returns true if the territory has already been selected (checks the checkbox).
   * It checks both the currently selected list or if it was already assigned to a designation.
   * i.e. it's in the assignedTerritories Set.
   * @param territoryId
   */
  hasAlreadyBeenSelected(territoryId: string): boolean {
    return this.selectedTerritoriesModel().has(territoryId) || this.assignedTerritories().has(territoryId);
  }

  handleTerritoryFormSubmit() {
    this.assignedTerritories.update((assigned) => new Set([...this.selectedTerritoriesModel(), ...assigned]));
    const selectedTerritories = [...this.selectedTerritoriesModel().values()];
    this.selectedTerritoriesModel.set(new Set());

    // Loading Spinner on Button
    this.isCreatingAssignment.set(true);

    this.territoryBO
      .createDesignationForTerritories(selectedTerritories)
      .pipe(
        finalize(() => {
          this.isCreatingAssignment.set(false);
        }),
      )
      .subscribe((designation) => {
        this.shareDesignation(designation.id);
      });
  }

  /**
   * Performs the filter with the current search settings properties:
   * <ul>
   *   <li>{@link searchTerm}</li>
   *   <li>{@link selectedCity}</li>
   *   <li>{@link orderBy}</li>
   * </ul>
   */
  filterTerritories() {
    const searchSettings: TerritoryFilterSettings = {
      searchTerm: this.searchTerm,
      city: this.selectedCity,
      orderBy: this.orderBy,
      filters: {
        includeBibleStudent: this.searchFilters?.includeBibleStudent,
        includeMoved: this.searchFilters?.includeMoved,
        icon: this.searchFilters?.icon,
      },
    };

    this.filteredTerritories$ = territoriesFilterPipe(this.territories$, searchSettings);
  }

  handleTerritorySearchTermChange(searchTerm: string | null) {
    this.searchTerm = searchTerm;
    this.filterTerritories();
  }

  handleSortFilterChange(value: SortFilterValue) {
    this.searchFilters = (value.filters ?? {}) as TerritoryFilterSettings['filters'];
    this.orderBy = (value.sort as TerritoriesOrderBy) ?? TerritoriesOrderBy.SAVED_INDEX;
    this.filterTerritories();
  }

  handleSelectedCityChange(city: string) {
    this.selectedCity = city;
    this.searchTerm = '';
    this.searchInputComponent().resetSearch();
    this.fetchTerritories(this.currentCongregation.id, city);
  }

  handleTerritoryCheck(value: boolean, territory: Territory) {
    const territoryId = territory.id;

    const importantAlert = TerritoryAlertsBO.findImportantAlert(territory);

    // Adding the value here regardless of the alert because we need to tell Angular that something has changed
    // In order for the TerritoryCheckBox component to render correctly
    // Otherwise, even by not adding this, the TerritoryCheckBox would display as selected
    this.setTerritorySelection(territoryId, value);

    if (value && importantAlert) {
      this.openConfirmAssignmentDialog(importantAlert).subscribe((result) => {
        if (!result) {
          this.setTerritorySelection(territoryId, false);
        }
      });
    }
  }

  private setTerritorySelection(territoryId: string, selected: boolean) {
    this.selectedTerritoriesModel.update((selectedIds) => {
      const next = new Set(selectedIds);
      if (selected) {
        next.add(territoryId);
      } else {
        next.delete(territoryId);
      }
      return next;    });
  }

  shareDesignation(designationId: string) {
    const builtUrl = createSendWhatsAppLink(`${location.origin}/${FeatureRoutesEnum.WORK}/${designationId}`);

    if (isMobileDevice()) {
      window.location.href = builtUrl;
    } else {
      window.open(builtUrl);
    }
  }

  private fetchTerritories(congregationId: string, city: string) {
    // This is the object that will be iterated, since we can't iterate through formGroup.controls...
    this.territories$ =
      city === ALL_OPTION
        ? this.territoryRepository.getAllByCongregation(congregationId).pipe(shareReplay(1))
        : this.territoryRepository.getAllByCongregationAndCities(congregationId, [city]).pipe(shareReplay(1));

    this.filterTerritories();
  }

  private openConfirmAssignmentDialog(importantAlert: VisitOutcomeEnum) {
    const { title, bodyText } = TerritoryAlertsBO.alertMessaging(importantAlert);

    return this.dialog.open<ConfirmDialogComponent, ConfirmDialogData>(ConfirmDialogComponent, {
      data: { title, bodyText },
    }).closed;
  }
}
