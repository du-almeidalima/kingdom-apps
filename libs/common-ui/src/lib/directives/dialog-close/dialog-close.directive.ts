import { Directive, HostListener, Input } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';

@Directive({
  selector: '[lib-dialog-close]',
})
export class DialogCloseDirective {
  /** The result for when this action closes the dialog */
  @Input('lib-dialog-close')
  dialogResult: any;

  constructor(public dialogRef: DialogRef<any>) {}

  @HostListener('click')
  onMouseClick() {
    this.dialogRef.close(this.dialogResult);
  }
}
