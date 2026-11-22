import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'lib-dialog',
  styleUrls: ['./dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog class="dialog" data-testid="dialog" open>
      <header class="dialog__header">
        <div class="dialog__header-content">
          <ng-content select="[dialogHeader]"></ng-content>
          @if (title()) {
            <h2 class="dialog__header-title">{{ title() }}</h2>
          }
        </div>
        @if (closable()) {
          <button
            type="button"
            class="dialog__header-close-btn"
            data-testid="dialog-close"
            aria-label="Fechar"
            (click)="handleCloseDialog()"
            [tabIndex]="-1"
          >
            <lib-icon icon="x-mark-lined"></lib-icon>
          </button>
        }
      </header>
      <div class="dialog__content" data-testid="dialog-content">
        <ng-content></ng-content>
      </div>
      <ng-content select="lib-dialog-footer"></ng-content>
    </dialog>
  `,
  imports: [IconComponent],
})
export class DialogComponent {
  private readonly dialogRef = inject(DialogRef);

  title = input('');
  closable = input(true);

  handleCloseDialog() {
    this.dialogRef.close();
  }
}
