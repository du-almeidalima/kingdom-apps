import { Component, OnInit, ViewChild } from '@angular/core';
import { finalize, Observable, of, shareReplay } from 'rxjs';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
  green200,
  SearchInputComponent,
  white200,
} from '@kingdom-apps/common-ui';

import { Territory } from '../../../../../models/territory';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { FeatureRoutesEnum } from '../../../../app-routes.module';
import { isMobileDevice } from '../../../../shared/utils/user-agent';
import { TerritoryAlertsBO } from '../../bo/territory-alerts.bo';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { Dialog } from '@angular/cdk/dialog';
import { TerritoryBO } from '../../bo/territory.bo';
import { TerritoriesOrderBy, territoryFilterPipe } from '../../../../shared/utils/territory-filter-pipe';
import { createSendWhatsAppLink } from '../../../../shared/utils/share-utils';


@Component({
  selector: 'kingdom-apps-assign-territories-page',
  templateUrl: './assign-territories-page.component.html',
  styleUrls: ['./assign-territories-page.component.scss'],
})
export class AssignTerritoriesPageComponent implements OnInit {
  private territories$: Observable<Territory[]> = of([]);

  public readonly green200 = green200;
  public readonly white200 = white200;
  public readonly ALL_OPTION = 'ALL';
  public readonly TerritoriesOrderBy = TerritoriesOrderBy;

  isCreatingAssignment = false;
  cities: string[] = [];
  selectedCity = '';
  searchTerm?: string | null;
  orderBy: TerritoriesOrderBy = TerritoriesOrderBy.SAVED;
  $filteredTerritories: Observable<Territory[]> = of([]);
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
    const firstCity = cities.length >= 0 ? cities[0] : this.ALL_OPTION;

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

  handleTerritorySearch(searchTerm: string | null) {
    this.searchTerm = searchTerm;
    this.$filteredTerritories = this.filterTerritoriesByText(this.searchTerm);
  }

  handleTerritoryOrderByChange(orderBy: TerritoriesOrderBy) {
    this.orderBy = orderBy;
    this.$filteredTerritories = territoryFilterPipe(this.territories$, this.searchTerm ?? '', this.orderBy);
  }

  handleSelectedCityChange(city: string) {
    this.fetchTerritories(this.userState.currentUser!.congregation!.id, city);
    this.searchTerm = '';
    this.searchInputComponent.resetSearch();
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

  trackByRepositoryId(_: number, item: Territory) {
    return item.id;
  }

  shareDesignation(designationId: string) {
    const builtUrl = createSendWhatsAppLink(`${location.origin}/${FeatureRoutesEnum.WORK}/${designationId}`);

    if (isMobileDevice()) {
      window.location.href = builtUrl;
    } else {
      window.open(builtUrl);
    }
  }

  private filterTerritoriesByText(searchTerm: string | null) {
    return territoryFilterPipe(this.territories$, searchTerm ?? '', this.orderBy);
  }

  private fetchTerritories(congregationId: string, city: string) {
    // This is the object that will be iterated, since we can't iterate through formGroup.controls...
    this.territories$ =
      city === this.ALL_OPTION
        ? this.territoryRepository.getAllByCongregation(congregationId).pipe(shareReplay(1))
        : this.territoryRepository.getAllByCongregationAndCity(congregationId, city).pipe(shareReplay(1));

    this.$filteredTerritories = this.filterTerritoriesByText('');
  }

  private openConfirmAssignmentDialog(importantAlert: VisitOutcomeEnum) {
    const { title, bodyText } = TerritoryAlertsBO.alertMessaging(importantAlert);

    return this.dialog.open<ConfirmDialogComponent, ConfirmDialogData>(ConfirmDialogComponent, {
      data: { title, bodyText },
    }).closed;
  }
}
