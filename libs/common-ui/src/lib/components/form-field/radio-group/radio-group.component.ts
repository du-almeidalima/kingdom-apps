import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../../icon/icon.component';
import { Icons } from '../../icon/icon-type';

export interface RadioOption<T = never> {
  value: T;
  label: string;
  description?: string;
  icon?: Icons;
  testId?: string;
  disabled?: boolean;
}

let nextUniqueId = 0;

@Component({
  selector: 'lib-radio-group',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './radio-group.component.html',
  styleUrl: './radio-group.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioGroupComponent),
      multi: true,
    },
  ],
})
export class RadioGroupComponent<T = never> implements ControlValueAccessor {
  private readonly uniqueId = `lib-radio-group-${++nextUniqueId}`;

  options = input<RadioOption<T>[]>([]);
  name = input<string>(this.uniqueId);
  ariaLabel = input<string>('Options');
  layout = input<'vertical' | 'horizontal' | 'grid'>('vertical');
  disabled = input<boolean>(false);

  value = model<T | null>(null);
  selected = output<T>();

  private internalDisabled = signal(false);

  private onChange: (val: T) => void = () => { /* empty */ };
  private onTouched: () => void = () => { /* empty */ };

  isSelected(optionValue: T): boolean {
    return this.value() === optionValue;
  }

  selectOption(option: RadioOption<T>): void {
    if (this.disabled() || this.internalDisabled() || option.disabled) {
      return;
    }

    this.value.set(option.value);
    this.onChange(option.value);
    this.onTouched();
    this.selected.emit(option.value);
  }

  writeValue(val: T): void {
    this.value.set(val);
  }

  registerOnChange(fn: (val: T) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.internalDisabled.set(isDisabled);
  }
}
