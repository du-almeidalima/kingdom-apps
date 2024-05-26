import { ChangeDetectionStrategy, Component, forwardRef, Input, OnInit } from '@angular/core';
import { Territory } from '../../../../../models/territory';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import openGoogleMapsHandler from '../../../../shared/utils/open-google-maps';
import { grey400, Icons, primaryGreen } from '@kingdom-apps/common-ui';
import { Dialog } from '@angular/cdk/dialog';
import { HistoryDialogComponent } from '../../../../shared/components/dialogs';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { TerritoryAlertsBO } from '../../bo/territory-alerts.bo';
import mapTerritoryIcon, { isIconLarge } from '../../../../shared/utils/territory-icon-mapper';

@Component({
  selector: 'kingdom-apps-territory-checkbox',
  styleUrls: ['territory-checkbox.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TerritoryCheckboxComponent),
      multi: true,
    },
  ],
  template: `
    <label
      class='territory-checkbox'
      [for]='territory.id'
      [ngClass]="{
        'territory-checkbox--disabled': disabled,
        'territory-checkbox--selected': !disabled && value
      }">
      <div class='territory-checkbox__control-container'>
        <input
          type='checkbox'
          [name]='territory.id'
          [id]='territory.id'
          [checked]='value'
          [ngModel]='value'
          [disabled]='disabled'
          hidden
          (ngModelChange)='setValue($event)' />
        <div
          class='territory-checkbox__description'
          [ngClass]="{ 'territory-checkbox__description--disabled': disabled }">
          <!-- Title and Subtitle -->
          <div class='territory-checkbox__title-subtitle-container'>
            <lib-icon
              class='territory-checkbox__icon'
              [ngClass]="{ 'territory-checkbox__icon--large': isIconLarge }"
              [fillColor]='iconColor'
              [icon]='icon' />
            <!-- Address and Note -->
            <div class='flex flex-col gap-1'>
              <h3 class='territory-checkbox__title'>{{ territory.address }}</h3>
              <span class='territory-checkbox__subtitle'>{{ territory.note }}</span>
            </div>
          </div>
          <!-- VISIT CONTAINER -->
          <div class='territory-checkbox__visit-container'>
            <span class='territory-checkbox__last-visit' *ngIf='territory.lastVisit'>
              Última visita: {{ territory.lastVisit | date : 'dd/MM/yyyy' }}
            </span>
            <!-- VISIT STATUS BADGE -->
            <span
              class='territory-alert-badge territory-alert-badge--revisit'
              title='Essa pessoa foi marcada como revisita recentemente'
              *ngIf='hasRecentRevisit'>
              Revisita
            </span>
            <span
              class='territory-alert-badge territory-alert-badge--moved'
              title='Essa pessoa se mudou'
              *ngIf='hasRecentlyMoved'>
              Mudou
            </span>
            <span
              class='territory-alert-badge territory-alert-badge--stop-visiting'
              title='Essa pessoa disse que não quer ser visitada por uma Testemunha de Jeová'
              *ngIf='hasRecentlyAskedToStopVisiting'>
              Não quer visitas
            </span>
          </div>
        </div>
        <!-- BUTTONS CONTAINER -->
        <div class='territory-checkbox__buttons-container'>
          <button
            *ngIf='territory.mapsLink'
            lib-icon-button
            type='button'
            (click)='handleOpenMaps(territory.mapsLink)'>
            <lib-icon [fillColor]='buttonIconColor' icon='map-5'></lib-icon>
          </button>
          <button *ngIf='territory.recentHistory' lib-icon-button type='button' (click)='handleOpenHistory()'>
            <lib-icon [fillColor]='buttonIconColor' icon='time-17'></lib-icon>
          </button>
        </div>
      </div>
      <span class='territory-checkbox__indicator' [ngClass]='statusClass'></span>
    </label>
  `,
})
export class TerritoryCheckboxComponent implements ControlValueAccessor, OnInit {
  protected readonly iconColor = grey400;

  buttonIconColor = primaryGreen;
  hasRecentRevisit = false;
  hasRecentlyMoved = false;
  hasRecentlyAskedToStopVisiting = false;
  icon: Icons = 'generation-3';
  isIconLarge = false;

  // Control Value Accessor
  disabled = false;
  value = false;

  @Input()
  territory!: Territory;

  get statusClass() {
    const prefix = 'territory-checkbox__indicator--';

    if (this.disabled) {
      return prefix + 'disabled';
    }

    return prefix + (this.value ? 'selected' : 'default');
  }

  constructor(private readonly dialog: Dialog) {}

  ngOnInit(): void {
    this.hasRecentRevisit = TerritoryAlertsBO.hasRecentRevisit(this.territory);
    this.hasRecentlyMoved = TerritoryAlertsBO.hasRecentlyMoved(this.territory);
    this.hasRecentlyAskedToStopVisiting = TerritoryAlertsBO.hasRecentlyAskedToStopVisiting(this.territory);
    this.icon = mapTerritoryIcon(this.territory.icon);
    this.isIconLarge = isIconLarge(this.icon);
  }

  // Resolve style indicator
  onTouched: () => void = () => {
    return;
  };

  onChange: (value: boolean) => void = () => {
    return;
  };

  registerOnChange(fn: TerritoryCheckboxComponent['onChange']): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: TerritoryCheckboxComponent['onTouched']): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  writeValue(value: boolean): void {
    this.value = value;
  }

  setValue(value: boolean) {
    if (this.disabled) {
      return;
    }

    this.value = value;

    this.onChange(value);
    this.onTouched();
  }

  // Maybe the handleOpenMaps and handleOpenHistory should not be part of this component
  handleOpenMaps(mapsLink: string) {
    openGoogleMapsHandler(mapsLink, this.territory);
  }

  handleOpenHistory() {
    this.dialog.open<HistoryDialogComponent, TerritoryVisitHistory[]>(HistoryDialogComponent, {
      data: this.territory.recentHistory?.slice().reverse(),
    });
  }
}
