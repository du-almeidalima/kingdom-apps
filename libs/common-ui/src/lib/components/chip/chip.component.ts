import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'lib-chip',
  imports: [IconComponent],
  styleUrls: ['./chip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'listitem',
  },
  template: `
    <div class="chip" [class.chip--disabled]="disabled()" data-testid="chip">
      <span class="chip__label" data-testid="chip-label">{{ label() }}<ng-content /></span>
      @if (removable()) {
        <button
          type="button"
          class="chip__remove"
          data-testid="chip-remove"
          [disabled]="disabled()"
          [attr.aria-label]="computedRemoveLabel()"
          (click)="handleRemove($event)"
          (keydown.enter)="handleRemove($event)"
          (keydown.space)="handleRemove($event)"
        >
          <lib-icon class="chip__remove-icon" icon="x-mark-lined" fillColor="currentColor" />
        </button>
      }
    </div>
  `,
})
export class ChipComponent {
  label = input<string>('');
  removable = input<boolean>(false);
  disabled = input<boolean>(false);
  removeAriaLabel = input<string>('');

  removed = output<void>();

  protected readonly computedRemoveLabel = computed(
    () => this.removeAriaLabel() || (this.label() ? `Remover ${this.label()}` : 'Remover'),
  );

  protected handleRemove(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) {
      return;
    }
    this.removed.emit();
  }
}
