import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { ButtonComponent, IconButtonComponent, IconComponent, InputComponent } from '@kingdom-apps/common-ui';

export type RenameCityEvent = {
  oldName: string;
  newName: string;
};

@Component({
  selector: 'kingdom-apps-congregation-cities',
  styleUrls: ['./congregation-cities.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonComponent,
    IconButtonComponent,
    IconComponent,
    InputComponent,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
  ],
  template: `
    <section class="min-w-0" aria-labelledby="config-cities-heading">
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 mb-4">
        <h3 class="t-headline4" id="config-cities-heading">Cidades</h3>
        <span class="t-caption t-medium-emphasis">Arraste para reordenar</span>
      </div>

      <div
        class="cities-list"
        data-testid="config-cities-list"
        cdkDropList
        (cdkDropListDropped)="handleCityDrop($event)"
      >
        @for (city of cities(); track city; let i = $index) {
          <div
            class="city-row"
            data-testid="config-city-row"
            cdkDrag
            [cdkDragDisabled]="hasEditingCity() || disabled()"
            [class.city-row--editing]="editingCityIndex() === i"
          >
            @if (editingCityIndex() !== i) {
              <button
                lib-icon-button
                cdkDragHandle
                type="button"
                class="city-drag-handle"
                data-testid="config-city-drag-handle"
                [disabled]="hasEditingCity() || disabled()"
                title="Reordenar cidade"
                aria-label="Reordenar cidade"
              >
                <lib-icon class="icon" icon="cursor-23" fillColor="currentColor" />
              </button>
              <div class="city-name">
                <span class="t-body1" data-testid="config-city-name">{{ city }}</span>
                <span class="t-caption t-medium-emphasis">{{ countLabel(city) }}</span>
              </div>
              <div class="flex">
                <button
                  lib-icon-button
                  type="button"
                  data-testid="config-edit-city"
                  title="Editar cidade"
                  aria-label="Editar cidade"
                  (click)="startEditCity(i, city)"
                  [disabled]="hasEditingCity() || disabled()"
                >
                  <lib-icon class="icon" icon="pencil-lined" />
                </button>
                <button
                  lib-icon-button
                  type="button"
                  data-testid="config-delete-city"
                  title="Remover cidade"
                  aria-label="Remover cidade"
                  (click)="handleRemoveCity(city)"
                  [disabled]="hasEditingCity() || disabled()"
                >
                  <lib-icon class="icon" icon="trash-can-lined" />
                </button>
              </div>
            } @else {
              <input
                lib-input
                class="city-input"
                type="text"
                data-testid="config-city-input"
                aria-label="Nome da cidade"
                [ngModel]="editingCityValue()"
                (ngModelChange)="editingCityValue.set($event)"
                (keydown.enter)="saveEditCity(city)"
                (keydown.escape)="cancelEditCity()"
                placeholder="Nome da cidade"
                [disabled]="disabled()"
              />
              <div class="flex">
                <button
                  lib-icon-button
                  type="button"
                  data-testid="config-save-city"
                  title="Salvar cidade"
                  aria-label="Salvar cidade"
                  (click)="saveEditCity(city)"
                  [disabled]="disabled()"
                >
                  <lib-icon class="icon" icon="check-mark-circle-lined" />
                </button>
                <button
                  lib-icon-button
                  type="button"
                  data-testid="config-cancel-city"
                  title="Cancelar edição"
                  aria-label="Cancelar edição"
                  (click)="cancelEditCity()"
                  [disabled]="disabled()"
                >
                  <lib-icon class="icon" icon="x-mark-lined" />
                </button>
              </div>
            }
          </div>
        }
        @if (cities().length === 0) {
          <div class="city-empty" data-testid="config-empty-cities">
            <p class="t-body2">Nenhuma cidade cadastrada. Adicione uma cidade abaixo.</p>
          </div>
        }
        <div class="city-row city-row--add" data-testid="config-add-city-section">
          <lib-icon class="icon" icon="plus-lined" />
          <input
            lib-input
            class="city-input"
            id="config-new-city"
            type="text"
            data-testid="config-new-city-input"
            aria-label="Nova cidade"
            [ngModel]="newCityName()"
            (ngModelChange)="newCityName.set($event)"
            (keydown.enter)="handleAddCity()"
            placeholder="Nova cidade…"
            [disabled]="hasEditingCity() || disabled()"
          />
          <button
            lib-button
            btnType="primary"
            type="button"
            data-testid="config-add-city"
            [disabled]="hasEditingCity() || disabled()"
            (click)="handleAddCity()"
          >
            Adicionar
          </button>
        </div>
      </div>
    </section>
  `,
})
export class CongregationCitiesComponent {
  readonly cities = input.required<string[]>();
  readonly territoryCounts = input<Record<string, number>>({});
  readonly disabled = input<boolean>(false);

  readonly addCity = output<string>();
  readonly renameCity = output<RenameCityEvent>();
  readonly reorderCities = output<string[]>();
  readonly removeCity = output<string>();

  readonly newCityName = signal('');
  readonly editingCityIndex = signal<number | null>(null);
  readonly editingCityValue = signal('');

  readonly hasEditingCity = computed(() => this.editingCityIndex() !== null);

  protected countLabel(city: string): string {
    return pluralTerritories(this.territoryCounts()[city] ?? 0);
  }

  constructor() {
    effect(() => {
      this.cities();
      this.newCityName.set('');
      this.cancelEditCity();
    });
  }

  handleAddCity(): void {
    if (this.hasEditingCity() || this.disabled()) {
      return;
    }

    this.addCity.emit(this.newCityName());
  }

  startEditCity(index: number, currentName: string): void {
    this.editingCityIndex.set(index);
    this.editingCityValue.set(currentName);
  }

  cancelEditCity(): void {
    this.editingCityIndex.set(null);
    this.editingCityValue.set('');
  }

  saveEditCity(originalName: string): void {
    if (this.disabled()) {
      return;
    }

    const trimmed = this.editingCityValue().trim();
    if (trimmed === originalName) {
      this.cancelEditCity();
      return;
    }

    this.renameCity.emit({
      oldName: originalName,
      newName: this.editingCityValue(),
    });
  }

  handleCityDrop(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex || this.disabled() || this.hasEditingCity()) {
      return;
    }

    const reordered = [...this.cities()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.reorderCities.emit(reordered);
  }

  handleRemoveCity(cityName: string): void {
    if (this.disabled() || this.hasEditingCity()) {
      return;
    }

    this.removeCity.emit(cityName);
  }
}

function pluralTerritories(count: number): string {
  return `${count} ${count === 1 ? 'território' : 'territórios'}`;
}
