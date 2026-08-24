import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DialogComponent, DialogFooterComponent } from '../dialog';
import { ButtonComponent } from '../button/button.component';

export type ConfirmDialogData = {
  title: string;
  // In the future we could try to accept another that that could accept components or an array of paragraphs
  bodyText: string;
};

/**
 * Generic usage of the <dialog> component to YES or NO actions.
 */
@Component({
  selector: 'lib-confirm-dialog',
  styleUrls: ['./confirm-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-dialog [title]="title" data-testid="confirm-dialog">
      <p class="t-body1" [innerHTML]="bodyText"></p>
      <lib-dialog-footer>
        <div class="flex justify-end gap-4">
          <button lib-button data-testid="confirm-dialog-cancel" (click)="handleCancel(false)" [tabIndex]="1">
            Cancelar
          </button>
          <button lib-button btnType="primary" data-testid="confirm-dialog-confirm" (click)="handleCancel(true)">
            Confirmar
          </button>
        </div>
      </lib-dialog-footer>
    </lib-dialog>
  `,
  imports: [DialogComponent, ButtonComponent, DialogFooterComponent],
})
export class ConfirmDialogComponent {
  private readonly dialogRef = inject(DialogRef);
  private readonly sanitizer = inject(DomSanitizer);
  readonly data = inject<ConfirmDialogData>(DIALOG_DATA);

  title: string;
  bodyText: SafeHtml;

  constructor() {
    const data = this.data;

    this.title = data.title;
    this.bodyText = this.sanitizer.bypassSecurityTrustHtml(data.bodyText);
  }

  // TODO: Refactor the basic dialog logic into a base class
  handleCancel(result: boolean) {
    this.dialogRef.close(result);
  }
}
