import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DesignationsHeader } from '../../../../../models/designations-header';
import { DesignationsHeaderOverviewComponent } from '../designations-header-overview/designations-header-overview.component';

@Component({
  selector: 'kingdom-apps-designations-header-list-item',
  template: `
    <a class="header-item" [routerLink]="[header().id]" data-testid="designations-header-list-item">
      <kingdom-apps-designations-header-overview class="header-item__overview" [header]="header()" />
      <span class="header-item__chevron" aria-hidden="true"></span>
    </a>
  `,
  styleUrls: ['./designations-header-list-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DesignationsHeaderOverviewComponent],
})
export class DesignationsHeaderListItemComponent {
  header = input.required<DesignationsHeader>();
}
