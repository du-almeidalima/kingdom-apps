import { ChangeDetectionStrategy, Component, Inject, OnInit, Optional } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { ControlsOf } from '../../../../shared/utils/controls-of';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { grey400 } from '@kingdom-apps/common-ui';

export type WorkItemCompleteDialogData = Pick<TerritoryVisitHistory, 'visitOutcome' | 'isRevisit' | 'notes'>;

type WorkItemCompleteForm = ControlsOf<WorkItemCompleteDialogData>;

@Component({
  selector: 'kingdom-apps-work-item-complete-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./work-item-complete-dialog.component.scss'],
  template: `
    <lib-dialog [title]="isEdit ? 'Editar Visita' : 'Concluir Visita'">
      <form id='work-item-complete' [formGroup]='form' (ngSubmit)='handleFormSubmit()' tabindex='0'>
        <!-- Visit Outcome -->
        <h3 class='mb-4 t-headline4'>Resultado da visita</h3>
        <kingdom-apps-icon-radio formControlName='visitOutcome' [value]='VisitOutcome.SPOKE'>
          <lib-icon class='icon-radio__icon' [icon]='VisitOutcome.SPOKE | visitOutcomeToIcon' [fillColor]='iconColor' />
          Morador contatado
        </kingdom-apps-icon-radio>
        <kingdom-apps-icon-radio formControlName='visitOutcome' [value]='VisitOutcome.NOT_ANSWERED' class='mt-3'>
          <lib-icon class='icon-radio__icon'
                    [icon]='VisitOutcome.NOT_ANSWERED | visitOutcomeToIcon'
                    [fillColor]='iconColor'
          />
          Ninguém atendeu
        </kingdom-apps-icon-radio>
        <kingdom-apps-icon-radio formControlName='visitOutcome' [value]='VisitOutcome.MOVED' class='mt-3'>
          <lib-icon class='icon-radio__icon' [icon]='VisitOutcome.MOVED | visitOutcomeToIcon' [fillColor]='iconColor' />
          Morador mudou de endereço
        </kingdom-apps-icon-radio>
        <kingdom-apps-icon-radio
          formControlName='visitOutcome'
          [value]='VisitOutcome.ASKED_TO_NOT_VISIT_AGAIN'
          class='mt-3'
        >
          <lib-icon class='icon-radio__icon'
                    [icon]='VisitOutcome.ASKED_TO_NOT_VISIT_AGAIN | visitOutcomeToIcon'
                    [fillColor]='iconColor'
          />
          Morador pediu para não ser visitado
        </kingdom-apps-icon-radio>

        <!-- Revisita -->
        <lib-form-field class='mt-4' orientation='horizontal'>
          <label lib-label for='revisit-checkbox'>Aceitou revisita</label>
          <input formControlName='isRevisit' type='checkbox' id='revisit-checkbox' />
        </lib-form-field>

        <!-- Notas -->
        <h3 class='my-4 t-headline4'>Notas</h3>
        <lib-form-field>
          <label lib-label for='congregation-icon'>Conte como foi o contato</label>
          <textarea lib-input rows='4' formControlName='notes' class='resize-y' type='text' id='congregation-address'>
          </textarea>
        </lib-form-field>
      </form>
      <lib-dialog-footer class='sticky bottom-0 left-0 right-0'>
        <div class='flex justify-end gap-4'>
          <button lib-button (click)='handleCancel()'>Cancelar</button>
          <button lib-button btnType='primary' type='submit' form='work-item-complete'>
            {{isEdit ? 'Atualizar' : 'Concluir'}}
          </button>
        </div>
      </lib-dialog-footer>
    </lib-dialog>
  `,
})
export class WorkItemCompleteDialogComponent implements OnInit {
  public readonly VisitOutcome = VisitOutcomeEnum;
  public readonly iconColor = grey400;
  isEdit = false;

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
    });

    // Edit
    if (this.data) {
      this.isEdit = true;
      this.form.patchValue(this.data);
    }
  }
  // TODO: Refactor the basic dialog logic into a base class
  handleCancel() {
    this.dialogRef.close();
  }

  handleFormSubmit() {
    this.dialogRef.close(this.form.value);
  }

  protected readonly grey400 = grey400;
}
