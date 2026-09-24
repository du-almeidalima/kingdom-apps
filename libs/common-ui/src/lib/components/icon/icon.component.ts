import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';
import { Icons } from './icon-type';

@Component({
  selector: 'lib-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  styles: [
    `
      lib-icon {
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
    <svg class="icon" [style.--fill-color]="fillColor()">
      <use [attr.href]="iconUrl()"></use>
    </svg>
  `,
})
export class IconComponent {
  private readonly assetsFolderPath = '/assets/common-ui/icons/sprite.svg';

  icon = input<Icons>('task-list-lined');

  fillColor = input('currentColor');

  iconUrl = computed(() => `${this.assetsFolderPath}#iconmonstr-${this.icon()}`);
}
