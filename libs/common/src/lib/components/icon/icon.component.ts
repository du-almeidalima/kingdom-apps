import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';
import { Icons } from './icon-type';
import { white200 } from '../../styles/abstract/variables';

@Component({
  selector: 'lib-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
      }
    `,
    `
      .icon {
        height: 100%;
        width: 100%;

        fill: var(--fill-color);
      }
    `,
  ],
  template: `
    <svg class="icon" [style.--fill-color]="fillColor">
      <use [attr.href]="iconUrl"></use>
    </svg>
  `,
})
export class IconComponent {
  private readonly assetsFolderPath = '/assets/common/icons/sprite.svg';

  iconUrl = `${this.assetsFolderPath}#iconmonstr-task-list-lined`;

  @Input()
  set icon(icon: Icons) {
    this.iconUrl = `${this.assetsFolderPath}#iconmonstr-${icon}`;
  }

  @Input()
  fillColor = white200;
}
