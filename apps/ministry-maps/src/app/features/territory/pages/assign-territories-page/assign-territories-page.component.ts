import { Component, OnInit } from '@angular/core';
import { green200, white200 } from '@kingdom-apps/common';

import { Territory } from '../../../../../models/territory';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';


@Component({
  selector: 'kingdom-apps-assign-territories-page',
  templateUrl: './assign-territories-page.component.html',
  styleUrls: ['./assign-territories-page.component.scss'],
})
export class AssignTerritoriesPageComponent implements OnInit {

  public readonly green200 = green200;
  public readonly white200 = white200;
  public readonly ALL_OPTION = 'ALL'

  cities: string[] = [];
  selectedCity = '';
  territoriesModel = new Set<string>();
  territories: Territory[] = [];

  constructor(
    private readonly territoryRepository: TerritoryRepository,
    private readonly userState: UserStateService
  ) { }

  ngOnInit(): void {
    const { id, cities } = this.userState.currentUser!.congregation!;
    const firstCity = cities.length >= 0 ? cities[0] : '';

    this.selectedCity = firstCity;
    this.cities = cities;

    this.fetchTerritories(id, firstCity);
  }

  private fetchTerritories(congregationId: string, city: string) {
    const territories$ = city === this.ALL_OPTION
      ? this.territoryRepository.getAllByCongregation(congregationId)
      : this.territoryRepository.getAllByCongregationAndCity(congregationId, city);

    territories$.subscribe(territories => {
      // This is the object that will be iterated, since we can't iterate through formGroup.controls...
      this.territories = territories;
    })
  }

  handleTerritoryFormSubmit() {
    console.log(this.territoriesModel);
  }

  handleSelectedCityChange(city: string) {
    this.fetchTerritories(this.userState.currentUser!.congregation!.id, city)
  }

  handleTerritoryCheck(value: boolean, territoryId: string) {
    value ? this.territoriesModel.add(territoryId) : this.territoriesModel.delete(territoryId)
  }

  trackByRepositoryId(_: number, item: Territory) {
    return item.id;
  }
}
