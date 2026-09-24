import { Directive, inject, input } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';

@Directive({
  selector: '[libDialogClose]',
  host: {
    '(click)': 'onMouseClick()',
  },
})
export class DialogCloseDirective {
  dialogRef = inject<DialogRef<unknown>>(DialogRef);

  /** The result for when this action closes the dialog */
  dialogResult = input<unknown>(undefined, { alias: 'libDialogClose' });

  onMouseClick() {
    this.dialogRef.close(this.dialogResult());
  }
}
