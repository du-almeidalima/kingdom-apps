import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
    <lib-dialog [title]='title'>
      <p class="t-body1" [innerHTML]='bodyText'></p>
      <lib-dialog-footer>
        <div class="flex justify-end gap-4">
          <button lib-button (click)="handleCancel(false)" [tabIndex]='1'>Cancelar</button>
          <button lib-button btnType="primary" (click)="handleCancel(true)">Confirmar</button>
        </div>
      </lib-dialog-footer> </lib-dialog
    >\`
  `,
})
export class ConfirmDialogComponent {
  title: string;
  bodyText: SafeHtml;

  constructor(
    private readonly dialogRef: DialogRef,
    private readonly sanitizer: DomSanitizer,
    @Inject(DIALOG_DATA) public readonly data: ConfirmDialogData
  ) {
    this.title = data.title;
    this.bodyText = this.sanitizer.bypassSecurityTrustHtml(data.bodyText);
  }

  // TODO: Refactor the basic dialog logic into a base class
  handleCancel(result: boolean) {
    this.dialogRef.close(result);
  }
}
