import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { white200 } from '../../../styles/abstract/variables';
import { Icons } from '../../icon/icon-type';

@Component({
  selector: 'lib-card-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./card-header.component.scss'],
  template: `
    <div class="card-header">
      <div *ngIf="icon" class="card-header__icon-container">
        <lib-icon class="card-header__icon" [icon]="icon" [fillColor]="white200"></lib-icon>
      </div>
      <div class="card-header__title-container">
        <h3 class="card-header__title t-white" *ngIf="title">{{ title }}</h3>
        <p class="card-header__subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
    </div>
  `,
})
export class CardHeaderComponent {
  public readonly white200 = white200;

  @Input()
  public icon?: Icons;

  @Input()
  public title?: string;

  @Input()
  public subtitle?: string;

  // TODO: Check how to do this with Angular
  @Input()
  public titleComponent: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' = 'h3';
}
