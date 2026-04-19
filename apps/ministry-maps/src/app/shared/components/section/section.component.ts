import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { CardComponent, green200, SpinnerComponent } from '@kingdom-apps/common-ui';

@Component({
  selector: 'kingdom-apps-section',
  standalone: true,
  imports: [CardComponent, SpinnerComponent],
  styleUrl: './section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-card>
      <header class="flex justify-between items-center h-8">
        <h3 class="section__title">{{ title() }}</h3>
        @if (isLoading()) {
        <lib-spinner height="2rem" width="2rem" [color]="green200" />
        }
      </header>
      <div class="section__body">
        <ng-content></ng-content>
      </div>
    </lib-card>
  `,
})
export class SectionComponent {
  protected readonly green200 = green200;

  title = input<string>();
  isLoading = input<boolean>(false);
}
