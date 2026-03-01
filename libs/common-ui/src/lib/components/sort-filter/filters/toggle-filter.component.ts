import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormFieldComponent } from '../../form-field';
import { LabelComponent } from '../../form-field';
import { IconComponent } from '../../icon/icon.component';
import { Icons } from '../../icon/icon-type';

@Component({
  selector: 'lib-toggle-filter',
  standalone: true,
  imports: [CommonModule, FormFieldComponent, LabelComponent, IconComponent],
  template: `
    <lib-form-field>
      <label [for]="controlName()" class="toggle-container" [class.toggle-container--disabled]="isDisabled()">
        <input
          type="checkbox"
          class="toggle-input"
          [id]="controlName()"
          [checked]="value()"
          (change)="handleChange($event)"
          [disabled]="isDisabled()"
        />
        @if (icon()) {
        <lib-icon [icon]="icon()!" class="toggle-icon" />
        }
        <div class="toggle-text">
          <span lib-label>{{ title() }}</span>
          @if (secondaryText()) {
          <span class="toggle-secondary">{{ secondaryText() }}</span>
          }
        </div>
        <span class="toggle-switch"></span>
      </label>
    </lib-form-field>
  `,
  styleUrls: ['./toggle-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleFilterComponent),
      multi: true,
    },
  ],
})
export class ToggleFilterComponent implements ControlValueAccessor {
  title = input<string>('');
  controlName = input<string>('');
  icon = input<Icons | undefined>(undefined);
  secondaryText = input<string>('');

  value = signal(false);
  isDisabled = signal(false);

  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  handleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.checked);
    this.onChange(this.value());
    this.onTouched();
  }

  writeValue(value: boolean): void {
    this.value.set(value ?? false);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }
}
