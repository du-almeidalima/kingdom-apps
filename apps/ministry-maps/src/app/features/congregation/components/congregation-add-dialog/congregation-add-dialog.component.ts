import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { finalize, startWith } from 'rxjs';
import {
  ButtonComponent,
  ChipComponent,
  ChipListComponent,
  DialogCloseDirective,
  DialogComponent,
  DialogFooterComponent,
  DividerComponent,
  FormFieldComponent,
  InputComponent,
  LabelComponent,
  OnlyNumbersDirective,
  SpinnerComponent,
  ToasterService,
  white100,
} from '@kingdom-apps/common-ui';

import { CongregationBO } from '../../bo/congregation/congregation.bo';
import { Congregation } from '../../../../../models/congregation';
import { environment } from '../../../../../environments/environment';

type AddCongregationForm = {
  name: FormControl<string>;
  locatedOn: FormControl<string>;
  designationAccessExpiryDays: FormControl<number>;
  shouldDesignationBlockAfterExpired: FormControl<boolean>;
};

@Component({
  selector: 'kingdom-apps-congregation-add-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./congregation-add-dialog.component.scss'],
  imports: [
    ReactiveFormsModule,
    DialogComponent,
    DialogFooterComponent,
    FormFieldComponent,
    InputComponent,
    LabelComponent,
    ButtonComponent,
    DialogCloseDirective,
    DividerComponent,
    ChipComponent,
    ChipListComponent,
    OnlyNumbersDirective,
    SpinnerComponent,
  ],
  template: `
    <lib-dialog title="Adicionar Congregação" data-testid="add-congregation-dialog">
      <form [formGroup]="form" (ngSubmit)="handleSubmit()" id="add-congregation-form">
        <lib-form-field>
          <label lib-label for="add-congregation-name">Nome da Congregação</label>
          <input
            lib-input
            formControlName="name"
            type="text"
            id="add-congregation-name"
            data-testid="add-congregation-name-input"
            placeholder="Ex: Congregação Central"
            autocomplete="off"
          />
        </lib-form-field>

        <lib-form-field class="mt-5">
          <label lib-label for="add-congregation-location">Localização</label>
          <input
            lib-input
            formControlName="locatedOn"
            type="text"
            id="add-congregation-location"
            data-testid="add-congregation-location-input"
            placeholder="Ex: São Paulo, SP"
            autocomplete="off"
          />
        </lib-form-field>

        <lib-form-field class="mt-5">
          <label lib-label for="add-congregation-city">Cidades</label>
          <div class="flex gap-3 items-center">
            <input
              lib-input
              class="flex-1"
              type="text"
              id="add-congregation-city"
              data-testid="add-congregation-city-input"
              [value]="cityInput()"
              (input)="cityInput.set($any($event.target).value)"
              (keydown.enter)="handleCityInputEnter($event)"
              placeholder="Digite o nome da cidade"
              autocomplete="off"
            />
            <button
              lib-button
              type="button"
              data-testid="add-congregation-add-city-btn"
              [disabled]="isSubmitting()"
              (click)="addCityChip()"
            >
              Adicionar
            </button>
          </div>
          @if (cities().length > 0) {
            <lib-chip-list class="mt-3" ariaLabel="Cidades adicionadas" data-testid="add-congregation-cities-chips">
              @for (city of cities(); track city) {
                <lib-chip
                  [label]="city"
                  [removable]="true"
                  [disabled]="isSubmitting()"
                  (removed)="removeCityChip(city)"
                />
              }
            </lib-chip-list>
          }
        </lib-form-field>

        <lib-divider />

        <section data-testid="add-congregation-settings-section">
          <h3 class="t-headline3 mb-4">Configurações</h3>
          <lib-form-field>
            <label lib-label for="add-congregation-expiry-days">Dias de validade da designação</label>
            <input
              lib-input
              type="number"
              libOnlyNumbers
              min="1"
              formControlName="designationAccessExpiryDays"
              id="add-congregation-expiry-days"
              data-testid="add-congregation-expiry-days-input"
            />
          </lib-form-field>

          <lib-form-field class="mt-4" orientation="horizontal">
            <label lib-label for="add-congregation-block-expired">Bloquear ações após expirar</label>
            <input
              type="checkbox"
              formControlName="shouldDesignationBlockAfterExpired"
              id="add-congregation-block-expired"
              data-testid="add-congregation-block-expired-checkbox"
            />
          </lib-form-field>
        </section>
      </form>

      <lib-dialog-footer>
        <div class="flex justify-end gap-4">
          <button
            lib-button
            type="button"
            libDialogClose
            data-testid="add-congregation-cancel"
            [disabled]="isSubmitting()"
          >
            Cancelar
          </button>
          <button
            lib-button
            btnType="primary"
            type="submit"
            form="add-congregation-form"
            data-testid="add-congregation-submit"
            [disabled]="!canSubmit() || isSubmitting()"
          >
            @if (isSubmitting()) {
              <lib-spinner height="1.75rem" width="1.75rem" [color]="white" />
            } @else {
              Criar
            }
          </button>
        </div>
      </lib-dialog-footer>
    </lib-dialog>
  `,
})
export class CongregationAddDialogComponent {
  private readonly congregationBO = inject(CongregationBO);
  private readonly dialogRef = inject<DialogRef<Congregation>>(DialogRef);
  private readonly toaster = inject(ToasterService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly white = white100;
  readonly isSubmitting = signal(false);
  readonly cityInput = signal('');
  readonly cities = signal<string[]>([]);

  readonly form: FormGroup<AddCongregationForm> = new FormGroup({
    name: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    locatedOn: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    designationAccessExpiryDays: new FormControl<number>(
      environment.congregationSettingsDefaultValues.designationAccessExpiryDays,
      {
        validators: [Validators.required, Validators.min(1)],
        nonNullable: true,
      },
    ),
    shouldDesignationBlockAfterExpired: new FormControl<boolean>(
      environment.congregationSettingsDefaultValues.shouldDesignationBlockAfterExpired,
      { nonNullable: true },
    ),
  });

  private readonly formValues = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  protected readonly canSubmit = computed(() => {
    const val = this.formValues();
    return (
      Boolean(val.name?.trim()) &&
      Boolean(val.locatedOn?.trim()) &&
      this.cities().length > 0 &&
      Number(val.designationAccessExpiryDays) > 0
    );
  });

  handleCityInputEnter(event: Event): void {
    event.preventDefault();
    this.addCityChip();
  }

  addCityChip(): void {
    const trimmed = this.cityInput().trim();
    if (!trimmed) {
      return;
    }

    const exists = this.cities().some((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      return;
    }

    this.cities.update((current) => [...current, trimmed]);
    this.cityInput.set('');
  }

  removeCityChip(city: string): void {
    this.cities.update((current) => current.filter((c) => c !== city));
  }

  handleSubmit(): void {
    if (!this.canSubmit() || this.isSubmitting()) {
      return;
    }

    const raw = this.form.getRawValue();
    this.dialogRef.disableClose = true;
    this.isSubmitting.set(true);

    this.congregationBO
      .createCongregation({
        name: raw.name.trim(),
        locatedOn: raw.locatedOn.trim(),
        cities: this.cities(),
        settings: {
          designationAccessExpiryDays: Number(raw.designationAccessExpiryDays),
          shouldDesignationBlockAfterExpired: Boolean(raw.shouldDesignationBlockAfterExpired),
        },
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.dialogRef.disableClose = false;
          this.isSubmitting.set(false);
        }),
      )
      .subscribe({
        next: (created) => {
          this.toaster.success('Congregação criada com sucesso!');
          this.dialogRef.close(created);
        },
        error: () => {
          this.toaster.error('Erro ao criar congregação.');
        },
      });
  }
}
