import { Component, OnInit } from '@angular/core';
import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { UserStateService } from '../../../../state/user.state.service';
import { Observable, of } from 'rxjs';
import { Territory } from '../../../../../models/territory';
import { green200, white200 } from '@kingdom-apps/common';
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

  public isLoading = false;
  public $territories: Observable<Territory[]> = of([]);

  constructor(
    private readonly territoryRepository: TerritoryRepository,
    private readonly userState: UserStateService,
    public dialog: Dialog
  ) {}

  ngOnInit(): void {
    const userCongregationId = this.userState.currentUser?.congregation?.id;

    this.$territories = this.territoryRepository.getAllByCongregation(userCongregationId ?? '');
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
}
