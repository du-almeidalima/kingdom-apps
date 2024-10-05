import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { grey400, Icons, red300 } from '@kingdom-apps/common-ui';
import { Territory } from '../../../../../models/territory';
import mapTerritoryIcon, { isIconLarge } from '../../../../shared/utils/territory-icon-mapper';
import { TerritoryAlertsBO } from '../../bo/territory-alerts.bo';
import { EDIT_ALLOWED } from '../../config/territory-roles.config';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';

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
        <span
          class='territory-alert-badge territory-alert-badge--revisit'
          title='Essa pessoa foi marcada como revisita recentemente'
          *ngIf='hasRecentlyRevisit'>
              Revisita
        </span>
        <span
          class='territory-alert-badge territory-alert-badge--stop-visiting'
          title='Essa pessoa disse que não quer ser visitada por uma Testemunha de Jeová'
          *ngIf='hasRecentlyAskedToStopVisiting'>
              Não quer visitas
        </span>
        <span
          class='territory-alert-badge territory-alert-badge--bible-student'
          title='Essa pessoa é um estudante da Bíblia'
          *ngIf='isBibleStudent'>
              Estudante
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
            <li class='menu__item' cdkMenuItem (cdkMenuItemTriggered)='edit.emit(territory)' *lib-authorize="EDIT_ALLOWED">
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
            <!-- ALERTS -->
            <ng-container *lib-authorize="EDIT_ALLOWED">
              <!-- SEPARATOR -->
              <hr class='menu__separator' *ngIf='hasAlerts'>

              <!-- MOVED ALERT -->
              <li class='menu__item'
                  cdkMenuItem
                  (cdkMenuItemTriggered)='resolveMove.emit(territory)'
                  *ngIf='hasRecentlyMoved'
              >
                <button lib-icon-button type='button'>
                  <lib-icon [fillColor]='greyButtonColor' [icon]="VisitOutcomeEnum.MOVED | visitOutcomeToIcon"></lib-icon>
                </button>
                <span>Mudou</span>
              </li>
              <!-- REVISIT ALERT -->
              <li class='menu__item'
                  cdkMenuItem
                  (cdkMenuItemTriggered)='resolveRevisit.emit(territory)'
                  *ngIf='hasRecentlyRevisit'
              >
                <button lib-icon-button type='button'>
                  <lib-icon [fillColor]='greyButtonColor' [icon]="VisitOutcomeEnum.REVISIT | visitOutcomeToIcon"></lib-icon>
                </button>
                <span>Revisita</span>
              </li>
              <!-- REVISIT ALERT -->
              <li class='menu__item'
                  cdkMenuItem
                  (cdkMenuItemTriggered)='resolveStopVisiting.emit(territory)'
                  *ngIf='hasRecentlyAskedToStopVisiting'
              >
                <button lib-icon-button type='button'>
                  <lib-icon [fillColor]='greyButtonColor' [icon]="VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN | visitOutcomeToIcon"></lib-icon>
                </button>
                <span>Não Visitar</span>
              </li>
            </ng-container>
            <!-- SEPARATOR -->
            <hr class='menu__separator' *lib-authorize="EDIT_ALLOWED">
            <li class='menu__item' cdkMenuItem (cdkMenuItemTriggered)='remove.emit(territory.id)' *lib-authorize="EDIT_ALLOWED">
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
  protected readonly EDIT_ALLOWED = EDIT_ALLOWED;
  protected readonly VisitOutcomeEnum = VisitOutcomeEnum;

  public greyButtonColor = grey400;
  public deleteButtonColor = red300;
  public iconColor = grey400;
  public isIconLarge = false;
  public icon: Icons = 'generation-3';
  public hasRecentlyMoved = false;
  public hasRecentlyRevisit = false;
  public hasRecentlyAskedToStopVisiting = false;
  public isBibleStudent = false;
  public hasAlerts = false;

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

  @Output()
  resolveRevisit = new EventEmitter<Territory>();

  @Output()
  resolveStopVisiting = new EventEmitter<Territory>();

  ngOnInit(): void {
    this.icon = mapTerritoryIcon(this.territory.icon);
    this.isIconLarge = isIconLarge(this.icon);

    this.hasRecentlyMoved = TerritoryAlertsBO.hasRecentlyMoved(this.territory);
    this.hasRecentlyRevisit = TerritoryAlertsBO.hasRecentRevisit(this.territory);
    this.hasRecentlyAskedToStopVisiting = TerritoryAlertsBO.hasRecentlyAskedToStopVisiting(this.territory);
    this.isBibleStudent = TerritoryAlertsBO.isBibleStudent(this.territory);

    this.hasAlerts = this.hasRecentlyMoved || this.hasRecentlyRevisit || this.hasRecentlyAskedToStopVisiting;
  }
}
