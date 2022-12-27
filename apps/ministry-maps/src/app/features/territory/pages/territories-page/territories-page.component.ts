import { Component, OnInit } from '@angular/core';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { map, Observable, of, tap } from 'rxjs';
import { Territory } from '../../../../../models/territory';
import { green200, white200 } from '@kingdom-apps/common-ui';
import { Dialog } from '@angular/cdk/dialog';
import {
  TerritoryDialogData,
  TerritoryManageDialogComponent,
} from '../../components/territory-manage-dialog/territory-manage-dialog.component';

@Component({
  selector: 'kingdom-apps-territories-page',
  templateUrl: './territories-page.component.html',
  styleUrls: ['./territories-page.component.scss'],
})
export class TerritoriesPageComponent implements OnInit {
  public readonly green200 = green200;
  public readonly white200 = white200;
  public readonly ALL_OPTION = 'ALL';

  private $territories: Observable<Territory[]> = of([]);
  public cities: string[] = [];
  public selectedCity = this.ALL_OPTION;
  public isLoading = false;
  public $filteredTerritories: Observable<Territory[]> = of([]);

  constructor(
    private readonly territoryRepository: TerritoryRepository,
    private readonly userState: UserStateService,
    public dialog: Dialog
  ) {}

  ngOnInit(): void {
    const userCongregationId = this.userState.currentUser?.congregation?.id;
    this.cities = this.userState.currentUser?.congregation?.cities ?? [];
    this.isLoading = true;

    this.$territories = this.territoryRepository.getAllByCongregation(userCongregationId ?? '').pipe(
      tap(() => {
        this.isLoading = false;
      })
    );
    this.$filteredTerritories = this.$territories.pipe(map(tArr => tArr));
  }

  handleOpenDialog(territory?: Territory) {
    this.dialog.open<object, TerritoryDialogData>(TerritoryManageDialogComponent, {
      data: {
        territory,
        cities: this.userState.currentUser?.congregation?.cities ?? [],
        congregationId: this.userState.currentUser?.congregation?.id ?? '',
      },
    });
  }

  handleSelectedCityChange(city: string) {
    this.$filteredTerritories = this.$territories.pipe(
      map(tArr => {
        if (city === this.ALL_OPTION) {
          return [...tArr];
        }

        return tArr.filter(t => t.city === city);
      })
    );
  }
}
