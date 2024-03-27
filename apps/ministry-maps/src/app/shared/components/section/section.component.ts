import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared.module';

@Component({
  selector: 'kingdom-apps-section',
  standalone: true,
  imports: [CommonModule, SharedModule],
  styleUrl: './section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-card>
      <h3 class="section__title">{{title()}}</h3>
      <div class="section__body">
        <ng-content></ng-content>
      </div>
    </lib-card>
  `,
})
export class SectionComponent {
  title = input<string>();
}
