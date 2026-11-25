import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import {
  IconButtonComponent,
  IconComponent,
  InputComponent,
} from '@kingdom-apps/common-ui';

@Component({
  selector: 'kingdom-apps-congregation-name-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconButtonComponent, IconComponent, InputComponent],
  template: `
    <section data-testid="config-name-section">
      <p class="t-caption t-medium-emphasis mb-1">Nome da Congregação</p>
      @if (editingName()) {
        <div class="flex gap-2 items-center">
          <input
            lib-input
            class="name-input flex-1"
            id="config-congregation-name"
            type="text"
            data-testid="config-congregation-name-input"
            [value]="nameDraft()"
            (input)="nameDraft.set($any($event.target).value)"
            (keydown.enter)="handleSave()"
            (keydown.escape)="cancelEdit()"
            [disabled]="disabled()"
            placeholder="Nome da congregação"
          />
          <button
            lib-icon-button
            type="button"
            data-testid="config-save-name"
            title="Salvar nome"
            [disabled]="!canSave() || disabled()"
            (click)="handleSave()"
          >
            <lib-icon class="icon" icon="check-mark-circle-lined" />
          </button>
          <button
            lib-icon-button
            type="button"
            data-testid="config-cancel-name"
            title="Cancelar edição"
            [disabled]="disabled()"
            (click)="cancelEdit()"
          >
            <lib-icon class="icon" icon="x-mark-lined" />
          </button>
        </div>
      } @else {
        <div class="flex items-center justify-between gap-2">
          <span class="t-headline4" data-testid="config-congregation-name">{{ name() }}</span>
          <button
            lib-icon-button
            type="button"
            data-testid="config-edit-name"
            title="Editar nome da congregação"
            [disabled]="disabled()"
            (click)="startEdit()"
          >
            <lib-icon class="icon" icon="pencil-lined" />
          </button>
        </div>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .name-input {
      min-width: 0;
      width: 100%;
    }

    .icon {
      width: 2rem;
      height: 2rem;
    }
  `,
})
export class CongregationNameFormComponent {
  readonly name = input.required<string>();
  readonly disabled = input<boolean>(false);

  readonly saveName = output<string>();

  readonly editingName = signal(false);
  readonly nameDraft = signal('');

  readonly canSave = computed(() => {
    const trimmed = this.nameDraft().trim();
    return trimmed.length > 0 && trimmed !== this.name();
  });

  constructor() {
    effect(() => {
      this.nameDraft.set(this.name());
      this.editingName.set(false);
    });
  }

  startEdit(): void {
    if (this.disabled()) {
      return;
    }

    this.nameDraft.set(this.name());
    this.editingName.set(true);
  }

  cancelEdit(): void {
    this.nameDraft.set(this.name());
    this.editingName.set(false);
  }

  handleSave(): void {
    if (!this.canSave() || this.disabled()) {
      return;
    }

    this.saveName.emit(this.nameDraft().trim());
  }
}
