import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { white100 } from '../../../';

@Component({
  selector: 'lib-floating-action-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./floating-action-button.component.scss'],
  template: `
    <button class="floating-action-btn" [style.--backgroundColor]="backgroundColor" (click)="btnClick.emit($event)">
      <ng-content></ng-content>
    </button>
  `,
})
export class FloatingActionButtonComponent {
  @Input()
  backgroundColor = white100;

  @Output()
  btnClick = new EventEmitter<MouseEvent>();
}
