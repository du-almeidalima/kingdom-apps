import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[lib-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./button.component.scss'],
  template: ` <ng-content></ng-content> `,
  host: {
    '[class.button--secondary]': `btnType() === 'secondary'`,
    '[class.button--primary]': `btnType() === 'primary'`,
    '[class.button--danger]': `btnType() === 'danger'`,
  },
})
export class ButtonComponent {
  btnType = input<'secondary' | 'primary' | 'danger'>('secondary');
}
