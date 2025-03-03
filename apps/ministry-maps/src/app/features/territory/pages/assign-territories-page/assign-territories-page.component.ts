import { Component, OnInit, ViewChild } from '@angular/core';
import { finalize, Observable, of, shareReplay } from 'rxjs';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
  FloatingActionButtonComponent,
  green200,
  IconComponent,
  SearchInputComponent,
  SelectComponent,
  white200,
} from '@kingdom-apps/common-ui';

import { Territory } from '../../../../../models/territory';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { FeatureRoutesEnum } from '../../../../app-routes';
import { isMobileDevice } from '../../../../shared/utils/user-agent';
import { TerritoryAlertsBO } from '../../bo/territory-alerts.bo';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { Dialog } from '@angular/cdk/dialog';
import { TerritoryBO } from '../../bo/territory.bo';
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
  imports: [
    SelectComponent,
    FormsModule,
    SearchInputComponent,
    TerritoryCheckboxComponent,
    AsyncPipe,
    FloatingActionButtonComponent,
    IconComponent,
  ],
})
export class AssignTerritoriesPageComponent implements OnInit {
  private territories$: Observable<Territory[]> = of([]);

  public readonly ALL_OPTION = ALL_OPTION;
  public readonly green200 = green200;
  public readonly white200 = white200;
  public readonly TerritoriesOrderBy = TerritoriesOrderBy;

  isCreatingAssignment = false;
  cities: string[] = [];
  selectedCity = '';
  searchTerm?: string | null;
  orderBy: TerritoriesOrderBy = TerritoriesOrderBy.SAVED_INDEX;
  filteredTerritories$: Observable<Territory[]> = of([]);
  selectedTerritoriesModel = new Set<string>();
  assignedTerritories = new Set<string>();

  @ViewChild(SearchInputComponent)
  searchInputComponent!: SearchInputComponent;

  constructor(
    private readonly territoryRepository: TerritoryRepository,
    private readonly userState: UserStateService,
    private readonly territoryBO: TerritoryBO,
    private readonly dialog: Dialog
  ) {}

  ngOnInit(): void {
    const { id, cities } = this.userState.currentUser!.congregation!;
    const firstCity = cities.length >= 0 ? cities[0] : ALL_OPTION;

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
    return this.selectedTerritoriesModel.has(territoryId) || this.assignedTerritories.has(territoryId);
  }

  handleTerritoryFormSubmit() {
    this.assignedTerritories = new Set([...this.selectedTerritoriesModel, ...this.assignedTerritories]);
    const selectedTerritories = [...this.selectedTerritoriesModel.values()];
    this.selectedTerritoriesModel.clear();

    // Loading Spinner on Button
    this.isCreatingAssignment = true;

    this.territoryBO
      .createDesignationForTerritories(selectedTerritories)
      .pipe(
        finalize(() => {
          this.isCreatingAssignment = false;
        })
      )
      .subscribe(designation => {
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
    };

    this.filteredTerritories$ = territoriesFilterPipe(this.territories$, searchSettings);
  }

  handleTerritorySearchTermChange(searchTerm: string | null) {
    this.searchTerm = searchTerm;
    this.filterTerritories();
  }

  handleTerritoryOrderByChange(orderBy: TerritoriesOrderBy) {
    this.orderBy = orderBy;
    this.filterTerritories();
  }

  handleSelectedCityChange(city: string) {
    this.selectedCity = city;
    this.searchTerm = '';
    this.searchInputComponent.resetSearch();
    this.fetchTerritories(this.userState.currentUser!.congregation!.id, city);
  }

  handleTerritoryCheck(value: boolean, territory: Territory) {
    const territoryId = territory.id;

    const importantAlert = TerritoryAlertsBO.findImportantAlert(territory);

    // Adding the value here regardless of the alert because we need to tell Angular that something has changed
    // In order for the TerritoryCheckBox component to render correctly
    // Otherwise, even by not adding this, the TerritoryCheckBox would display as selected
    value ? this.selectedTerritoriesModel.add(territoryId) : this.selectedTerritoriesModel.delete(territoryId);

    if (value && importantAlert) {
      this.openConfirmAssignmentDialog(importantAlert).subscribe(result => {
        if (!result) {
          this.selectedTerritoriesModel.delete(territoryId);
        }
      });
    }
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
        : this.territoryRepository.getAllByCongregationAndCity(congregationId, city).pipe(shareReplay(1));

    this.filterTerritories();
  }

  private openConfirmAssignmentDialog(importantAlert: VisitOutcomeEnum) {
    const { title, bodyText } = TerritoryAlertsBO.alertMessaging(importantAlert);

    return this.dialog.open<ConfirmDialogComponent, ConfirmDialogData>(ConfirmDialogComponent, {
      data: { title, bodyText },
    }).closed;
  }
}
