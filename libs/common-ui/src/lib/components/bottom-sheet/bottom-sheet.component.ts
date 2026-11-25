import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { IconButtonComponent } from '../icon-button/icon-button.component';
import { IconComponent } from '../icon/icon.component';

/**
 * Mobile slide-up sheet for CDK Dialog. Put a `lib-dialog-footer` in the content to pin it below
 * the scrollable body.
 */
@Component({
  selector: 'lib-bottom-sheet',
  styleUrls: ['./bottom-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bottom-sheet" role="dialog" aria-modal="true" data-testid="bottom-sheet">
      <header class="bottom-sheet__header">
        <div class="bottom-sheet__header-content">
          <ng-content select="[dialogHeader]"></ng-content>
          @if (title()) {
            <h2 class="bottom-sheet__title t-headline3">{{ title() }}</h2>
          }
        </div>
        @if (closable()) {
          <button
            lib-icon-button
            type="button"
            data-testid="bottom-sheet-close"
            aria-label="Fechar"
            (click)="dialogRef.close()"
          >
            <lib-icon icon="x-mark-lined"></lib-icon>
          </button>
        }
      </header>
      <div class="bottom-sheet__content" data-testid="bottom-sheet-content">
        <ng-content></ng-content>
      </div>
      <div class="bottom-sheet__footer">
        <ng-content select="lib-dialog-footer"></ng-content>
      </div>
    </section>
  `,
  imports: [IconButtonComponent, IconComponent],
})
export class BottomSheetComponent {
  protected readonly dialogRef = inject(DialogRef);

  title = input('');
  /** When false the header close button is hidden; Escape and backdrop stay governed by `disableClose`. */
  closable = input(true);
}
