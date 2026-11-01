import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewEncapsulation,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NgControl } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'kingdom-apps-icon-radio',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./icon-radio.component.scss'],
  host: {
    role: 'radio',
    '[attr.aria-checked]': 'value() === modelValue()',
    '[attr.aria-disabled]': 'disabled()',
    '[attr.disabled]': 'disabled() ? "" : null',
    '[class.icon-radio-host--disabled]': 'disabled()',
    '(click)': 'handleClick()',
  },
  template: `
    <label
      for="icon-radio-{{ value() }}"
      class="icon-radio"
      [class.icon-radio--disabled]="disabled()"
      [attr.tabindex]="disabled() ? -1 : 0"
      [attr.aria-disabled]="disabled()"
      [ngClass]="{ 'icon-radio--active': value() === modelValue() }"
      (keydown.enter)="!disabled() && valueChanged(value())"
      (keydown.space)="!disabled() && valueChanged(value())"
    >
      <!-- Icon -->
      <ng-content select="lib-icon"></ng-content>
      <span class="icon-radio__description"><ng-content></ng-content></span>
      <input
        class="icon-radio__input"
        type="radio"
        id="icon-radio-{{ value() }}"
        [(ngModel)]="modelValue"
        [name]="name()"
        [value]="value()"
        [attr.disabled]="disabled() ? '' : null"
        (change)="valueChanged()"
      />
    </label>
  `,
  imports: [NgClass, FormsModule],
})
export class IconRadioComponent implements OnInit, ControlValueAccessor {
  private ngControl = inject(NgControl, { self: true });

  private readonly disabledState = signal(false);
  readonly disabledOption = input(false);
  readonly disabled = computed(() => this.disabledOption() || this.disabledState());

  modelValue = signal<string | number | undefined>(undefined);

  name = input('visit-outcome-option');

  value = input.required<string | number>();

  constructor() {
    const ngControl = this.ngControl;

    ngControl.valueAccessor = this;
  }

  ngOnInit(): void {
    // Looks like Reactive Forms doesn't call writeValue on model changes.
    // Doing this work manually here.
    // https://stackoverflow.com/questions/58236023/how-to-create-a-custom-radio-button-angular-component-that-works-with-reactivefo
    this.ngControl.control?.valueChanges.subscribe((value) => {
      if (this.modelValue() === value) {
        return;
      }

      this.writeValue(value);
    });
  }

  // Control Value Accessor
  onTouched!: () => void;

  onChange: (value: string | number | undefined) => void = () => {
    return;
  };
  // Control Value Accessor
  registerOnChange(fn: IconRadioComponent['onChange']): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: IconRadioComponent['onTouched']): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledState.set(isDisabled);
  }

  writeValue(value: string | number): void {
    this.modelValue.set(value);
  }

  handleClick(): void {
    if (this.disabled()) {
      return;
    }

    this.valueChanged(this.value());
  }

  /**
   *
   * @param value - Used when not two-way bound. In this case, when the label
   * is pressed.
   */
  valueChanged(value?: string | number) {
    if (this.disabled()) {
      return;
    }

    // Manually updating the input state
    if (value !== undefined) {
      this.modelValue.set(value);
    }

    this.onChange(this.modelValue());
    this.onTouched?.();
  }
}
