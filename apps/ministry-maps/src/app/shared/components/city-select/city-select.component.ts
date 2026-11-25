import { ChangeDetectionStrategy, Component, forwardRef, input, model, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SelectComponent } from '@kingdom-apps/common-ui';
import { ALL_OPTION } from '../../utils/territories-filter-pipe';

/**
 * Dropdown component that standardizes congregation city filtering across territory pages.
 * Supports both Angular template forms via ControlValueAccessor and direct [disabled] binding.
 */
@Component({
  selector: 'kingdom-apps-city-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SelectComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CitySelectComponent),
      multi: true,
    },
  ],
  template: `
    <select
      lib-select
      class="w-full"
      name="Cidade"
      [attr.data-testid]="testId()"
      [disabled]="disabled()"
      [value]="value()"
      (change)="onSelectionChange($any($event.target).value)"
    >
      @for (city of cities(); track city) {
        <option [value]="city">{{ city }}</option>
      }
      @if (includeAll()) {
        <option [value]="ALL_OPTION">Todas</option>
      }
    </select>
  `,
})
export class CitySelectComponent implements ControlValueAccessor {
  public readonly ALL_OPTION = ALL_OPTION;

  /** Congregation cities available for filtering. */
  public readonly cities = input.required<string[]>();

  /** Whether to render the synthetic "Todas" option allowing cross-city views. */
  public readonly includeAll = input<boolean>(true);

  /** Forwarded data-testid attribute for end-to-end test locators. */
  public readonly testId = input<string | null>(null);

  /** Whether the select dropdown is disabled. Supports model binding and CVA. */
  public readonly disabled = model<boolean>(false);

  /** Currently selected city value. */
  public readonly value = signal<string>('');

  private onChange: (val: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  /** Updates the internal selection from the form model. */
  public writeValue(val: string): void {
    this.value.set(val ?? '');
  }

  /** Registers form change callback. */
  public registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }

  /** Registers form touched callback. */
  public registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /** Updates disabled state via ControlValueAccessor. */
  public setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  /** Handles native select change event and propagates value to the form. */
  protected onSelectionChange(newValue: string): void {
    this.value.set(newValue);
    this.onChange(newValue);
    this.onTouched();
  }
}
