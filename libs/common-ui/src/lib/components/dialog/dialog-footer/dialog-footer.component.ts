import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lib-dialog-footer',
  styleUrls: ['./dialog-footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="dialog-footer">
      <ng-content></ng-content>
    </footer>
  `,
})
export class DialogFooterComponent {}
