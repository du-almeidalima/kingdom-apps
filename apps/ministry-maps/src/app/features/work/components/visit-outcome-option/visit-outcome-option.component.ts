import { Component, Input, OnInit, Self, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';

import { grey400, Icons } from '@kingdom-apps/common';

import { VisitOutcome } from '../../../../../models/enums/visit-outcome';

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

  modelValue!: VisitOutcome;

  @Input()
  name = 'visit-outcome-option';

  @Input()
  value!: VisitOutcome;

  constructor(@Self() private ngControl: NgControl) {
    ngControl.valueAccessor = this;
  }

  // Control Value Accessor
  onTouched!: () => void;
  onChange: (value: VisitOutcome) => void = () => {
    return;
  };

  ngOnInit(): void {
    this.optionIcon = this.visitOutcomeToIcon(this.value);

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
  registerOnChange(fn: typeof this.onChange): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: typeof this.onTouched): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  writeValue(value: VisitOutcome): void {
    this.modelValue = value;
  }

  // Methods
  visitOutcomeToIcon(visitOutcome: VisitOutcome): Icons {
    switch (visitOutcome) {
      case VisitOutcome.SPOKE:
        return 'thumb-10';
      case VisitOutcome.NOT_ANSWERED:
        return 'thumb-12';
      case VisitOutcome.MOVED:
        return 'building-8';
      case VisitOutcome.ASKED_TO_NOT_VISIT_AGAIN:
        return 'stop-2';
    }
  }

  /**
   *
   * @param value - Used when not two-way bound. In this case, when the label
   * is pressed.
   */
  valueChanged(value?: VisitOutcome) {
    // Manually updating the input state
    if (value !== undefined) {
      this.modelValue = value;
    }

    this.onChange(this.modelValue);
    this.onTouched();
  }
}
