import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent, SpinnerComponent } from '@kingdom-apps/common-ui';

@Component({
  selector: 'kingdom-apps-assign-territories-dock',
  templateUrl: './assign-territories-dock.component.html',
  styleUrls: ['./assign-territories-dock.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SpinnerComponent],
})
export class AssignTerritoriesDockComponent {
  /** Number of territories currently selected in the cart. */
  selectedCount = input(0);

  /** Number of territories assigned to the active session. */
  assignedCount = input(0);

  /** Whether there is an active designations session in progress. */
  hasActiveSession = input(false);

  /** Whether designation creation request is in flight. */
  isCreatingAssignment = input(false);

  /** Whether session stop request is in flight. */
  isStoppingSession = input(false);

  /** Emitted when the user triggers designation submission. */
  submitClick = output<void>();

  /** Emitted when the user triggers the stop session action. */
  stopClick = output<void>();
}
