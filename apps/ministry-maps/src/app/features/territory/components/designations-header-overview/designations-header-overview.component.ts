import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { DesignationsHeader } from '../../../../../models/designations-header';
import { CLOSED_BY_LABELS } from '../../config/designations-history.config';
import { DesignationsHeaderStatusBadgeComponent } from '../designations-header-status-badge/designations-header-status-badge.component';

/** Session title + status badge on one line, start/close times underneath. Shared by the history row and the detail summary. */
@Component({
  selector: 'kingdom-apps-designations-header-overview',
  template: `
    <div class="overview__top">
      <span class="overview__title">
        Sessão de
        <time [attr.datetime]="header().createdAt.toISOString()">
          {{ header().createdAt | date: 'dd/MM/yyyy' }}
        </time>
      </span>
      <kingdom-apps-designations-header-status-badge [status]="header().status" />
    </div>

    <span class="t-caption">
      Iniciada às
      <time [attr.datetime]="header().createdAt.toISOString()">
        {{ header().createdAt | date: 'HH:mm' }}
      </time>
    </span>

    @if (header().closedAt; as closedAt) {
      @let closedBy = header().closedBy;
      <span class="t-caption" data-testid="designations-header-closure">
        Encerrada {{ closedBy ? closedByLabels[closedBy] : '' }} em
        <time [attr.datetime]="closedAt.toISOString()">
          {{ closedAt | date: 'dd/MM/yyyy HH:mm' }}
        </time>
      </span>
    }
  `,
  styleUrls: ['./designations-header-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DesignationsHeaderStatusBadgeComponent],
})
export class DesignationsHeaderOverviewComponent {
  header = input.required<DesignationsHeader>();
  protected readonly closedByLabels = CLOSED_BY_LABELS;
}
