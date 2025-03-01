import { ChangeDetectionStrategy, Component, DestroyRef, inject, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { finalize, Observable, retry, switchMap } from 'rxjs';

import { TerritoryRepository } from '../../../../repositories/territories.repository';
import { Congregation } from '../../../../../models/congregation';
import { Territory, TerritoryIcon } from '../../../../../models/territory';
import { white100 } from '@kingdom-apps/common-ui';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export type TerritoryDialogData = {
  territory?: Territory;
  congregationId: string;
  /**
   * Represents the city that is currently selected on the screen. This will be set that as the initial value when
   * creating a new Territory.
   */
  selectedCity?: string;
  cities: Congregation['cities'];
};

type TerritoryForm = {
  city: FormControl<string>;
  address: FormControl<string>;
  note: FormControl<string>;
  mapsLink: FormControl<string | undefined>;
  icon: FormControl<TerritoryIcon>;
  isBibleStudent: FormControl<boolean | undefined>;
  bibleInstructor: FormControl<string | undefined>;
};

@Component({
  selector: 'kingdom-apps-territory-manage-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./territory-manage-dialog.component.scss'],
  template: `
    <lib-dialog title="{{ isEdit ? 'Editar Território' : 'Adicionar Território' }}">
      <form [formGroup]="form" (ngSubmit)="handleSubmission()" id="territory-form">
        <!-- City -->
        <lib-form-field>
          <label lib-label for="territory-city">Cidade</label>
          <select lib-select formControlName="city" id="territory-city">
            <option [value]="city" *ngFor="let city of data.cities">
              {{ city }}
            </option>
          </select>
        </lib-form-field>
        <!-- Icon -->
        <lib-form-field class="mt-5">
          <label lib-label for="territory-icon">Ícone</label>
          <select lib-select formControlName="icon" id="territory-icon">
            <option [value]="territoryIcon" *ngFor="let territoryIcon of territoryIcons">
              {{ territoryIcon | territoryIconTranslator }}
            </option>
          </select>
        </lib-form-field>
        <!-- Address -->
        <lib-form-field class="mt-5">
          <label lib-label for="territory-address">Endereço</label>
          <input lib-input formControlName="address" type="text" id="territory-address" />
        </lib-form-field>
        <!-- Note  -->
        <lib-form-field class="mt-5">
          <label lib-label for="note">Observação</label>
          <textarea
            lib-input
            formControlName="note"
            type="text"
            id="note"
            class="resize-y"
            autocomplete="off"></textarea>
        </lib-form-field>
        <!-- Google Maps Link -->
        <lib-form-field class="mt-5">
          <label lib-label for="territory-maps-link">Link do Maps</label>
          <input
            lib-input
            formControlName="mapsLink"
            type="text"
            id="territory-maps-link"
            autocomplete="off"
            placeholder="https://goo.gl/maps/* ou https://maps.app.goo.gl/*" />
        </lib-form-field>
        <!-- Revisit -->
        <lib-form-field class="mt-4" orientation="horizontal">
          <label lib-label for="bible-student-checkbox">Estudando a Bíblia</label>
          <input formControlName="isBibleStudent" type="checkbox" id="bible-student-checkbox" />
        </lib-form-field>
        @if(this.form.controls.isBibleStudent.value) {
        <!-- Bible Instructor -->
        <lib-form-field class="mt-5">
          <label lib-label for="bible-instructor">Instrutor</label>
          <input
            lib-input
            formControlName="bibleInstructor"
            type="text"
            id="bible-instructor"
            placeholder="Nome do Instrutor" />
        </lib-form-field>
        }
      </form>
      <lib-dialog-footer>
        <div class="flex justify-end gap-4">
          <button lib-button lib-dialog-close>Cancelar</button>
          <button
            lib-button
            btnType="primary"
            type="submit"
            form="territory-form"
            [disabled]="!this.form.valid || isSubmitting">
            <ng-container *ngIf="!isSubmitting">{{ isEdit ? 'Salvar' : 'Adicionar' }}</ng-container>
            <lib-spinner *ngIf="isSubmitting" height="1.75rem" width="1.75rem" [color]="white" />
          </button>
        </div>
      </lib-dialog-footer>
    </lib-dialog>
  `,
})
export class TerritoryManageDialogComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  public readonly territoryIcons: TerritoryIcon[] = Object.values(TerritoryIcon);
  public readonly white = white100;
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

    const initialCity = this.data.territory?.city ?? this.data.selectedCity ?? this.data.cities[0];

    this.form = fb.group({
      city: fb.control(initialCity, { validators: [Validators.required], nonNullable: true }),
      icon: fb.control(this.territoryIcons[0], { validators: [Validators.required], nonNullable: true }),
      address: fb.control('', { validators: [Validators.required], nonNullable: true }),
      note: fb.control('', { nonNullable: true }),
      mapsLink: fb.control<string | undefined>(undefined, { nonNullable: true }),
      isBibleStudent: fb.control<boolean | undefined>(false, { nonNullable: true }),
      bibleInstructor: fb.control<string | undefined>(undefined, { nonNullable: true }),
    });

    if (this.data.territory) {
      this.form.patchValue(this.data.territory);
    }

    // Form Listeners
    this.setIsBibleStudentListener();
  }

  handleSubmission() {
    let territory: Omit<Territory, 'id'>;

    // Update if this.data.territory is true
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

    let territoryRequest$: Observable<unknown>;

    // Update if this.data.territory is true
    if (this.data.territory) {
      territoryRequest$ = this.territoriesRepository.update({ ...territory, id: this.data.territory.id });
    } else {
      // Getting next positionIndex and creating the territory
      territoryRequest$ = this.territoriesRepository.getNextPositionIndexForCity(territory.city).pipe(
        switchMap(positionIndex => {
          territory.positionIndex = positionIndex;

          return this.territoriesRepository.add(territory);
        })
      );
    }

    territoryRequest$
      .pipe(
        retry(3),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe(() => {
        this.dialogRef.close();
      });
  }

  private setIsBibleStudentListener() {
    this.form.controls.isBibleStudent.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      value && this.form.controls.bibleInstructor.reset();
    });
  }
}
