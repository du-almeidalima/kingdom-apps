import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { ButtonComponent, IconComponent, ProgressBarComponent, SpinnerComponent } from '@kingdom-apps/common-ui';

import { VisitOutcomeToIconPipe } from '../../../../shared/pipes/visit-outcome-to-icon/visit-outcome-to-icon.pipe';
import { VISIT_OUTCOME_COUNT_LABELS } from '../../config/designations-history.config';
import { DesignationProgressSummary, DesignationTerritoryRow } from '../../models/designations-history.models';

@Component({
  selector: 'kingdom-apps-designation-progress-card',
  templateUrl: './designation-progress-card.component.html',
  styleUrls: ['./designation-progress-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ButtonComponent, IconComponent, ProgressBarComponent, SpinnerComponent, VisitOutcomeToIconPipe],
})
export class DesignationProgressCardComponent {
  summary = input.required<DesignationProgressSummary>();
  expanded = input(false);
  isLoading = input(false);
  rows = input<DesignationTerritoryRow[] | null>(null);

  cardToggle = output<string>();
  share = output<string>();

  protected readonly outcomeLabels = VISIT_OUTCOME_COUNT_LABELS;
  protected readonly hasBeenExpanded = signal(false);

  protected readonly bodyId = computed(() => `card-body-${this.summary().designationId}`);
  protected readonly isBodyMounted = computed(() => this.expanded() || this.hasBeenExpanded());
  protected readonly progressLabel = computed(
    () => `${this.summary().territoriesDone}/${this.summary().territoriesTotal}`,
  );
  protected readonly territoryRows = computed(() => this.rows() ?? []);

  protected readonly bodyState = computed<'loading' | 'ready' | 'empty'>(() => {
    if (this.isLoading()) {
      return 'loading';
    }

    return this.territoryRows().length > 0 ? 'ready' : 'empty';
  });

  constructor() {
    effect(() => {
      if (this.expanded()) {
        this.hasBeenExpanded.set(true);
      }
    });
  }
}
