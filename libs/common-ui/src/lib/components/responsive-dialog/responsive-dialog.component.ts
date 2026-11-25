import { BreakpointObserver } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, of } from 'rxjs';

import { BottomSheetComponent } from '../bottom-sheet/bottom-sheet.component';
import { DialogComponent } from '../dialog';

export const DESKTOP_DIALOG_BREAKPOINT = '(min-width: 768px)';

/**
 * Renders `<lib-dialog>` on desktop/tablet viewports (`>= 768px`) and `<lib-bottom-sheet>` on
 * mobile viewports (`< 768px`), sharing a single projected template for header, body, and footer.
 */
@Component({
  selector: 'lib-responsive-dialog',
  styleUrls: ['./responsive-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.responsive-dialog--desktop]': 'isDesktop()',
  },
  template: `
    @if (isDesktop()) {
      <lib-dialog [title]="title()" [closable]="closable()">
        <ng-container ngProjectAs="[dialogHeader]">
          <ng-container [ngTemplateOutlet]="headerTpl" />
        </ng-container>
        <ng-container [ngTemplateOutlet]="bodyTpl" />
        <ng-container ngProjectAs="lib-dialog-footer">
          <ng-container [ngTemplateOutlet]="footerTpl" />
        </ng-container>
      </lib-dialog>
    } @else {
      <lib-bottom-sheet [title]="title()" [closable]="closable()">
        <ng-container ngProjectAs="[dialogHeader]">
          <ng-container [ngTemplateOutlet]="headerTpl" />
        </ng-container>
        <ng-container [ngTemplateOutlet]="bodyTpl" />
        <ng-container ngProjectAs="lib-dialog-footer">
          <ng-container [ngTemplateOutlet]="footerTpl" />
        </ng-container>
      </lib-bottom-sheet>
    }

    <ng-template #headerTpl>
      <ng-content select="[dialogHeader]" />
    </ng-template>
    <ng-template #bodyTpl>
      <ng-content />
    </ng-template>
    <ng-template #footerTpl>
      <ng-content select="lib-dialog-footer" />
    </ng-template>
  `,
  imports: [BottomSheetComponent, DialogComponent, NgTemplateOutlet],
})
export class ResponsiveDialogComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);

  title = input('');
  closable = input(true);

  readonly isDesktop = toSignal(
    (
      this.breakpointObserver.observe(DESKTOP_DIALOG_BREAKPOINT) ??
      of({ matches: Boolean(this.breakpointObserver.isMatched(DESKTOP_DIALOG_BREAKPOINT)), breakpoints: {} })
    ).pipe(map((state) => state.matches)),
    { initialValue: Boolean(this.breakpointObserver.isMatched(DESKTOP_DIALOG_BREAKPOINT)) },
  );
}
