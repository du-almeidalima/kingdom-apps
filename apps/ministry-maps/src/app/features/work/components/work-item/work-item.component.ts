import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';

import { grey400, Icons, primaryGreen } from '@kingdom-apps/common';

import { TerritoryIcon } from '../../../../../models/territory';
import {
  WorkItemCompleteDialogComponent,
  WorkItemCompleteDialogData,
} from '../work-item-complete-dialog/work-item-complete-dialog.component';
import { DesignationTerritory } from '../../../../../models/designation';
import { DesignationStatusEnum } from '../../../../../models/enums/designation-status';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { BrowserEnum, getAgentBrowser } from '../../../../shared/utils/user-agent';
import { WorkItemHistoryDialogComponent } from '../work-item-history-dialog/work-item-history-dialog.component';

@Component({
  selector: 'kingdom-apps-work-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./work-item.component.scss'],
  template: `
    <div class="work-item">
      <!-- Checkbox -->
      <label
        class="work-item__checkbox-container"
        title="Concluir visita"
        [ngClass]="{ 'work-item__checkbox-container--disabled': done }"
        [for]="territory.id">
        <input
          class="work-item__checkbox"
          type="checkbox"
          [id]="territory.id"
          [checked]="territory.status === DesignationStatusEnum.DONE"
          [disabled]="done"
          (click)="handleCheck($event)" />
      </label>
      <!-- Content -->
      <div class="work-item__container">
        <div class="work-item__icon-container">
          <lib-icon class="work-item__icon" [fillColor]="iconColor" [icon]="icon"></lib-icon>
        </div>
        <div class="work-item__address-container">
          <h3 class="work-item__address-street">{{ territory.address }}</h3>
          <span class="work-item__address-city">{{ territory.city }}</span>
        </div>
        <div class="work-item__buttons-container">
          <button class="work-item__button" *ngIf="territory.mapsLink" (click)="handleOpenMaps(territory.mapsLink)">
            <lib-icon [fillColor]="buttonIconColor" icon="map-5"></lib-icon>
          </button>
          <button class="work-item__button" *ngIf="territory.history && territory.history.length > 0">
            <lib-icon [fillColor]="buttonIconColor" icon="time-17" (click)="handleOpenHistory()"></lib-icon>
          </button>
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

  constructor(private readonly dialog: Dialog) {}

  @Input()
  territory!: DesignationTerritory;

  @Input()
  done = false;

  @Output()
  territoryUpdated = new EventEmitter<DesignationTerritory>();

  ngOnInit(): void {
    this.icon = this.territoryIconToIcon(this.territory.icon);
  }

  territoryIconToIcon(territoryIcon: TerritoryIcon): Icons {
    switch (territoryIcon) {
      case TerritoryIcon.MAN:
        return 'generation-3';
      case TerritoryIcon.WOMAN:
        return 'generation-12';
      default:
        return 'generation-3';
    }
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
    const agentBrowser = getAgentBrowser();

    if (agentBrowser === BrowserEnum.CHROME) {
      window.open(mapsLink);
    } else if (agentBrowser === BrowserEnum.SAMSUNG) {
      const mapsUrl = new URL(mapsLink);
      const mapsHostAndPathname = mapsUrl.host + mapsUrl.pathname;
      const mapsAndroidPackage = 'com.google.android.apps.maps';
      window.open(
        `intent://${mapsHostAndPathname}?entry=s&sa=X#Intent;scheme=http;package=${mapsAndroidPackage};` +
          `S.browser_fallback_url=${mapsLink}%3Fentry%3Ds&sa%3DX;` +
          `S.intent_description=${this.territory.address};end`
      );
    } else if (BrowserEnum.FIREFOX || BrowserEnum.SAFARI || BrowserEnum.UNKNOWN) {
      window.open(mapsLink, '_blank');
    }
  }

  handleOpenHistory() {
    this.dialog.open<WorkItemHistoryDialogComponent, TerritoryVisitHistory[]>(WorkItemHistoryDialogComponent, {
      data: this.territory.history ?? [],
    });
  }
}
