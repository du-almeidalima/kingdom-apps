import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'lib-dialog',
  styleUrls: ['./dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog class="dialog" open>
      <header class="dialog__header">
        <h2 class="dialog__header-title">{{ title }}</h2>
        <button class="dialog__header-close-btn" (click)="handleCloseDialog()">
          <lib-icon icon="x-mark-lined"></lib-icon>
        </button>
      </header>
      <div class="dialog__content">
        <ng-content></ng-content>
      </div>
      <ng-content select="lib-dialog-footer"></ng-content>
    </dialog>
  `,
})
export class DialogComponent {
  @Input()
  title = '';

  constructor(private dialogRef: DialogRef) {}

  handleCloseDialog() {
    this.dialogRef.close();
  }
}
