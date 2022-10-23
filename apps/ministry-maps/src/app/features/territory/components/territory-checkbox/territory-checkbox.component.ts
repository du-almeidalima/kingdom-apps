import { Component, Input } from '@angular/core';
import { Territory } from '../../../../../models/territory';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'kingdom-apps-territory-checkbox',
  styleUrls: ['territory-checkbox.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: TerritoryCheckboxComponent,
      multi: true,
    },
  ],
  template: `
    <label class="territory-checkbox" [for]="territory.id">
      <div class="territory-checkbox__control-container">
        <input
          type="checkbox"
          class="territory-checkbox__input"
          [name]="territory.id"
          [id]="territory.id"
          [ngModel]="value"
          (ngModelChange)="setValue($event)" />
        <span class="territory-checkbox__description">{{ territory.address }}</span>
      </div>
      <span class="territory-checkbox__indicator territory-checkbox__indicator--blue"></span>
    </label>
  `,
})
export class TerritoryCheckboxComponent implements ControlValueAccessor {
  @Input()
  territory!: Territory;

  // Control Value Accessor
  private disabled = false;
  value = false;

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
}
