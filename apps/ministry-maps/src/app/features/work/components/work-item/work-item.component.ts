import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
  grey200,
  grey400,
  Icons,
  primaryGreen,
  white200,
} from '@kingdom-apps/common-ui';
import {
  WorkItemCompleteDialogComponent,
  WorkItemCompleteDialogData,
} from '../work-item-complete-dialog/work-item-complete-dialog.component';
import { DesignationTerritory } from '../../../../../models/designation';
import { DesignationStatusEnum } from '../../../../../models/enums/designation-status';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { HistoryDialogComponent } from '../../../../shared/components/dialogs';
import openGoogleMapsHandler from '../../../../shared/utils/open-google-maps';
import mapTerritoryIcon, { isIconLarge } from '../../../../shared/utils/territory-icon-mapper';

@Component({
  selector: 'kingdom-apps-work-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./work-item.component.scss'],
  template: `
    <div class="work-item">
      <!-- Checkbox -->
      <label
        class="work-item__checkbox-container"
        [title]="done ? 'Apagar Visita' : 'Concluir visita'"
        [ngClass]="{ 'work-item__checkbox-container--disabled': done }"
        [for]="territory.id">
        @if (done) {
          <button lib-icon-button
                  type="button"
                  [hoverBackgroundColor]="disabledButtonBackgroundColor"
                  (click)="handleUndo()"
          >
            <lib-icon [fillColor]="whiteButtonColor" icon="eraser-2"></lib-icon>
          </button>
        } @else {
          <input class="work-item__checkbox" type="checkbox" [id]="territory.id" (click)="handleCheck($event)" />
        }
      </label>
      <!-- Content -->
      <div class="work-item__content-container">
        <!-- List Tile -->
        <div class="work-item__list-tile">
          <!-- Icon -->
          <lib-icon
            class="work-item__icon"
            [ngClass]="{ 'work-item__icon--large': isIconLarge }"
            [fillColor]="iconColor"
            [icon]="icon" />
          <!-- Title and Subtitle -->
          <div class="work-item__title-subtitle-container">
            <h3 class="work-item__title">{{ territory.address }}</h3>
            <span class="work-item__subtitle">{{ territory.note }}</span>
          </div>
        </div>
        <!-- Footer -->
        <div class="work-item__footer">
          <span class="work-item__city">{{ territory.city }}</span>
          <div class="work-item__buttons-container">
            <button lib-icon-button *ngIf="territory.status === DesignationStatusEnum.DONE" (click)="handleEdit()">
              <lib-icon [fillColor]="buttonIconColor" icon="pencil-lined" />
            </button>
            <button lib-icon-button *ngIf="territory.mapsLink" (click)="handleOpenMaps(territory.mapsLink)">
              <lib-icon [fillColor]="buttonIconColor" icon="map-5" />
            </button>
            <button
              lib-icon-button
              *ngIf="territory.history && territory.history.length > 0"
              (click)="handleOpenHistory()">
              <lib-icon [fillColor]="buttonIconColor" icon="time-17" />
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class WorkItemComponent implements OnInit {
  protected readonly DesignationStatusEnum = DesignationStatusEnum;
  protected readonly whiteButtonColor = white200;
  protected readonly disabledButtonBackgroundColor = grey200;
  protected readonly buttonIconColor = primaryGreen;
  protected readonly iconColor = grey400;

  public icon: Icons = 'generation-3';
  public isIconLarge = false;

  @Input()
  territory!: DesignationTerritory;
  @Input()
  done = false;
  @Output()
  territoryUpdated = new EventEmitter<DesignationTerritory>();
  @Output()
  lastVisitReverted = new EventEmitter<DesignationTerritory>();

  constructor(private readonly dialog: Dialog) {}

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
        const nowDate = new Date();

        const historyEntry: TerritoryVisitHistory = {
          ...data,
          date: nowDate,
          id: nowDate.getTime().toString(),
        };

        const updateDesignationTerritory: DesignationTerritory = {
          ...this.territory,
          status: DesignationStatusEnum.DONE,
          history: [...(this.territory.history ?? []), historyEntry],
          lastVisit: nowDate,
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

  handleEdit() {
    const lastHistoryEntry = this.territory.history?.slice().reverse()[0];

    this.dialog
      .open<WorkItemCompleteDialogData>(WorkItemCompleteDialogComponent, {
        data: { ...lastHistoryEntry },
      })
      .closed.subscribe(data => {
        if (data) {
          const historyEntry: TerritoryVisitHistory = {
            ...data,
            // When editing, those values should be the same as the last history entry
            // Even though it checks for null values, it should not be possible to have a null value in the last history entry
            date: lastHistoryEntry?.date ?? new Date(),
            id: lastHistoryEntry?.id ?? new Date().getTime().toString(),
          };

          // Update last history entry
          const historyWithoutLastEntry = this.territory.history?.slice(0, -1) ?? [];

          const updatedDesignationTerritory: DesignationTerritory = {
            ...this.territory,
            history: [...historyWithoutLastEntry, historyEntry],
          };

          this.territoryUpdated.emit(updatedDesignationTerritory);
        }
      });
  }

  handleUndo() {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData>(ConfirmDialogComponent, {
        data: {
          title: 'Apagar Visita',
          bodyText: `
            <p>Você gostaria de apagar essa visita?</p>
            <p class='mt-5'>Isso vai apagar todos os dados que você preencheu.</p>
          `,
        },
      })
      .closed.subscribe(res => {
        if (res) {
          this.lastVisitReverted.emit(this.territory);
        }
      });
  }
}
