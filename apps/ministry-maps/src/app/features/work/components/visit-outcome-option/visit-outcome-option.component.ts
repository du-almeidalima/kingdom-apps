import { Component, Input, OnInit, Self, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';

import { grey400, Icons } from '@kingdom-apps/common-ui';

import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { VisitOutcomeToIconPipe } from '../../../../shared/pipes/visit-outcome-to-icon/visit-outcome-to-icon.pipe';

@Component({
  selector: 'kingdom-apps-visit-outcome-option',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./visit-outcome-option.component.scss'],
  template: `
    <label
      for="visit-outcome-option-{{ value }}"
      class="visit-outcome-option"
      tabindex="0"
      [ngClass]="{ 'visit-outcome-option--active': value === modelValue }"
      (keydown.enter)="valueChanged(value)"
      (keydown.space)="valueChanged(value)">
      <lib-icon class="visit-outcome-option__icon" [icon]="optionIcon" [fillColor]="iconColor"></lib-icon>
      <span class="visit-outcome-option__description"><ng-content></ng-content></span>
      <input
        class="visit-outcome-option__input"
        type="radio"
        id="visit-outcome-option-{{ value }}"
        [(ngModel)]="modelValue"
        [name]="name"
        [value]="value"
        (change)="valueChanged()" />
    </label>
  `,
})
export class VisitOutcomeOptionComponent implements OnInit, ControlValueAccessor {
  iconColor = grey400;
  optionIcon: Icons = 'thumb-10';
  disabled = false;

  modelValue!: VisitOutcomeEnum;

  @Input()
  name = 'visit-outcome-option';

  @Input()
  value!: VisitOutcomeEnum;

  constructor(@Self() private ngControl: NgControl, private readonly visitOutcomeToIcon: VisitOutcomeToIconPipe) {
    ngControl.valueAccessor = this;
  }

  // Control Value Accessor
  onTouched!: () => void;
  onChange: (value: VisitOutcomeEnum) => void = () => {
    return;
  };

  ngOnInit(): void {
    this.optionIcon = this.visitOutcomeToIcon.transform(this.value);

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
  registerOnChange(fn: VisitOutcomeOptionComponent['onChange'] ): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: VisitOutcomeOptionComponent['onTouched']): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  writeValue(value: VisitOutcomeEnum): void {
    this.modelValue = value;
  }

  /**
   *
   * @param value - Used when not two-way bound. In this case, when the label
   * is pressed.
   */
  valueChanged(value?: VisitOutcomeEnum) {
    // Manually updating the input state
    if (value !== undefined) {
      this.modelValue = value;
    }

    this.onChange(this.modelValue);
    this.onTouched();
  }
}
