import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { grey400, Icons, red300 } from '@kingdom-apps/common-ui';
import { Territory } from '../../../../../models/territory';
import mapTerritoryIcon, { isIconLarge } from '../../../../shared/utils/territory-icon-mapper';
import { TerritoryAlertsBO } from '../../bo/territory-alerts.bo';

@Component({
  selector: 'kingdom-apps-territory-list-item',
  styleUrls: ['./territory-list-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class='territory-list-item' [ngClass]="{ 'territory-list-item--row-gap': !!territory.note }">
      <lib-icon
        class='territory-list-item__icon'
        [ngClass]="{ 'territory-list-item__icon--large': isIconLarge }"
        [fillColor]='iconColor'
        [icon]='icon' />
      <h3 class='territory-list-item__address'>
        <span class='t-body2'>{{ territory.address }}</span>
        <span class='t-caption text-gray-600'>{{ territory.city }}</span>
      </h3>
      <!-- BADGES -->
      <div class='territory-list-item__notes' *ngIf='territory.note'>
        <span class='t-caption'>Notas: {{ territory.note }}</span>
        <span
          class='territory-alert-badge territory-alert-badge--moved'
          title='Essa pessoa se mudou'
          *ngIf='hasRecentlyMoved'>
              Mudou
        </span>
      </div>
      <!-- RIGHT SIDE MENU -->
      <div class='territory-list-item__menu-button'>
        <!-- VERTICAL MENU -->
        <button lib-icon-button [cdkMenuTriggerFor]='menu' type='button'>
          <lib-icon [fillColor]='greyButtonColor' icon='menu-dot-vertical-filled'></lib-icon>
        </button>

        <ng-template #menu>
          <menu class='menu' cdkMenu>
            <li class='menu__item' cdkMenuItem (cdkMenuItemTriggered)='edit.emit(territory)'>
              <button lib-icon-button type='button'>
                <lib-icon [fillColor]='greyButtonColor' icon='pencil-lined'></lib-icon>
              </button>
              <span>Editar</span>
            </li>
            <li class='menu__item' cdkMenuItem (cdkMenuItemTriggered)='history.emit(territory)'>
              <button lib-icon-button type='button'>
                <lib-icon [fillColor]='greyButtonColor' icon='time-17'></lib-icon>
              </button>
              <span>Histórico</span>
            </li>
            <!-- SEPARATOR -->
            <hr class='menu__separator' *ngIf='hasRecentlyMoved'>
            <!-- ALERTS -->
            <li class='menu__item'
                cdkMenuItem
                (cdkMenuItemTriggered)='resolveMove.emit(territory)'
                *ngIf='hasRecentlyMoved'
            >
              <button lib-icon-button type='button'>
                <lib-icon [fillColor]='greyButtonColor' icon='building-8'></lib-icon>
              </button>
              <span>Mudou</span>
            </li>
            <!-- SEPARATOR -->
            <hr class='menu__separator'>
            <li class='menu__item' cdkMenuItem (cdkMenuItemTriggered)='remove.emit(territory.id)'>
              <button lib-icon-button cdkMenuItem type='button'>
                <lib-icon [fillColor]='deleteButtonColor' icon='trash-can-lined'></lib-icon>
              </button>
              <span class='text-red-500'>Apagar</span>
            </li>
          </menu>
        </ng-template>
        <!-- DRAG HANDLE -->
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class TerritoryListItemComponent implements OnInit {
  public greyButtonColor = grey400;
  public deleteButtonColor = red300;
  public iconColor = grey400;
  public isIconLarge = false;
  public icon: Icons = 'generation-3';
  public hasRecentlyMoved = false;

  @Input()
  territory!: Territory;

  @Output()
  edit = new EventEmitter<Territory>();

  @Output()
  history = new EventEmitter<Territory>();

  @Output()
  remove = new EventEmitter<string>();

  @Output()
  resolveMove = new EventEmitter<Territory>();

  ngOnInit(): void {
    this.icon = mapTerritoryIcon(this.territory.icon);
    this.isIconLarge = isIconLarge(this.icon);

    this.hasRecentlyMoved = TerritoryAlertsBO.hasRecentlyMoved(this.territory);
  }
}
