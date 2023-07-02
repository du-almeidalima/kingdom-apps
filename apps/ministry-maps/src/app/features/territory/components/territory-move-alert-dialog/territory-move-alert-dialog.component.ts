import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { grey400, white100 } from '@kingdom-apps/common-ui';

import { VisitOutcomeEnum } from '../../../../../models/enums/visit-outcome';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { finalize, Observable } from 'rxjs';

export type TerritoryMoveAlertDialogData = {
  history: TerritoryVisitHistory[];
  markAsResolvedCallback: (history: TerritoryVisitHistory[]) => Observable<any>;
};

export enum MoveResolutionActionsEnum {
  MARK_AS_RESOLVED,
  DELETE_TERRITORY,
  EDIT_TERRITORY,
}

@Component({
  selector: 'kingdom-apps-territory-move-alert-dialog',
  styleUrls: ['./territory-move-alert-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-dialog title="Morador Mudou">
      <p class="t-body2 mb-5">Recentemente um publicador reportou que esse morador não está mais nesse endereço:</p>
      <!-- REPORTS -->
      <div class='overflow-y-auto' style='max-height: 30dvh'>
        <figure class="quote-report" *ngFor="let report of historyReports">
          <blockquote class="quote-report__quote">
            {{ report.notes }}
          </blockquote>
          <figcaption class="quote-report__caption text-gray-600 t-caption">{{ report.date | date }}</figcaption>
        </figure>
      </div>

      <!-- ACTION -->
      <p class="t-body2 my-5">O que você quer fazer?</p>
      <form id="move-alert-resolution-form" [formGroup]="form" (ngSubmit)="handleFormSubmit()">
        <kingdom-apps-icon-radio formControlName="action" [value]="MoveResolutionActions.MARK_AS_RESOLVED" class="mt-3">
          <lib-icon class="icon-radio__icon" icon="check-mark-circle-lined" [fillColor]="iconColor" />
          Remover Marcação
        </kingdom-apps-icon-radio>
        <kingdom-apps-icon-radio formControlName="action" [value]="MoveResolutionActions.DELETE_TERRITORY" class="mt-3">
          <lib-icon class="icon-radio__icon" icon="trash-can-lined" [fillColor]="iconColor" />
          Apagar Endereço
        </kingdom-apps-icon-radio>
        <kingdom-apps-icon-radio formControlName="action" [value]="MoveResolutionActions.EDIT_TERRITORY" class="mt-3">
          <lib-icon class="icon-radio__icon" icon="pencil-lined" [fillColor]="iconColor" />
          Editar Endereço
        </kingdom-apps-icon-radio>
      </form>

      <!-- FOOTER -->
      <lib-dialog-footer>
        <div class="flex flex-nowrap justify-end gap-4">
          <button lib-button lib-dialog-close>Cancelar</button>
          <button lib-button btnType="primary" type="submit" form="move-alert-resolution-form">
            <span *ngIf="!isSubmitting">Salvar</span>
            <lib-spinner
              *ngIf="isSubmitting"
              class="login-button__spinner"
              height="1.75rem"
              width="1.75rem"
              [color]="white" />
          </button>
        </div>
      </lib-dialog-footer>
    </lib-dialog>
  `,
})
export class TerritoryMoveAlertDialogComponent {
  protected readonly white = white100;
  protected readonly iconColor = grey400;
  public readonly MoveResolutionActions = MoveResolutionActionsEnum;

  public isSubmitting = false;
  public historyReports: TerritoryVisitHistory[] = [];

  public form: FormGroup<{ action: FormControl<MoveResolutionActionsEnum> }>;

  constructor(
    @Inject(DIALOG_DATA) public readonly data: TerritoryMoveAlertDialogData,
    private readonly dialogRef: DialogRef
  ) {
    this.historyReports = data.history?.filter(history => {
      return history.visitOutcome === VisitOutcomeEnum.MOVED && history?.notes?.length > 1;
    });

    this.form = new FormGroup({
      action: new FormControl(MoveResolutionActionsEnum.MARK_AS_RESOLVED as MoveResolutionActionsEnum, {
        nonNullable: true,
      }),
    });
  }

  handleFormSubmit() {
    switch (this.form.value.action) {
      case MoveResolutionActionsEnum.DELETE_TERRITORY:
      case MoveResolutionActionsEnum.EDIT_TERRITORY:
        this.dialogRef.close(this.form.value.action);
        break;
      case MoveResolutionActionsEnum.MARK_AS_RESOLVED:
        this.isSubmitting = true;
        this.data
          .markAsResolvedCallback(this.data.history)
          .pipe(
            finalize(() => {
              this.isSubmitting = false;
            })
          )
          .subscribe(() => {
            this.dialogRef.close();
          });
        break;
    }
  }
}
