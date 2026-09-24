import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { white200 } from '../../../styles/abstract/variables';
import { Icons } from '../../icon/icon-type';
import { IconComponent } from '../../icon/icon.component';

@Component({
  selector: 'lib-card-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./card-header.component.scss'],
  template: `
    <div class="card-header">
      @if (icon(); as iconValue) {
        <div class="card-header__icon-container">
          <lib-icon class="card-header__icon" [icon]="iconValue" fillColor="currentColor"></lib-icon>
        </div>
      }
      <div class="card-header__title-container">
        @if (title()) {
          <h3 class="card-header__title t-white">{{ title() }}</h3>
        }
        @if (subtitle()) {
          <p class="card-header__subtitle">{{ subtitle() }}</p>
        }
      </div>
    </div>
  `,
  imports: [IconComponent],
})
export class CardHeaderComponent {
  public readonly white200 = white200;

  public icon = input<Icons | undefined>(undefined);

  public title = input<string | undefined>(undefined);

  public subtitle = input<string | undefined>(undefined);

  // TODO: Check how to do this with Angular
  public titleComponent = input<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span'>('h3');
}
