import { Directive, HostListener, Input, inject } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';

@Directive({
  selector: '[libDialogClose]',
})
export class DialogCloseDirective {
  dialogRef = inject<DialogRef<unknown>>(DialogRef);

  /** The result for when this action closes the dialog */
  @Input('libDialogClose')
  dialogResult?: unknown;

  @HostListener('click')
  onMouseClick() {
    this.dialogRef.close(this.dialogResult);
  }
}
