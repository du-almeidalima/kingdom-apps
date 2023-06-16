import { Component, Input, OnInit, Self, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';

@Component({
  selector: 'kingdom-apps-icon-radio',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./icon-radio.component.scss'],
  template: `
    <label
      for='icon-radio-{{ value }}'
      class='icon-radio'
      tabindex='0'
      [ngClass]="{ 'icon-radio--active': value === modelValue }"
      (keydown.enter)='valueChanged(value)'
      (keydown.space)='valueChanged(value)'>
      <!-- Icon -->
      <ng-content select='lib-icon'></ng-content>
      <span class='icon-radio__description'><ng-content></ng-content></span>
      <input
        class='icon-radio__input'
        type='radio'
        id='icon-radio-{{ value }}'
        [(ngModel)]='modelValue'
        [name]='name'
        [value]='value'
        (change)='valueChanged()' />
    </label>
  `,
})
export class IconRadioComponent implements OnInit, ControlValueAccessor {
  disabled = false;

  modelValue!: string | number;

  @Input()
  name = 'visit-outcome-option';

  @Input()
  value!: string | number;

  constructor(@Self() private ngControl: NgControl) {
    ngControl.valueAccessor = this;
  }

  // Control Value Accessor
  onTouched!: () => void;
  onChange: (value: string | number) => void = () => {
    return;
  };

  ngOnInit(): void {
    // Looks like Reactive Forms doesn't call writeValue on model changes.
    // Doing this work manually here.
    // https://stackoverflow.com/questions/58236023/how-to-create-a-custom-radio-button-angular-component-that-works-with-reactivefo
    this.ngControl.control?.valueChanges.subscribe(value => {
      if (this.modelValue === value) {
        return;
      }

      this.writeValue(value);
    });
  }

  // Control Value Accessor
  registerOnChange(fn: IconRadioComponent['onChange'] ): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: IconRadioComponent['onTouched']): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  writeValue(value: string | number): void {
    this.modelValue = value;
  }

  /**
   *
   * @param value - Used when not two-way bound. In this case, when the label
   * is pressed.
   */
  valueChanged(value?: string | number) {
    // Manually updating the input state
    if (value !== undefined) {
      this.modelValue = value;
    }

    this.onChange(this.modelValue);
    this.onTouched();
  }
}
