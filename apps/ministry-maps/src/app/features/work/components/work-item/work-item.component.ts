import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
  IconButtonComponent,
  IconComponent,
  Icons,
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
import { NgClass } from '@angular/common';

@Component({
  selector: 'kingdom-apps-work-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./work-item.component.scss'],
  template: `
    <div class="work-item" data-testid="work-item">
      <!-- Checkbox -->
      <label
        class="work-item__checkbox-container"
        [title]="done ? 'Apagar Visita' : 'Concluir visita'"
        [ngClass]="{ 'work-item__checkbox-container--disabled': done || disabled }"
        [for]="territory.id"
      >
        @if (done) {
          <button
            lib-icon-button
            type="button"
            data-testid="work-item-undo"
            [disabled]="disabled"
            [hoverBackgroundColor]="disabledButtonBackgroundColor"
            (click)="handleUndo()"
          >
            <lib-icon [fillColor]="disabled ? disabledLight : whiteButtonColor" icon="eraser-2"></lib-icon>
          </button>
        } @else {
          <input
            class="work-item__checkbox"
            type="checkbox"
            data-testid="work-item-checkbox"
            [id]="territory.id"
            [disabled]="disabled"
            (click)="handleCheck($event)"
          />
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
            [icon]="icon"
          />
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
            @if (territory.status === DesignationStatusEnum.DONE) {
              <button lib-icon-button data-testid="work-item-edit" [disabled]="disabled" (click)="handleEdit()">
                <lib-icon [fillColor]="disabled ? disabledColor : buttonIconColor" icon="pencil-lined" />
              </button>
            }
            @if (territory.mapsLink) {
              <button
                lib-icon-button
                data-testid="work-item-maps"
                [disabled]="blocked"
                (click)="handleOpenMaps(territory.mapsLink)"
              >
                <lib-icon [fillColor]="blocked ? disabledColor : buttonIconColor" icon="map-5" />
              </button>
            }
            @if (territory.history && territory.history.length > 0) {
              <button lib-icon-button data-testid="work-item-history" (click)="handleOpenHistory()">
                <lib-icon [fillColor]="buttonIconColor" icon="time-17" />
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  imports: [IconComponent, NgClass, IconButtonComponent],
})
export class WorkItemComponent implements OnInit {
  private readonly dialog = inject(Dialog);

  protected readonly DesignationStatusEnum = DesignationStatusEnum;
  protected readonly whiteButtonColor = 'currentColor';
  protected readonly disabledButtonBackgroundColor = 'transparent';
  protected readonly disabledColor = 'var(--kui-color-text-disabled)';
  protected readonly disabledLight = 'var(--kui-color-text-disabled)';
  protected readonly buttonIconColor = 'var(--kui-color-action-primary)';
  protected readonly iconColor = 'currentColor';

  public icon: Icons = 'generation-3';
  public isIconLarge = false;

  @Input()
  territory!: DesignationTerritory;
  @Input()
  done = false;
  @Input()
  disabled = false;
  @Input()
  blocked = false;
  @Output()
  territoryUpdated = new EventEmitter<DesignationTerritory>();
  @Output()
  lastVisitReverted = new EventEmitter<DesignationTerritory>();

  ngOnInit(): void {
    this.icon = mapTerritoryIcon(this.territory.icon);
    this.isIconLarge = isIconLarge(this.icon);
  }

  handleCheck(e: MouseEvent) {
    e.preventDefault();

    if (this.done || this.disabled) {
      return;
    }

    this.dialog.open<WorkItemCompleteDialogData>(WorkItemCompleteDialogComponent).closed.subscribe((data) => {
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
    if (this.disabled) {
      return;
    }

    const lastHistoryEntry = this.territory.history?.slice().reverse()[0];

    this.dialog
      .open<WorkItemCompleteDialogData>(WorkItemCompleteDialogComponent, {
        data: { ...lastHistoryEntry },
      })
      .closed.subscribe((data) => {
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
      .closed.subscribe((res) => {
        if (res) {
          this.lastVisitReverted.emit(this.territory);
        }
      });
  }
}
