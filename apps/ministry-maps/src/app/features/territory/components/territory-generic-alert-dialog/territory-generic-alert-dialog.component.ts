import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DialogCloseDirective,
  DialogComponent,
  DialogFooterComponent,
  IconComponent,
  SpinnerComponent,
  white100,
} from '@kingdom-apps/common-ui';
import { TerritoryVisitHistory } from '../../../../../models/territory-visit-history';
import { finalize, Observable } from 'rxjs';
import { DatePipe, SlicePipe } from '@angular/common';

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
        @for (report of data.history; track report.id) {
          <figure class="quote-report">
            <blockquote class="quote-report__quote">
              {{ report.notes }}
            </blockquote>
            <figcaption class="quote-report__caption text-gray-600 t-caption">
              @if (report.name) {
                <span>{{ report.name | slice : 0 : 30 }}</span
                >,&nbsp;
              }
              {{ report.date | date }}
            </figcaption>
          </figure>
        }
      </div>

      <!-- FOOTER -->
      <lib-dialog-footer>
        <div class="flex flex-nowrap justify-end gap-4">
          <button lib-button libDialogClose>Cancelar</button>
          <button lib-button btnType="primary" (click)="handleResolveAlert()">
            @if (!isSubmitting) {
              <div class="flex gap-1.5 items-center">
                <lib-icon class="h-7 w-7" icon="check-mark-circle-lined" />
                <span>Remover Marcação</span>
              </div>
            } @else {
              <lib-spinner class="login-button__spinner" height="1.75rem" width="1.75rem" [color]="white" />
            }
          </button>
        </div>
      </lib-dialog-footer>
    </lib-dialog>
  `,
  imports: [
    SpinnerComponent,
    ButtonComponent,
    IconComponent,
    DatePipe,
    SlicePipe,
    DialogComponent,
    DialogFooterComponent,
    DialogCloseDirective,
  ],
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
