import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { NotificationStatusEnum } from '../../../../../models/enums/notification-status';

@Component({
  selector: 'kingdom-apps-notification-status-badge',
  template: `
    <span
      data-testid="notification-status-badge"
      class="badge badge--md"
      [class.badge--success]="isActive()"
      [class.badge--muted]="!isActive()"
    >
      {{ isActive() ? 'Ativa' : 'Inativa' }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationStatusBadgeComponent {
  status = input.required<NotificationStatusEnum>();

  protected readonly isActive = computed(() => this.status() === NotificationStatusEnum.ACTIVE);
}
