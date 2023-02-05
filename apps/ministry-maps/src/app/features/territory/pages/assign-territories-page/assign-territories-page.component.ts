import { Component, OnInit } from '@angular/core';
import { Observable, of, switchMap } from 'rxjs';

import { green200, white200 } from '@kingdom-apps/common-ui';

import { Territory } from '../../../../../models/territory';
import { Designation, DesignationTerritory } from '../../../../../models/designation';
import { DesignationStatusEnum } from '../../../../../models/enums/designation-status';
import { DesignationRepository } from '../../../../repositories/designation.repository';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { FeatureRoutesEnum } from '../../../../app-routes.module';
import { isMobileDevice } from '../../../../shared/utils/user-agent';

@Component({
  selector: 'kingdom-apps-assign-territories-page',
  templateUrl: './assign-territories-page.component.html',
  styleUrls: ['./assign-territories-page.component.scss'],
})
export class AssignTerritoriesPageComponent implements OnInit {
  public readonly green200 = green200;
  public readonly white200 = white200;
  public readonly ALL_OPTION = 'ALL';

  cities: string[] = [];
  selectedCity = '';
  territories$: Observable<Territory[]> = of([]);
  selectedTerritoriesModel = new Set<string>();
  assignedTerritories = new Set<string>();

  constructor(
    private readonly territoryRepository: TerritoryRepository,
    private readonly designationRepository: DesignationRepository,
    private readonly userState: UserStateService,
  ) {
  }

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

  private fetchTerritories(congregationId: string, city: string) {
    // This is the object that will be iterated, since we can't iterate through formGroup.controls...
    this.territories$ =
      city === this.ALL_OPTION
        ? this.territoryRepository.getAllByCongregation(congregationId)
        : this.territoryRepository.getAllByCongregationAndCity(congregationId, city);
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
          };

          return this.designationRepository.add(newDesignation);
        }),
      )
      .subscribe(designation => {
        this.shareDesignation(designation.id);
      });
  }

  handleSelectedCityChange(city: string) {
    this.fetchTerritories(this.userState.currentUser!.congregation!.id, city);
  }

  handleTerritoryCheck(value: boolean, territoryId: string) {
    value ? this.selectedTerritoriesModel.add(territoryId) : this.selectedTerritoriesModel.delete(territoryId);
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
}
