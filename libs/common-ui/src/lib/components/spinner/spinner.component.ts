import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { primaryGreen } from '../../styles/abstract/variables';

@Component({
  selector: 'lib-spinner',
  styleUrls: ['./spinner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="spinner" [style]="{ '--height': height, '--width': width, '--color': color }" [hidden]="hide">
      <div class="spinner__inner-block"></div>
    </div>
  `,
})
export class SpinnerComponent {
  @Input()
  height = '2rem';

  @Input()
  width = '2rem';

  @Input()
  hide = false;

  @Input()
  color = primaryGreen;
}
