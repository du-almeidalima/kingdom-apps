import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'lib-chip-list',
  styleUrls: ['./chip-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chip-list" role="list" [attr.aria-label]="ariaLabel() || null" data-testid="chip-list">
      <ng-content />
    </div>
  `,
})
export class ChipListComponent {
  ariaLabel = input<string>('');
}
