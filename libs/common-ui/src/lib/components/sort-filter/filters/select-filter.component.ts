import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormFieldComponent } from '../../form-field';
import { LabelComponent } from '../../form-field';
import { SelectComponent } from '../../form-field';

@Component({
  selector: 'lib-select-filter',
  standalone: true,
  imports: [CommonModule, FormFieldComponent, LabelComponent, SelectComponent],
  template: `
    <lib-form-field>
      <label lib-label [for]="controlName()">{{ title() }}</label>
      <select lib-select [id]="controlName()" [value]="value()" (change)="handleChange($event)" [disabled]="isDisabled()">
        <option value="">{{ placeholder() || 'Selecione' }}</option>
        @for (option of options(); track option.value) {
        <option [value]="option.value">{{ option.label }}</option>
        }
      </select>
    </lib-form-field>
  `,
  styleUrls: ['./select-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectFilterComponent),
      multi: true,
    },
  ],
})
export class SelectFilterComponent implements ControlValueAccessor {
  title = input<string>('');
  controlName = input<string>('');
  placeholder = input<string>('');
  options = input<{ value: any; label: string }[]>([]);

  value = signal<any>('');
  isDisabled = signal(false);

  private onChange: (value: any) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  handleChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.value.set(target.value);
    this.onChange(this.value());
    this.onTouched();
  }

  writeValue(value: any): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }
}
