import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'lib-divider',
  template: '<hr class="divider" data-testid="divider" [style.margin-block]="spacing()" />',
  styleUrls: ['./divider.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DividerComponent {
  spacing = input<string>('1.6rem');
}
