import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  ButtonComponent,
  FormFieldComponent,
  IconButtonComponent,
  IconComponent,
  InputComponent,
  LabelComponent,
} from '@kingdom-apps/common-ui';

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
    FormFieldComponent,
    LabelComponent,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
  ],
  template: `
    <section class="mb-6" data-testid="config-add-city-section">
      <lib-form-field>
        <label lib-label for="config-new-city">Cidades</label>
        <div class="flex gap-3 items-center">
          <input
            lib-input
            class="flex-1"
            id="config-new-city"
            type="text"
            data-testid="config-new-city-input"
            [ngModel]="newCityName()"
            (ngModelChange)="newCityName.set($event)"
            (keydown.enter)="handleAddCity()"
            placeholder="Nome da nova cidade"
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
            Adicionar Cidade
          </button>
        </div>
      </lib-form-field>
    </section>

    <div
      class="cities-list mb-6"
      data-testid="config-cities-list"
      cdkDropList
      (cdkDropListDropped)="handleCityDrop($event)"
    >
      @for (city of cities(); track city; let i = $index) {
        <div
          class="city-row px-4 py-3"
          data-testid="config-city-row"
          cdkDrag
          [cdkDragDisabled]="hasEditingCity() || disabled()"
        >
          @if (editingCityIndex() !== i) {
            <div class="flex justify-between items-center gap-3">
              <div class="flex items-center gap-2 flex-1">
                <button
                  lib-icon-button
                  cdkDragHandle
                  type="button"
                  class="city-drag-handle"
                  data-testid="config-city-drag-handle"
                  [disabled]="hasEditingCity() || disabled()"
                  title="Reordenar cidade"
                >
                  <lib-icon icon="cursor-23" fillColor="currentColor" />
                </button>
                <span class="t-body1" data-testid="config-city-name">{{ city }}</span>
              </div>
              <div class="flex gap-2">
                <button
                  lib-button
                  type="button"
                  data-testid="config-edit-city"
                  (click)="startEditCity(i, city)"
                  [disabled]="hasEditingCity() || disabled()"
                >
                  Editar
                </button>
                <button
                  lib-button
                  type="button"
                  data-testid="config-delete-city"
                  (click)="handleRemoveCity(city)"
                  [disabled]="hasEditingCity() || disabled()"
                >
                  Remover
                </button>
              </div>
            </div>
          } @else {
            <div class="flex justify-between items-center gap-3">
              <input
                lib-input
                class="flex-1"
                type="text"
                data-testid="config-city-input"
                [ngModel]="editingCityValue()"
                (ngModelChange)="editingCityValue.set($event)"
                (keydown.enter)="saveEditCity(city)"
                (keydown.escape)="cancelEditCity()"
                placeholder="Nome da cidade"
              />
              <div class="flex gap-2">
                <button
                  lib-button
                  btnType="primary"
                  type="button"
                  data-testid="config-save-city"
                  [disabled]="disabled()"
                  (click)="saveEditCity(city)"
                >
                  Salvar
                </button>
                <button
                  lib-button
                  type="button"
                  data-testid="config-cancel-city"
                  [disabled]="disabled()"
                  (click)="cancelEditCity()"
                >
                  Cancelar
                </button>
              </div>
            </div>
          }
        </div>
      }
      @if (cities().length === 0) {
        <div class="px-6 py-8 text-center" data-testid="config-empty-cities">
          <p class="t-body2">Nenhuma cidade cadastrada. Adicione uma cidade acima.</p>
        </div>
      }
    </div>
  `,
})
export class CongregationCitiesComponent {
  readonly cities = input.required<string[]>();
  readonly disabled = input<boolean>(false);

  readonly addCity = output<string>();
  readonly renameCity = output<RenameCityEvent>();
  readonly reorderCities = output<string[]>();
  readonly removeCity = output<string>();

  readonly newCityName = signal('');
  readonly editingCityIndex = signal<number | null>(null);
  readonly editingCityValue = signal('');

  readonly hasEditingCity = computed(() => this.editingCityIndex() !== null);

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
