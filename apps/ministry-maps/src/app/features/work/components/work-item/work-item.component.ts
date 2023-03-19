import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';

import { grey400, Icons, primaryGreen } from '@kingdom-apps/common-ui';
import {
  WorkItemCompleteDialogComponent,
  WorkItemCompleteDialogData,
} from '../work-item-complete-dialog/work-item-complete-dialog.component';
import { DesignationTerritory } from '../../../../../models/designation';
import { DesignationStatusEnum } from '../../../../../models/enums/designation-status';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { HistoryDialogComponent } from '../../../../shared/components/dialogs';
import openGoogleMapsHandler from '../../../../shared/utils/open-google-maps';
import mapTerritoryIcon, {isIconLarge} from '../../../../shared/utils/territory-icon-mapper';

@Component({
  selector: 'kingdom-apps-work-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./work-item.component.scss'],
  template: `
    <div class='work-item'>
      <!-- Checkbox -->
      <label
        class='work-item__checkbox-container'
        title='Concluir visita'
        [ngClass]="{ 'work-item__checkbox-container--disabled': done }"
        [for]='territory.id'>
        <input
          class='work-item__checkbox'
          type='checkbox'
          [id]='territory.id'
          [checked]='territory.status === DesignationStatusEnum.DONE'
          [disabled]='done'
          (click)='handleCheck($event)' />
      </label>
      <!-- Content -->
      <div class='work-item__content-container'>
        <!-- List Tile -->
        <div class='work-item__list-tile'>
          <!-- Icon -->
          <lib-icon
            class='work-item__icon'
            [ngClass]="{ 'work-item__icon--large': isIconLarge }"
            [fillColor]='iconColor'
            [icon]='icon' />
          <!-- Title and Subtitle -->
          <div class='work-item__title-subtitle-container'>
            <h3 class='work-item__title'>{{ territory.address }}</h3>
            <span class='work-item__subtitle'>{{ territory.note }}</span>
          </div>
        </div>
        <!-- Footer -->
        <div class='work-item__footer'>
          <span class='work-item__city'>{{ territory.city }}</span>
          <div class='work-item__buttons-container'>
            <button class='list-item-button' *ngIf='territory.mapsLink' (click)='handleOpenMaps(territory.mapsLink)'>
              <lib-icon [fillColor]='buttonIconColor' icon='map-5'></lib-icon>
            </button>
            <button class='list-item-button' *ngIf='territory.history && territory.history.length > 0'>
              <lib-icon [fillColor]='buttonIconColor' icon='time-17' (click)='handleOpenHistory()'></lib-icon>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class WorkItemComponent implements OnInit {
  public readonly DesignationStatusEnum = DesignationStatusEnum;
  public buttonIconColor = primaryGreen;
  public iconColor = grey400;
  public icon: Icons = 'generation-3';
  public isIconLarge = false;

  constructor(private readonly dialog: Dialog) {}

  @Input()
  territory!: DesignationTerritory;

  @Input()
  done = false;

  @Output()
  territoryUpdated = new EventEmitter<DesignationTerritory>();

  ngOnInit(): void {
    this.icon = mapTerritoryIcon(this.territory.icon);
    this.isIconLarge = isIconLarge(this.icon);
  }

  handleCheck(e: MouseEvent) {
    e.preventDefault();

    if (this.done) {
      return;
    }

    this.dialog.open<WorkItemCompleteDialogData>(WorkItemCompleteDialogComponent).closed.subscribe(data => {
      if (data) {
        const historyEntry: TerritoryVisitHistory = {
          ...data,
          date: new Date(),
          id: new Date().getTime().toString(),
        };

        const updateDesignationTerritory: DesignationTerritory = {
          ...this.territory,
          status: DesignationStatusEnum.DONE,
          history: [...(this.territory.history ?? []), historyEntry],
        };

        this.territoryUpdated.emit(updateDesignationTerritory);
      }
    });
  }

  handleOpenMaps(mapsLink: string) {
    openGoogleMapsHandler(mapsLink, this.territory);
  }

  handleOpenHistory() {
    this.dialog.open<HistoryDialogComponent, TerritoryVisitHistory[]>(HistoryDialogComponent, {
      data: this.territory.history?.slice().reverse() ?? [],
    });
  }
}
