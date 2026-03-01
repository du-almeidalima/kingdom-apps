import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormFieldComponent } from '../../form-field';
import { LabelComponent } from '../../form-field';
import { InputComponent } from '../../form-field';

@Component({
  selector: 'lib-text-filter',
  standalone: true,
  imports: [CommonModule, FormFieldComponent, LabelComponent, InputComponent],
  template: `
    <lib-form-field>
      <label lib-label [for]="controlName()">{{ title() }}</label>
      <input
        lib-input
        type="text"
        [id]="controlName()"
        [value]="value()"
        [placeholder]="placeholder()"
        (input)="handleInput($event)"
        [disabled]="isDisabled()"
      />
    </lib-form-field>
  `,
  styleUrls: ['./text-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextFilterComponent),
      multi: true,
    },
  ],
})
export class TextFilterComponent implements ControlValueAccessor {
  title = input<string>('');
  controlName = input<string>('');
  placeholder = input<string>('');

  value = signal('');
  isDisabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
    this.onChange(this.value());
    this.onTouched();
  }

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }
}
