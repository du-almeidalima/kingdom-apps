import { Component, OnInit, ViewChild } from '@angular/core';
import { map, Observable, of, shareReplay, switchMap } from 'rxjs';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
  green200,
  SearchInputComponent,
  white200,
} from '@kingdom-apps/common-ui';

import { Territory } from '../../../../../models/territory';
import { Designation, DesignationTerritory } from '../../../../../models/designation';
import { DesignationStatusEnum } from '../../../../../models/enums/designation-status';
import { DesignationRepository } from '../../../../repositories/designation.repository';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { FeatureRoutesEnum } from '../../../../app-routes.module';
import { isMobileDevice } from '../../../../shared/utils/user-agent';
import { alertMessaging, findImportantAlert } from '../../bo/territory-alerts.bo';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { Dialog } from '@angular/cdk/dialog';

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

  cities: string[] = [];
  selectedCity = '';
  $filteredTerritories: Observable<Territory[]> = of([]);
  selectedTerritoriesModel = new Set<string>();
  assignedTerritories = new Set<string>();

  @ViewChild(SearchInputComponent)
  searchInputComponent!: SearchInputComponent;

  constructor(
    private readonly territoryRepository: TerritoryRepository,
    private readonly designationRepository: DesignationRepository,
    private readonly userState: UserStateService,
    private readonly dialog: Dialog
  ) {}

  ngOnInit(): void {
    const { id, cities } = this.userState.currentUser!.congregation!;
    const firstCity = cities.length >= 0 ? cities[0] : '';

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

    // FIXME: This whole flow should not be responsibility of a component. It should be extracted to a service
    this.territoryRepository
      .getAllInIds(selectedTerritories)
      .pipe(
        switchMap(territories => {
          const designationTerritories: DesignationTerritory[] = territories.map(t => ({
            ...t,
            status: DesignationStatusEnum.PENDING,
          }));

          const newDesignation: Omit<Designation, 'id'> = {
            territories: designationTerritories,
            createdAt: new Date(),
            createdBy: this.userState.currentUser!.id,
          };

          return this.designationRepository.add(newDesignation);
        })
      )
      .subscribe(designation => {
        this.shareDesignation(designation.id);
      });
  }

  handleTerritorySearch(searchTerm: string | null) {
    this.$filteredTerritories = this.filterTerritoriesByText(searchTerm);
  }

  handleSelectedCityChange(city: string) {
    this.fetchTerritories(this.userState.currentUser!.congregation!.id, city);
    this.searchInputComponent.resetSearch();
  }

  handleTerritoryCheck(value: boolean, territory: Territory) {
    const territoryId = territory.id;

    const importantAlert = findImportantAlert(territory);

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
    const workUrl = `${location.origin}/${FeatureRoutesEnum.WORK}/${designationId}`;
    const whatsAppUrl = `whatsapp://send?text=`;

    const builtUrl = `${whatsAppUrl}${workUrl}`;

    if (isMobileDevice()) {
      window.location.href = builtUrl;
    } else {
      window.open(builtUrl);
    }
  }

  private filterTerritoriesByText(searchTerm: string | null) {
    return this.territories$.pipe(
      map(tArr => {
        if (!searchTerm) {
          return tArr;
        }

        const searchWords = searchTerm.split(' ');

        return tArr.filter(t => {
          const territorySearchableText = (t.address + t.note).toLowerCase();

          return searchWords.every(word => territorySearchableText.includes(word.toLowerCase()));
        });
      })
    );
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
    const { title, bodyText } = alertMessaging(importantAlert);

    return this.dialog.open<ConfirmDialogComponent, ConfirmDialogData>(ConfirmDialogComponent, {
      data: { title, bodyText },
    }).closed;
  }
}
