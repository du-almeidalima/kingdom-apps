import { ChangeDetectionStrategy, Component, model } from '@angular/core';

@Component({
  selector: 'lib-expansion-panel',
  template: `
    <details
      #details
      class="expansion-panel"
      [open]="expanded()"
      (toggle)="handleToggle(details.open)"
      data-testid="expansion-panel"
    >
      <summary class="expansion-panel__toggle" data-testid="expansion-panel-toggle">
        <ng-content select="[libExpansionPanelSummary]" />
        <span class="expansion-panel__chevron" aria-hidden="true"></span>
      </summary>
      <ng-content />
    </details>
  `,
  styleUrls: ['./expansion-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpansionPanelComponent {
  expanded = model(false);

  protected handleToggle(open: boolean): void {
    if (this.expanded() === open) return;
    this.expanded.set(open);
  }
}
