import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DialogCloseDirective,
  DialogComponent,
  DialogFooterComponent,
  IconComponent,
  NoteComponent,
  SelectComponent,
} from '@kingdom-apps/common-ui';

import { RemoveCityResolution } from '../../bo/congregation/congregation.bo';

export type CongregationRemoveCityDialogData = {
  cityName: string;
  remainingCities: string[];
  territoryCounts: Record<string, number>;
};

@Component({
  selector: 'kingdom-apps-congregation-remove-city-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./congregation-remove-city-dialog.component.scss'],
  imports: [
    DialogComponent,
    DialogFooterComponent,
    ButtonComponent,
    DialogCloseDirective,
    IconComponent,
    NoteComponent,
    SelectComponent,
  ],
  template: `
    <lib-dialog title="Remover Cidade" data-testid="remove-city-dialog">
      <p class="t-body1 mb-4" data-testid="remove-city-warning">
        A remoção da cidade <strong>{{ data.cityName }}</strong> é definitiva e esta ação não poderá ser desfeita.
      </p>
      <p class="t-body2 mb-3">Escolha o que fazer com os territórios:</p>

      <div class="choice-list" role="radiogroup" aria-label="Resolução dos territórios da cidade">
        <button
          class="tile"
          type="button"
          role="radio"
          data-testid="remove-city-option-transfer"
          [attr.aria-checked]="choice() === 'transfer'"
          [class.tile--selected]="choice() === 'transfer'"
          [disabled]="!hasRemainingCities"
          (click)="choice.set('transfer')"
          (keydown)="handleChoiceKeydown($event, 'transfer')"
        >
          <lib-icon class="tile__icon" icon="paper-plane-2" />
          <span class="t-body1 font-semibold">Transferir para outra cidade</span>
          <span class="t-caption t-medium-emphasis">{{ transferDescription() }}</span>
        </button>
        <button
          class="tile"
          type="button"
          role="radio"
          data-testid="remove-city-option-delete"
          [attr.aria-checked]="choice() === 'delete'"
          [class.tile--selected]="choice() === 'delete'"
          (click)="choice.set('delete')"
          (keydown)="handleChoiceKeydown($event, 'delete')"
        >
          <lib-icon class="tile__icon" icon="trash-can-lined" />
          <span class="t-body1 font-semibold">Excluir territórios</span>
          <span class="t-caption t-medium-emphasis">{{ deleteDescription() }}</span>
        </button>
      </div>

      <div class="mt-4">
        <label class="t-caption t-medium-emphasis block mb-1" for="remove-city-target-select">Cidade de destino</label>
        <select
          lib-select
          class="target-select"
          id="remove-city-target-select"
          data-testid="remove-city-target-select"
          [value]="targetCity()"
          (change)="targetCity.set($any($event.target).value)"
          [disabled]="choice() !== 'transfer' || !hasRemainingCities"
        >
          @for (city of data.remainingCities; track city) {
            <option [value]="city">{{ city }}</option>
          }
        </select>
      </div>

      <div class="mt-5">
        <lib-note type="warning" [message]="summary()" data-testid="remove-city-summary" />
      </div>

      <lib-dialog-footer>
        <div class="flex flex-wrap justify-end gap-4">
          <button lib-button type="button" libDialogClose data-testid="remove-city-cancel">Cancelar</button>
          <button
            lib-button
            type="button"
            [btnType]="choice() === 'delete' ? 'danger' : 'primary'"
            data-testid="remove-city-confirm"
            (click)="confirm()"
          >
            {{ choice() === 'delete' ? 'Excluir cidade e territórios' : 'Transferir territórios' }}
          </button>
        </div>
      </lib-dialog-footer>
    </lib-dialog>
  `,
})
export class CongregationRemoveCityDialogComponent {
  readonly data = inject<CongregationRemoveCityDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<RemoveCityResolution>>(DialogRef);

  protected readonly hasRemainingCities = this.data.remainingCities.length > 0;

  protected readonly choice = signal<'transfer' | 'delete'>(
    this.hasRemainingCities ? 'transfer' : 'delete',
  );
  protected readonly targetCity = signal<string>(this.data.remainingCities[0] ?? '');
  protected readonly transferDescription = computed(() => {
    const count = this.data.territoryCounts[this.data.cityName] ?? 0;
    return count === 0
      ? 'Não há territórios para transferir.'
      : `Transfira ${pluralTerritories(count)} para outra cidade.`;
  });
  protected readonly deleteDescription = computed(() => {
    const count = this.data.territoryCounts[this.data.cityName] ?? 0;
    return count === 0
      ? 'Remova a cidade; não há territórios para excluir.'
      : `Exclua ${pluralTerritories(count)} junto com a cidade.`;
  });
  protected readonly summary = computed(() => {
    const count = this.data.territoryCounts[this.data.cityName] ?? 0;
    const action = this.choice();
    if (action === 'transfer') {
      if (count === 0) {
        return `A cidade ${this.data.cityName} será removida. Não há territórios para transferir.`;
      }
      const subject = `${pluralTerritories(count)} da cidade ${this.data.cityName}`;
      const verb = count === 1 ? 'será transferido' : 'serão transferidos';
      return `${subject} ${verb} para ${this.targetCity()}.`;
    }

    if (count === 0) {
      return `A cidade ${this.data.cityName} será removida. Não há territórios para excluir.`;
    }
    const subject = `${pluralTerritories(count)} da cidade ${this.data.cityName}`;
    const verb = count === 1 ? 'será excluído' : 'serão excluídos';
    return `${subject} ${verb} permanentemente.`;
  });

  protected handleChoiceKeydown(event: KeyboardEvent, action: 'transfer' | 'delete'): void {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    if (!this.hasRemainingCities) {
      return;
    }

    const nextChoice = action === 'transfer' ? 'delete' : 'transfer';
    this.choice.set(nextChoice);
    const testId = nextChoice === 'transfer' ? 'remove-city-option-transfer' : 'remove-city-option-delete';
    (event.currentTarget as HTMLElement).parentElement
      ?.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)
      ?.focus();
  }

  protected confirm(): void {
    const action = this.choice();
    if (action === 'transfer' && this.hasRemainingCities && this.targetCity()) {
      this.dialogRef.close({
        action: 'transfer',
        targetCity: this.targetCity(),
      });
      return;
    }

    this.dialogRef.close({
      action: 'delete',
    });
  }
}

function pluralTerritories(count: number): string {
  return `${count} ${count === 1 ? 'território' : 'territórios'}`;
}
