import { ChangeDetectionStrategy, Component, Inject, OnInit, Optional } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { ControlsOf } from '../../../../shared/utils/controls-of';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import {
  ButtonComponent,
  DialogCloseDirective,
  DialogComponent,
  DialogFooterComponent,
  FormFieldComponent,
  grey400,
  IconComponent,
  InputComponent, LabelComponent,
} from '@kingdom-apps/common-ui';
import { IconRadioComponent } from '../../../../shared/components/visit-outcome-option/icon-radio.component';
import { VisitOutcomeToIconPipe } from '../../../../shared/pipes/visit-outcome-to-icon/visit-outcome-to-icon.pipe';

export type WorkItemCompleteDialogData = Required<
  Pick<TerritoryVisitHistory, 'visitOutcome' | 'isRevisit' | 'notes' | 'name'>
>;

type WorkItemCompleteForm = ControlsOf<WorkItemCompleteDialogData>;

@Component({
  selector: 'kingdom-apps-work-item-complete-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./work-item-complete-dialog.component.scss'],
  template: `
    <lib-dialog [title]="isEdit ? 'Editar Visita' : 'Concluir Visita'">
      <form id="work-item-complete" [formGroup]="form" (ngSubmit)="handleFormSubmit()" tabindex="0">
        <!-- Visit Outcome -->
        <h3 class="mb-4 t-headline4">Resultado da visita</h3>
        <kingdom-apps-icon-radio formControlName="visitOutcome" [value]="VisitOutcome.SPOKE">
          <lib-icon class="icon-radio__icon" [icon]="VisitOutcome.SPOKE | visitOutcomeToIcon" [fillColor]="iconColor" />
          Morador contatado
        </kingdom-apps-icon-radio>
        <kingdom-apps-icon-radio formControlName="visitOutcome" [value]="VisitOutcome.NOT_ANSWERED" class="mt-3">
          <lib-icon
            class="icon-radio__icon"
            [icon]="VisitOutcome.NOT_ANSWERED | visitOutcomeToIcon"
            [fillColor]="iconColor" />
          Ninguém atendeu
        </kingdom-apps-icon-radio>
        <kingdom-apps-icon-radio formControlName="visitOutcome" [value]="VisitOutcome.MOVED" class="mt-3">
          <lib-icon class="icon-radio__icon" [icon]="VisitOutcome.MOVED | visitOutcomeToIcon" [fillColor]="iconColor" />
          Morador mudou de endereço
        </kingdom-apps-icon-radio>
        <kingdom-apps-icon-radio
          formControlName="visitOutcome"
          [value]="VisitOutcome.ASKED_TO_NOT_VISIT_AGAIN"
          class="mt-3">
          <lib-icon
            class="icon-radio__icon"
            [icon]="VisitOutcome.ASKED_TO_NOT_VISIT_AGAIN | visitOutcomeToIcon"
            [fillColor]="iconColor" />
          Morador pediu para não ser visitado
        </kingdom-apps-icon-radio>

        <!-- Revisit -->
        <lib-form-field class="mt-4" orientation="horizontal">
          <label lib-label for="revisit-checkbox">Aceitou revisita</label>
          <input formControlName="isRevisit" type="checkbox" id="revisit-checkbox" />
        </lib-form-field>

        <!-- Name -->
        <lib-form-field class="mt-5">
          <label lib-label for="publisher-name">
            Seu Nome @if (isNameRequired) {
            <span style="color: red"> *</span>
            }
          </label>
          <input lib-input formControlName="name" type="text" id="publisher-name" autocomplete="publisher-name" />
          @if (isNameRequired && form.controls.name.invalid) {
          <span class="form-control-error">Por favor, coloque o seu nome</span>
          }
        </lib-form-field>

        <!-- Notes -->
        <h3 class="my-4 t-headline4">Notas</h3>
        <lib-form-field>
          <label lib-label for="congregation-icon">Conte como foi o contato:</label>
          <textarea
            lib-input
            id="congregation-address"
            rows="4"
            type="text"
            formControlName="notes"
            class="resize-y"
            style="font-size: 1.4rem">
          </textarea>
        </lib-form-field>
      </form>
      <lib-dialog-footer class="sticky bottom-0 left-0 right-0">
        <div class="flex justify-end gap-4">
          <button lib-button libDialogClose>Cancelar</button>
          <button lib-button btnType="primary" type="submit" form="work-item-complete" [disabled]="form.invalid">
            {{ isEdit ? 'Atualizar' : 'Concluir' }}
          </button>
        </div>
      </lib-dialog-footer>
    </lib-dialog>
  `,
  imports: [
    DialogFooterComponent,
    DialogCloseDirective,
    LabelComponent,
    FormFieldComponent,
    InputComponent,
    DialogComponent,
    IconRadioComponent,
    ReactiveFormsModule,
    IconComponent,
    VisitOutcomeToIconPipe,
    ButtonComponent,
  ],
})
export class WorkItemCompleteDialogComponent implements OnInit {
  public readonly VisitOutcome = VisitOutcomeEnum;
  public readonly iconColor = grey400;
  isEdit = false;
  // Not sure if tracking this manually is the best approach, it doesn't seem Angular offers a solutions that doesn't call a function for this.
  isNameRequired = false;

  form!: FormGroup<WorkItemCompleteForm>;

  constructor(
    private readonly dialogRef: DialogRef,
    @Optional() @Inject(DIALOG_DATA) public readonly data: WorkItemCompleteDialogData
  ) {
    this.dialogRef.disableClose = true;
  }

  ngOnInit(): void {
    const fb = new FormBuilder().nonNullable;

    this.form = fb.group<WorkItemCompleteForm>({
      visitOutcome: fb.control(VisitOutcomeEnum.SPOKE, { validators: [Validators.required] }),
      isRevisit: fb.control(false),
      notes: fb.control(''),
      name: fb.control(''),
    });

    // Edit
    if (this.data) {
      this.isEdit = true;
      this.form.patchValue(this.data);
    }

    // Form Listeners
    this._setIsRevisitListener();
  }

  handleFormSubmit() {
    if (this.form.invalid) {
      return;
    }

    this.dialogRef.close(this.form.value);
  }

  private _setIsRevisitListener() {
    this.form.controls.isRevisit.valueChanges.subscribe(value => {
      if (value) {
        this.form.controls.name.addValidators(Validators.required);
        this.form.controls.name.updateValueAndValidity();
        this.isNameRequired = true;
      } else {
        this.form.controls.name.clearValidators();
        this.isNameRequired = false;
      }
    });
  }
}
