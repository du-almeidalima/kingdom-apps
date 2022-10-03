import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lib-card-body',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./card-body.component.scss'],
  template: `
    <div class="card-body">
      <ng-content></ng-content>
    </div>
  `,
})
export class CardBodyComponent {}
