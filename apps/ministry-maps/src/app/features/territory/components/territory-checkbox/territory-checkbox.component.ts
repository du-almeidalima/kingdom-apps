import { ChangeDetectionStrategy, Component, forwardRef, Input } from '@angular/core';
import { Territory } from '../../../../../models/territory';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import openGoogleMapsHandler from '../../../../shared/utils/open-google-maps';
import { primaryGreen } from '@kingdom-apps/common-ui';
import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';

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
    <label class='territory-checkbox'
           [for]='territory.id'
           [ngClass]="{
             'territory-checkbox--disabled': disabled,
             'territory-checkbox--selected': !disabled && value
           }"
    >
      <div class='territory-checkbox__control-container'>
        <input
          type='checkbox'
          [name]='territory.id'
          [id]='territory.id'
          [checked]='value'
          [ngModel]='value'
          [disabled]='disabled'
          hidden
          (click)='handleClick($event)'
          (ngModelChange)='setValue($event)' />
        <div
          class='territory-checkbox__description'
          [ngClass]="{ 'territory-checkbox__description--disabled': disabled }">
          <p>{{ territory.address }}</p>
          <!-- VISIT CONTAINER -->
          <div class='territory-checkbox__visit-container'>
            <span class='territory-checkbox__last-visit' *ngIf='territory.lastVisit'>
              Última visita: {{ territory.lastVisit | date: 'dd/MM/yyyy' }}
            </span>
            <!-- VISIT STATUS BADGE -->
            <span class='territory-checkbox__visit-badge territory-checkbox__visit-badge--revisit'
                  title='Essa pessoa foi revisitada recentemente'
                  *ngIf='hasRecentlyVisited'>
              Revisita
            </span>
            <span class='territory-checkbox__visit-badge territory-checkbox__visit-badge--moved'
                  title='Essa pessoa se mudou'
                  *ngIf='hasRecentlyMoved'>
              Mudou
            </span>
          </div>
        </div>
        <!-- BUTTONS CONTAINER -->
        <div class='territory-checkbox__buttons-container'>
          <button class='list-item-button' *ngIf='territory.mapsLink' (click)='handleOpenMaps(territory.mapsLink)'>
            <lib-icon [fillColor]='buttonIconColor' icon='map-5'></lib-icon>
          </button>
          <button class='list-item-button' *ngIf='territory.lastVisit'>
            <lib-icon [fillColor]='buttonIconColor' icon='time-17' (click)='handleOpenHistory($event)'></lib-icon>
          </button>
        </div>
      </div>
      <span class='territory-checkbox__indicator' [ngClass]='statusClass'></span>
    </label>
  `,
})
export class TerritoryCheckboxComponent implements ControlValueAccessor {
  public buttonIconColor = primaryGreen;

  @Input()
  territory!: Territory;

  // Control Value Accessor
  disabled = false;
  value = false;

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
  // This method only exists to prevent default check/uncheck behavior of browsers
  // They tend to ignore the [value] and [checked] properties
  handleClick(e: MouseEvent) {
    if (this.disabled) {
      e.preventDefault();
    }
  }

  handleOpenMaps(mapsLink: string) {
    openGoogleMapsHandler(mapsLink, this.territory);
  }

  handleOpenHistory($event: MouseEvent) {
    $event.preventDefault();

    console.log('handleOpenHistory');
  }
}
