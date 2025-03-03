import { Directive, HostListener, Input } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';

@Directive({
  selector: '[libDialogClose]',
})
export class DialogCloseDirective {
  /** The result for when this action closes the dialog */
  @Input('libDialogClose')
  dialogResult: any;

  constructor(public dialogRef: DialogRef<any>) {}

  @HostListener('click')
  onMouseClick() {
    this.dialogRef.close(this.dialogResult);
  }
}
