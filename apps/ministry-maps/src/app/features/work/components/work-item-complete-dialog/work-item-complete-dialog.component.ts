import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { VisitOutcome } from '../../../../../models/enums/visit-outcome';

type WorkItemCompleteForm = {
  visitOutcome: FormControl<VisitOutcome>;
};

@Component({
  selector: 'kingdom-apps-work-item-complete-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./work-item-complete-dialog.component.scss'],
  template: `
    <lib-dialog title="Concluir Visita">
      <form id="work-item-complete" [formGroup]="form" (ngSubmit)="handleFormSubmit()">
        <h2 class="mb-4">Resultado da visita</h2>
        <kingdom-apps-visit-outcome-option formControlName="visitOutcome" [value]="visitOutcomeEnum.SPOKE"
          >Morador contatado
        </kingdom-apps-visit-outcome-option>
        <kingdom-apps-visit-outcome-option
          formControlName="visitOutcome"
          [value]="visitOutcomeEnum.NOT_ANSWERED"
          class="mt-3"
          >Ninguém atendeu
        </kingdom-apps-visit-outcome-option>
        <kingdom-apps-visit-outcome-option formControlName="visitOutcome" [value]="visitOutcomeEnum.MOVED" class="mt-3"
          >Morador mudou de endereço
        </kingdom-apps-visit-outcome-option>
        <kingdom-apps-visit-outcome-option
          formControlName="visitOutcome"
          [value]="visitOutcomeEnum.ASKED_TO_NOT_VISIT_AGAIN"
          class="mt-3"
          >Morador pediu para não ser visitado
        </kingdom-apps-visit-outcome-option>
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
  visitOutcomeEnum = VisitOutcome;

  form!: FormGroup<WorkItemCompleteForm>;

  constructor(private readonly dialogRef: DialogRef) {}

  ngOnInit(): void {
    const fb = new FormBuilder().nonNullable;

    this.form = fb.group({
      visitOutcome: fb.control(VisitOutcome.SPOKE, { validators: [Validators.required] }),
    });
  }

  handleCancel() {
    this.dialogRef.close();
  }

  handleFormSubmit() {
    console.log(this.form.getRawValue());
  }
}
