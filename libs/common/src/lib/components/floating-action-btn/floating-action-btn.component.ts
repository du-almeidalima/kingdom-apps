import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { white100 } from '../../../';

@Component({
  selector: 'lib-floating-action-btn',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./floating-action-btn.component.scss'],
  template: `
    <button class="floating-action-btn" [style.--backgroundColor]="backgroundColor" (click)="btnClick.emit($event)">
      <ng-content></ng-content>
    </button>
  `,
})
export class FloatingActionBtnComponent {
  @Input()
  backgroundColor = white100;

  @Output()
  btnClick = new EventEmitter<MouseEvent>();
}
