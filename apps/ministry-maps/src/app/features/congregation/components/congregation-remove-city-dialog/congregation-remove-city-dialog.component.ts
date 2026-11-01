import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import {
  ButtonComponent,
  DialogCloseDirective,
  DialogComponent,
  DialogFooterComponent,
  FormFieldComponent,
  LabelComponent,
  RadioGroupComponent,
  RadioOption,
  SelectComponent,
} from '@kingdom-apps/common-ui';

import { RemoveCityResolution } from '../../bo/congregation/congregation.bo';

export type CongregationRemoveCityDialogData = {
  cityName: string;
  remainingCities: string[];
};

@Component({
  selector: 'kingdom-apps-congregation-remove-city-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./congregation-remove-city-dialog.component.scss'],
  imports: [
    FormsModule,
    DialogComponent,
    DialogFooterComponent,
    ButtonComponent,
    DialogCloseDirective,
    RadioGroupComponent,
    FormFieldComponent,
    LabelComponent,
    SelectComponent,
  ],
  template: `
    <lib-dialog title="Remover Cidade" data-testid="remove-city-dialog">
      <p class="t-body1 mb-4" data-testid="remove-city-warning">
        A remoção da cidade <strong>{{ data.cityName }}</strong> é definitiva e esta ação não poderá ser desfeita.
      </p>
      <p class="t-body2 mb-4">Escolha o que deseja fazer com os territórios desta cidade:</p>

      <lib-radio-group
        name="remove-city-resolution"
        ariaLabel="Resolução dos territórios da cidade"
        [options]="radioOptions"
        [(value)]="selectedAction"
        data-testid="remove-city-radio-group"
      />

      <lib-form-field class="mt-4">
        <label lib-label for="remove-city-target-select">Cidade de destino</label>
        <select
          lib-select
          id="remove-city-target-select"
          data-testid="remove-city-target-select"
          [value]="targetCity()"
          (change)="targetCity.set($any($event.target).value)"
          [disabled]="selectedAction() !== 'transfer' || !hasRemainingCities"
        >
          @for (city of data.remainingCities; track city) {
            <option [value]="city">{{ city }}</option>
          }
        </select>
      </lib-form-field>

      <lib-dialog-footer>
        <div class="flex justify-end gap-4">
          <button lib-button type="button" libDialogClose data-testid="remove-city-cancel">Cancelar</button>
          <button lib-button type="button" btnType="primary" data-testid="remove-city-confirm" (click)="confirm()">
            Confirmar
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

  protected readonly radioOptions: RadioOption<'transfer' | 'delete'>[] = [
    {
      value: 'transfer',
      label: 'Transferir para outra cidade',
      testId: 'remove-city-option-transfer',
      disabled: !this.hasRemainingCities,
    },
    {
      value: 'delete',
      label: 'Excluir territórios',
      testId: 'remove-city-option-delete',
    },
  ];

  protected readonly selectedAction = signal<'transfer' | 'delete' | null>(
    this.hasRemainingCities ? 'transfer' : 'delete',
  );
  protected readonly targetCity = signal<string>(this.data.remainingCities[0] ?? '');

  protected confirm(): void {
    const action = this.selectedAction();
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
