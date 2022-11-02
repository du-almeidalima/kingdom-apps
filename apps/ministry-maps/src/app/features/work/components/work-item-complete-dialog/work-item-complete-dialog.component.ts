import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';

type WorkItemCompleteForm = {
  visitOutcome: FormControl<VisitOutcomeEnum>;
};

@Component({
  selector: 'kingdom-apps-work-item-complete-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./work-item-complete-dialog.component.scss'],
  template: `
    <lib-dialog title="Concluir Visita">
      <form id="work-item-complete" [formGroup]="form" (ngSubmit)="handleFormSubmit()">
        <!-- Visit Outcome -->
        <h3 class="mb-4">Resultado da visita</h3>
        <kingdom-apps-visit-outcome-option formControlName="visitOutcome" [value]="VisitOutcome.SPOKE"
          >Morador contatado
        </kingdom-apps-visit-outcome-option>
        <kingdom-apps-visit-outcome-option
          formControlName="visitOutcome"
          [value]="VisitOutcome.NOT_ANSWERED"
          class="mt-3"
          >Ninguém atendeu
        </kingdom-apps-visit-outcome-option>
        <kingdom-apps-visit-outcome-option formControlName="visitOutcome" [value]="VisitOutcome.MOVED" class="mt-3"
          >Morador mudou de endereço
        </kingdom-apps-visit-outcome-option>
        <kingdom-apps-visit-outcome-option
          formControlName="visitOutcome"
          [value]="VisitOutcome.ASKED_TO_NOT_VISIT_AGAIN"
          class="mt-3"
          >Morador pediu para não ser visitado
        </kingdom-apps-visit-outcome-option>

        <!-- Revisita -->
        <lib-form-field class="mt-4" orientation="horizontal">
          <label lib-label for="revisit-checkbox">Aceitou revisita</label>
          <input type="checkbox" id="revisit-checkbox" />
        </lib-form-field>

        <!-- Notas -->
        <h3 class="my-4">Notas</h3>
        <lib-form-field>
          <label lib-label for="congregation-icon">Conte como foi o contato</label>
          <textarea lib-input rows="4" formControlName="address" class="resize-y" type="text" id="congregation-address">
          </textarea>
        </lib-form-field>
      </form>
      <lib-dialog-footer>
        <div class="flex justify-end gap-4">
          <button lib-button (click)="handleCancel()">Cancelar</button>
          <button lib-button btnType="primary" type="submit" form="work-item-complete">Concluir</button>
        </div>
      </lib-dialog-footer>
    </lib-dialog>
  `,
})
export class WorkItemCompleteDialogComponent implements OnInit {
  public readonly VisitOutcome = VisitOutcomeEnum;

  form!: FormGroup<WorkItemCompleteForm>;

  constructor(private readonly dialogRef: DialogRef) {}

  ngOnInit(): void {
    const fb = new FormBuilder().nonNullable;

    this.form = fb.group({
      visitOutcome: fb.control(VisitOutcomeEnum.SPOKE, { validators: [Validators.required] }),
    });
  }

  handleCancel() {
    this.dialogRef.close();
  }

  handleFormSubmit() {
    console.log(this.form.getRawValue());
  }
}
