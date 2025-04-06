import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  AuthorizeDirective,
  grey400,
  IconButtonComponent,
  IconComponent,
  Icons,
  red300,
} from '@kingdom-apps/common-ui';
import { Territory } from '../../../../../models/territory';
import mapTerritoryIcon, { isIconLarge } from '../../../../shared/utils/territory-icon-mapper';
import { TerritoryAlertsBO } from '../../bo/territory-alerts.bo';
import { EDIT_ALLOWED } from '../../config/territory-roles.config';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { VisitOutcomeToIconPipe } from '../../../../shared/pipes/visit-outcome-to-icon/visit-outcome-to-icon.pipe';
import { NgClass } from '@angular/common';

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
        <span class="t-caption text-gray-600">{{ territory.city }}
          @if(territory.peopleQuantity){
            , {{ territory.peopleQuantity }} pessoa(s)
          }</span>
      </h3>
      <!-- BADGES -->
      @if (territory.note) {
        <div class="territory-list-item__notes">
          <span class="t-caption">Notas: {{ territory.note }}</span>
          @if (hasRecentlyMoved) {
            <span class="territory-alert-badge territory-alert-badge--moved" title="Essa pessoa se mudou"> Mudou </span>
          }
          @if (hasRecentlyRevisit) {
            <span
              class="territory-alert-badge territory-alert-badge--revisit"
              title="Essa pessoa foi marcada como revisita recentemente">
          Revisita
        </span>
          }
          @if (hasRecentlyAskedToStopVisiting) {
            <span
              class="territory-alert-badge territory-alert-badge--stop-visiting"
              title="Essa pessoa disse que não quer ser visitada por uma Testemunha de Jeová">
          Não quer visitas
        </span>
          }
          @if (isBibleStudent) {
            <span
              class="territory-alert-badge territory-alert-badge--bible-student"
              title="Essa pessoa é um estudante da Bíblia">
          Estudante
        </span>
          }
        </div>
      }
      <!-- RIGHT SIDE MENU -->
      <div class="territory-list-item__menu-button">
        <!-- VERTICAL MENU -->
        <button lib-icon-button [cdkMenuTriggerFor]="menu" type="button">
          <lib-icon [fillColor]="greyButtonColor" icon="menu-dot-vertical-filled"></lib-icon>
        </button>

        <ng-template #menu>
          <menu class="menu" cdkMenu>
            <li
              class="menu__item"
              cdkMenuItem
              (cdkMenuItemTriggered)="edit.emit(territory)"
              *libAuthorize="EDIT_ALLOWED">
              <button lib-icon-button type="button">
                <lib-icon [fillColor]="greyButtonColor" icon="pencil-lined"></lib-icon>
              </button>
              <span>Editar</span>
            </li>
            <li class="menu__item" cdkMenuItem (cdkMenuItemTriggered)="history.emit(territory)">
              <button lib-icon-button type="button">
                <lib-icon [fillColor]="greyButtonColor" icon="time-17"></lib-icon>
              </button>
              <span>Histórico</span>
            </li>
            <!-- ALERTS -->
            <ng-container *libAuthorize="EDIT_ALLOWED">
              <!-- SEPARATOR -->
              @if (hasAlerts) {
                <hr class="menu__separator" />
              }
              <!-- MOVED ALERT -->
              @if (hasRecentlyMoved) {
                <li class="menu__item" cdkMenuItem (cdkMenuItemTriggered)="resolveMove.emit(territory)">
                  <button lib-icon-button type="button">
                    <lib-icon
                      [fillColor]="greyButtonColor"
                      [icon]="VisitOutcomeEnum.MOVED | visitOutcomeToIcon"></lib-icon>
                  </button>
                  <span>Mudou</span>
                </li>
              }
              <!-- REVISIT ALERT -->
              @if (hasRecentlyRevisit) {
                <li class="menu__item" cdkMenuItem (cdkMenuItemTriggered)="resolveRevisit.emit(territory)">
                  <button lib-icon-button type="button">
                    <lib-icon
                      [fillColor]="greyButtonColor"
                      [icon]="VisitOutcomeEnum.REVISIT | visitOutcomeToIcon"></lib-icon>
                  </button>
                  <span>Revisita</span>
                </li>
              }
              <!-- REVISIT ALERT -->
              @if (hasRecentlyAskedToStopVisiting) {
                <li class="menu__item" cdkMenuItem (cdkMenuItemTriggered)="resolveStopVisiting.emit(territory)">
                  <button lib-icon-button type="button">
                    <lib-icon
                      [fillColor]="greyButtonColor"
                      [icon]="VisitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN | visitOutcomeToIcon"></lib-icon>
                  </button>
                  <span>Não Visitar</span>
                </li>
              }
            </ng-container>
            <!-- SEPARATOR -->
            <hr class="menu__separator" *libAuthorize="EDIT_ALLOWED" />
            <li
              class="menu__item"
              cdkMenuItem
              (cdkMenuItemTriggered)="remove.emit(territory.id)"
              *libAuthorize="EDIT_ALLOWED">
              <button lib-icon-button cdkMenuItem type="button">
                <lib-icon [fillColor]="deleteButtonColor" icon="trash-can-lined"></lib-icon>
              </button>
              <span class="text-red-500">Apagar</span>
            </li>
          </menu>
        </ng-template>
        <!-- DRAG HANDLE -->
        <ng-content></ng-content>
      </div>
    </div>
  `,
  imports: [
    IconComponent,
    CdkMenuItem,
    AuthorizeDirective,
    VisitOutcomeToIconPipe,
    IconButtonComponent,
    CdkMenu,
    CdkMenuTrigger,
    NgClass,
  ],
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
