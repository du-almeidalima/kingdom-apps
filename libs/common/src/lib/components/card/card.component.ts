import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'lib-card',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card" [ngStyle]="customStyle">
      <ng-content></ng-content>
    </div>
  `,
})
export class CardComponent {
  @Input()
  customStyle?: any;
}
