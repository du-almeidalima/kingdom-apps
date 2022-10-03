import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { Icons } from '../../icon-type';

@Component({
  selector: 'lib-card-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./card-header.component.scss'],
  template: `
    <div class="card-header">
      <div *ngIf="icon" class="card-header__icon-container">
        <svg class="card-header__icon">
          <use [attr.href]="iconUrl"></use>
        </svg>
      </div>
      <div class="card-header__title-container">
        <h3 class="card-header__title" *ngIf="title">{{ title }}</h3>
        <p class="card-header__subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
    </div>
  `,
})
export class CardHeaderComponent implements OnInit {
  iconUrl = '/assets/common/icons/sprite.svg#iconmonstr-task-list-lined';

  @Input()
  public icon?: Icons;

  @Input()
  public title?: string;

  @Input()
  public subtitle?: string;

  // TODO: Check how to do this with Angular
  @Input()
  public titleComponent: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' = 'h3';

  ngOnInit(): void {
    this.iconUrl = `/assets/common/icons/sprite.svg#iconmonstr-${this.icon}`;
  }
}
