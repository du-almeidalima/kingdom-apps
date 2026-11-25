import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '@kingdom-apps/common-ui';

import { NotificationCategoryEnum } from '../../../../../models/enums/notification-category';
import { NOTIFICATION_CATEGORY_PRESETS } from '../../config/notification-category.config';

@Component({
  selector: 'kingdom-apps-notification-list-item',
  template: `
    <lib-icon class="notification-list-item__icon" [icon]="preset().icon" [fillColor]="preset().accent" />
    <span class="notification-list-item__overview">
      <span
        class="t-caption notification-list-item__category"
        data-testid="notification-list-item-category"
        [style.color]="preset().accent"
      >
        {{ preset().label }}
      </span>
      <span class="t-headline4" data-testid="notification-list-item-title">{{ title() }}</span>
      <span class="t-caption t-medium-emphasis">{{ date() | date: 'dd/MM/yyyy' }}</span>
    </span>
    <ng-content />
    <span class="notification-list-item__chevron" aria-hidden="true"></span>
  `,
  styleUrls: ['./notification-list-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IconComponent],
})
export class NotificationListItemComponent {
  category = input.required<NotificationCategoryEnum>();
  title = input.required<string>();
  date = input.required<Date>();

  protected readonly preset = computed(() => NOTIFICATION_CATEGORY_PRESETS[this.category()]);
}
