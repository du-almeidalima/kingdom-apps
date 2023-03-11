import { ChangeDetectionStrategy, Component, forwardRef, Input } from '@angular/core';
import { Territory } from '../../../../../models/territory';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import openGoogleMapsHandler from '../../../../shared/utils/open-google-maps';
import { primaryGreen } from '@kingdom-apps/common-ui';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { Dialog } from '@angular/cdk/dialog';
import { HistoryDialogComponent } from '../../../../shared/components/dialogs';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';

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
          <p>{{ territory.address }}</p>
          <!-- VISIT CONTAINER -->
          <div class='territory-checkbox__visit-container'>
            <span class='territory-checkbox__last-visit' *ngIf='territory.lastVisit'>
              Última visita: {{ territory.lastVisit | date : 'dd/MM/yyyy' }}
            </span>
            <!-- VISIT STATUS BADGE -->
            <span
              class='territory-checkbox__visit-badge territory-checkbox__visit-badge--revisit'
              title='Essa pessoa foi revisitada recentemente'
              *ngIf='hasRecentlyVisited'>
              Revisita
            </span>
            <span
              class='territory-checkbox__visit-badge territory-checkbox__visit-badge--moved'
              title='Essa pessoa se mudou'
              *ngIf='hasRecentlyMoved'>
              Mudou
            </span>
          </div>
        </div>
        <!-- BUTTONS CONTAINER -->
        <div class='territory-checkbox__buttons-container'>
          <button *ngIf='territory.mapsLink'
                  class='list-item-button'
                  type='button'
                  (click)='handleOpenMaps(territory.mapsLink)'
          >
            <lib-icon [fillColor]='buttonIconColor' icon='map-5'></lib-icon>
          </button>
          <button *ngIf='territory.recentHistory'
                  class='list-item-button'
                  type='button'
                  (click)='handleOpenHistory()'
          >
            <lib-icon [fillColor]='buttonIconColor' icon='time-17'></lib-icon>
          </button>
        </div>
      </div>
      <span class='territory-checkbox__indicator' [ngClass]='statusClass'></span>
    </label>
  `,
})
export class TerritoryCheckboxComponent implements ControlValueAccessor {
  public buttonIconColor = primaryGreen;

  // Control Value Accessor
  disabled = false;
  value = false;

  @Input()
  territory!: Territory;

  constructor(private readonly dialog: Dialog) {}

  // Resolve style indicator
  onTouched!: () => void;

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

  get statusClass() {
    const prefix = 'territory-checkbox__indicator--';

    if (this.disabled) {
      return prefix + 'disabled';
    }

    return prefix + (this.value ? 'selected' : 'default');
  }

  get hasRecentlyVisited() {
    return !!this.territory.recentHistory?.some(history => history.isRevisit);
  }

  get hasRecentlyMoved() {
    return !!this.territory.recentHistory?.some(history => history.visitOutcome === VisitOutcomeEnum.MOVED);
  }

  // Maybe the handleOpenMaps and handleOpenHistory should not be part of this component
  handleOpenMaps(mapsLink: string) {
    openGoogleMapsHandler(mapsLink, this.territory);
  }

  handleOpenHistory() {
    this.dialog.open<HistoryDialogComponent, TerritoryVisitHistory[]>(HistoryDialogComponent, {
      data: this.territory.recentHistory
    })
  }
}
