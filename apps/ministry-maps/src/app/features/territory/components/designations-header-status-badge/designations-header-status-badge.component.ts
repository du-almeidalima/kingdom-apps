import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '@kingdom-apps/common-ui';

import { DesignationsHeaderStatusEnum } from '../../../../../models/enums/designations-header-status';

@Component({
  selector: 'kingdom-apps-designations-header-status-badge',
  template: `
    <span
      data-testid="designations-header-status-badge"
      class="badge badge--md status-badge"
      [class.badge--info]="isInProgress()"
      [class.badge--muted]="!isInProgress()"
    >
      <lib-icon class="status-badge__icon" [icon]="isInProgress() ? 'stop-circle-lined' : 'check-mark-circle-lined'" />
      {{ isInProgress() ? 'Em andamento' : 'Encerrada' }}
    </span>
  `,
  styleUrls: ['./designations-header-status-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
})
export class DesignationsHeaderStatusBadgeComponent {
  status = input.required<DesignationsHeaderStatusEnum>();
  protected readonly isInProgress = computed(() => this.status() === DesignationsHeaderStatusEnum.IN_PROGRESS);
}
