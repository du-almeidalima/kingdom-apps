import { ChangeDetectionStrategy, Component, computed, forwardRef, input, model, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { IconComponent } from '../icon/icon.component';

export type MultiSelectOption<T extends string = string> = {
  value: T;
  label: string;
};

@Component({
  selector: 'lib-multi-select-chips',
  imports: [IconComponent],
  styleUrls: ['./multi-select-chips.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    '(focusout)': 'handleFocusOut($event)',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiSelectChipsComponent),
      multi: true,
    },
  ],
  template: `
    @for (chip of chips(); track chip.value) {
      <label class="chip" [class.chip--selected]="chip.checked" [class.chip--disabled]="computedDisabled()">
        <input
          #box
          type="checkbox"
          class="chip__input"
          [value]="chip.value"
          [checked]="chip.checked"
          [disabled]="computedDisabled()"
          [attr.data-testid]="'multi-select-chips-option-' + chip.value"
          (change)="toggle(chip.value, box.checked)"
        />
        <span class="chip__label">{{ chip.label }}</span>
        <lib-icon class="chip__icon" aria-hidden="true" [icon]="chip.checked ? 'x-mark-lined' : 'plus-lined'" />
      </label>
    }
  `,
})
export class MultiSelectChipsComponent<T extends string = string> implements ControlValueAccessor {
  readonly options = input<MultiSelectOption<T>[]>([]);
  readonly selected = model<T[]>([]);
  readonly disabled = input<boolean>(false);

  private readonly formDisabled = signal(false);
  protected readonly computedDisabled = computed(() => this.disabled() || this.formDisabled());

  protected readonly chips = computed(() => {
    const selected = new Set(this.selected());
    return this.options().map((option) => ({ ...option, checked: selected.has(option.value) }));
  });

  private onChange: (val: T[]) => void = () => {
    /* empty */
  };
  private onTouched: () => void = () => {
    /* empty */
  };

  protected toggle(value: T, checked: boolean): void {
    if (this.computedDisabled()) {
      return;
    }

    const next = this.options()
      .map((option) => option.value)
      .filter((candidate) => (candidate === value ? checked : this.selected().includes(candidate)));

    this.selected.set(next);
    this.onChange(next);
    this.onTouched();
  }

  protected handleFocusOut(event: FocusEvent): void {
    const hostEl = event.currentTarget as HTMLElement | null;
    const nextFocusedEl = event.relatedTarget as Node | null;
    if (!hostEl || !nextFocusedEl || !hostEl.contains(nextFocusedEl)) {
      this.onTouched();
    }
  }

  // --- ControlValueAccessor ---

  writeValue(val: T[] | null | undefined): void {
    this.selected.set(val ?? []);
  }

  registerOnChange(fn: (val: T[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
