import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgStyle } from '@angular/common';

@Component({
  selector: 'lib-card',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card" [ngStyle]="customStyle()">
      <ng-content></ng-content>
    </div>
  `,
  imports: [NgStyle],
})
export class CardComponent {
  customStyle = input<Record<string, string | number> | null | undefined>(undefined);
}
