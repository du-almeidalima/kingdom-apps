import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, ProgressBarComponent } from '@kingdom-apps/common-ui';

import { DesignationsHeader } from '../../../../../models/designations-header';
import { VisitOutcomeToIconPipe } from '../../../../shared/pipes/visit-outcome-to-icon/visit-outcome-to-icon.pipe';
import { VISIT_OUTCOME_COUNT_LABELS } from '../../config/designations-history.config';
import { HeaderProgressSummary } from '../../models/designations-history.models';
import { DesignationsHeaderOverviewComponent } from '../designations-header-overview/designations-header-overview.component';

@Component({
  selector: 'kingdom-apps-designations-progress-summary',
  templateUrl: './designations-progress-summary.component.html',
  styleUrls: ['./designations-progress-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ProgressBarComponent, VisitOutcomeToIconPipe, DesignationsHeaderOverviewComponent],
})
export class DesignationsProgressSummaryComponent {
  header = input.required<DesignationsHeader>();
  progress = input.required<HeaderProgressSummary | null>();

  protected readonly outcomeLabels = VISIT_OUTCOME_COUNT_LABELS;
}
