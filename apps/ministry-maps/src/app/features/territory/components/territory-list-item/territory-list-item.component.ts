import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Territory } from '../../../../../models/territory';
import { grey400, Icons, red300 } from '@kingdom-apps/common-ui';
import mapTerritoryIcon, { isIconLarge } from '../../../../shared/utils/territory-icon-mapper';

@Component({
  selector: 'kingdom-apps-territory-list-item',
  styleUrls: ['./territory-list-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="territory-list-item" [ngClass]="{ 'territory-list-item--row-gap': !!territory.note }">
      <lib-icon
        class="territory-list-item__icon"
        [ngClass]="{ 'territory-list-item__icon--large': isIconLarge }"
        [fillColor]="iconColor"
        [icon]="icon" />
      <h3 class="territory-list-item__address">
        <span class="t-body2">{{ territory.address }}</span>
        <span class="t-caption">{{ territory.city }}</span>
      </h3>
      <div class="territory-list-item__notes" *ngIf="territory.note">
        <span class="t-caption">Notas: {{ territory.note }}</span>
      </div>
      <div class="territory-list-item__buttons-container">
        <button class="list-item-button" type="button" (click)="edit.emit(territory)">
          <lib-icon [fillColor]="editButtonColor" icon="pencil-lined"></lib-icon>
        </button>
        <button class="list-item-button" type="button" (click)="remove.emit(territory.id)">
          <lib-icon [fillColor]="deleteButtonColor" icon="trash-can-lined"></lib-icon>
        </button>
      </div>
    </div>
  `,
})
export class TerritoryListItemComponent implements OnInit {
  public editButtonColor = grey400;
  public deleteButtonColor = red300;
  public iconColor = grey400;
  public isIconLarge = false;
  public icon: Icons = 'generation-3';

  @Input()
  territory!: Territory;

  @Output()
  edit = new EventEmitter<Territory>();

  @Output()
  remove = new EventEmitter<string>();

  ngOnInit(): void {
    this.icon = mapTerritoryIcon(this.territory.icon);
    this.isIconLarge = isIconLarge(this.icon);
  }
}
