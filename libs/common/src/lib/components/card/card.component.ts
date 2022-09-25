import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lib-card',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <ng-content></ng-content>
    </div>
  `,
})
export class CardComponent {}
