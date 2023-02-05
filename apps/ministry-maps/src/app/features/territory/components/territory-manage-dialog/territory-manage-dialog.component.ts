import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { lastValueFrom, Observable } from 'rxjs';

import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { Congregation } from '../../../../../models/congregation';
import { Territory, TerritoryIcon } from '../../../../../models/territory';

export type TerritoryDialogData = {
  territory?: Territory;
  congregationId: string;
  cities: Congregation['cities'];
};

type TerritoryForm = {
  city: FormControl<string>;
  address: FormControl<string>;
  note: FormControl<string>;
  mapsLink: FormControl<string | undefined>;
  icon: FormControl<TerritoryIcon>;
};

@Component({
  selector: 'kingdom-apps-territory-manage-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./territory-manage-dialog.component.scss'],
  template: `
    <lib-dialog title="{{ isEdit ? 'Editar Território' : 'Adicionar Território' }}">
      <form [formGroup]='form' (ngSubmit)='handleSubmission()' id='territory-form'>
        <lib-form-field>
          <label lib-label for='congregation-city'>Cidade</label>
          <select lib-select formControlName='city' id='congregation-city'>
            <option [value]='city' *ngFor='let city of data.cities'>
              {{ city }}
            </option>
          </select>
        </lib-form-field>
        <lib-form-field class='mt-5'>
          <label lib-label for='congregation-icon'>Ícone</label>
          <select lib-select formControlName='icon' id='congregation-icon'>
            <option [value]='territoryIcon' *ngFor='let territoryIcon of territoryIcons'>
              {{ territoryIcon | territoryIconTranslator }}
            </option>
          </select>
        </lib-form-field>
        <lib-form-field class='mt-5'>
          <label lib-label for='congregation-address'>Endereço</label>
          <input lib-input formControlName='address' type='text' id='congregation-address' />
        </lib-form-field>
        <lib-form-field class='mt-5'>
          <label lib-label for='note'>Observação</label>
          <textarea
            lib-input
            formControlName='note'
            type='text'
            id='note'
            class='resize-y'
            autocomplete='off'></textarea>
        </lib-form-field>
        <lib-form-field class='mt-5'>
          <label lib-label for='congregation-maps-link'>Link do Maps</label>
          <input lib-input
                 formControlName='mapsLink'
                 type='text'
                 id='congregation-maps-link'
                 autocomplete='off'
                 placeholder='https://goo.gl/maps/* ou https://maps.app.goo.gl/*' />
        </lib-form-field>
      </form>
      <lib-dialog-footer>
        <div class='flex justify-end gap-4'>
          <button lib-button (click)='handleCancel()'>Cancelar</button>
          <button
            lib-button
            btnType='primary'
            type='submit'
            form='territory-form'
            [disabled]='!this.form.valid || isSubmitting'>
            {{ isEdit ? 'Salvar' : 'Adicionar' }}
          </button>
        </div>
      </lib-dialog-footer>
    </lib-dialog>
  `,
})
export class TerritoryManageDialogComponent implements OnInit {
  public readonly territoryIcons: TerritoryIcon[] = Object.values(TerritoryIcon);
  public isSubmitting = false;

  isEdit: boolean;
  form!: FormGroup<TerritoryForm>;

  constructor(
    @Inject(DIALOG_DATA) public readonly data: TerritoryDialogData,
    private readonly territoriesRepository: TerritoryRepository,
    private readonly dialogRef: DialogRef
  ) {
    this.isEdit = !!this.data.territory;
  }

  ngOnInit(): void {
    const fb = new FormBuilder();

    this.form = fb.group({
      city: fb.control(this.data.cities[0], { validators: [Validators.required], nonNullable: true }),
      icon: fb.control(this.territoryIcons[0], { validators: [Validators.required], nonNullable: true }),
      address: fb.control('', { validators: [Validators.required], nonNullable: true }),
      note: fb.control('', { nonNullable: true }),
      mapsLink: fb.control<string | undefined>(undefined, { nonNullable: true }),
    });

    if (this.data.territory) {
      this.form.patchValue(this.data.territory);
    }
  }

  async handleSubmission() {
    let territory: Omit<Territory, 'id'>;

    if (this.data.territory) {
      territory = {
        ...this.data.territory,
        ...this.form.value,
      };
    } else {
      territory = {
        ...this.form.getRawValue(),
        history: [],
        congregationId: this.data.congregationId,
      };
    }

    this.isSubmitting = true;

    const territoryRequest$: Observable<unknown> = this.data.territory
      ? this.territoriesRepository.update({ ...territory, id: this.data.territory.id })
      : this.territoriesRepository.add(territory);

    lastValueFrom(territoryRequest$)
      .then(() => {
        this.dialogRef.close();
      })
      .finally(() => {
        this.isSubmitting = false;
      });
  }

  // TODO: Refactor the basic dialog logic into a base class
  handleCancel() {
    this.dialogRef.close();
  }
}
