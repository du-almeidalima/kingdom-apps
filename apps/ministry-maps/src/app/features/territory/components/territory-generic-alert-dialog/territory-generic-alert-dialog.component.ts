import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { white100 } from '@kingdom-apps/common-ui';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { finalize, Observable } from 'rxjs';

export type TerritoryGenericAlertDialogData = {
  history: TerritoryVisitHistory[];
  markAsResolvedCallback: (history: TerritoryVisitHistory[]) => Observable<any>;
  title: string;
  message: string;
};

/**
 * Generic class for just handling/resolving alerts.
 */
@Component({
  selector: 'kingdom-apps-territory-generic-alert-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-dialog [title]="data.title">
      <p class="t-body2 mb-5">{{ data.message }}</p>
      <!-- REPORTS -->
      <div class="overflow-y-auto" style="max-height: 30dvh">
        <figure class="quote-report" *ngFor="let report of data.history">
          <blockquote class="quote-report__quote">
            {{ report.notes }}
          </blockquote>
          <figcaption class="quote-report__caption text-gray-600 t-caption">
            @if (report.name) {
              <span>{{ report.name | slice : 0 : 30 }}</span>,&nbsp;
            }
            {{ report.date | date }}
          </figcaption>
        </figure>
      </div>

      <!-- FOOTER -->
      <lib-dialog-footer>
        <div class="flex flex-nowrap justify-end gap-4">
          <button lib-button lib-dialog-close>Cancelar</button>
          <button lib-button btnType="primary" (click)="handleResolveAlert()">
            @if (!isSubmitting) {
              <div class="flex gap-1.5 items-center">
                <lib-icon class='h-7 w-7' icon="check-mark-circle-lined" />
                <span>Remover Marcação</span>
              </div>
            } @else {
              <lib-spinner
                *ngIf="isSubmitting"
                class="login-button__spinner"
                height="1.75rem"
                width="1.75rem"
                [color]="white" />
            }
          </button>
        </div>
      </lib-dialog-footer>
    </lib-dialog>
  `,
})
export class TerritoryGenericAlertDialogComponent {
  protected readonly white = white100;

  public isSubmitting = false;

  constructor(
    @Inject(DIALOG_DATA) public readonly data: TerritoryGenericAlertDialogData,
    private readonly dialogRef: DialogRef
  ) {}

  handleResolveAlert() {
    this.isSubmitting = true;

    this.data
      .markAsResolvedCallback(this.data.history)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe(() => {
        this.dialogRef.close(true);
      });
  }
}
