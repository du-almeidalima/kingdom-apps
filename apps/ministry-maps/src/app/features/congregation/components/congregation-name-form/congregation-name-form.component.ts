import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, FormFieldComponent, InputComponent, LabelComponent } from '@kingdom-apps/common-ui';

@Component({
  selector: 'kingdom-apps-congregation-name-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonComponent, FormFieldComponent, InputComponent, LabelComponent],
  template: `
    <section data-testid="config-name-section">
      <lib-form-field>
        <label lib-label for="config-congregation-name">Nome da Congregação</label>
        <div class="flex gap-3 items-center">
          <input
            lib-input
            class="flex-1"
            id="config-congregation-name"
            type="text"
            data-testid="config-congregation-name-input"
            [ngModel]="nameInput()"
            (ngModelChange)="nameInput.set($event)"
            [disabled]="disabled()"
            placeholder="Nome da congregação"
          />
          <button
            lib-button
            btnType="primary"
            type="button"
            data-testid="config-save-name"
            [disabled]="!canSave() || disabled()"
            (click)="handleSave()"
          >
            Salvar Nome
          </button>
        </div>
      </lib-form-field>
    </section>
  `,
})
export class CongregationNameFormComponent {
  readonly name = input.required<string>();
  readonly disabled = input<boolean>(false);

  readonly saveName = output<string>();

  readonly nameInput = signal('');

  readonly canSave = computed(() => {
    const trimmed = this.nameInput().trim();
    return trimmed.length > 0 && trimmed !== this.name();
  });

  constructor() {
    effect(() => {
      this.nameInput.set(this.name());
    });
  }

  handleSave(): void {
    if (!this.canSave() || this.disabled()) {
      return;
    }

    this.saveName.emit(this.nameInput().trim());
  }
}
