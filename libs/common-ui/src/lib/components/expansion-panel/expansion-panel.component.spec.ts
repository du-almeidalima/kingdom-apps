import { Component, signal } from '@angular/core';
import { MockBuilder, MockRender } from 'ng-mocks';

import { ExpansionPanelComponent } from './expansion-panel.component';

@Component({
  template: `
    <lib-expansion-panel [(expanded)]="expanded">
      <span libExpansionPanelSummary>Resumo</span>
      <p>Conteúdo projetado</p>
    </lib-expansion-panel>
  `,
  imports: [ExpansionPanelComponent],
})
class TwoWayHostComponent {
  readonly expanded = signal(false);
}

describe('ExpansionPanelComponent', () => {
  beforeEach(() => MockBuilder([ExpansionPanelComponent, TwoWayHostComponent]));

  const flushToggle = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('projects summary into <summary> and body into <details>, toggling on click', async () => {
    const onToggle = jest.fn();
    const fixture = MockRender(
      `<lib-expansion-panel (expandedChange)="onToggle($event)">
        <span libExpansionPanelSummary>Resumo</span>
        <p data-testid="panel-body">Conteúdo projetado</p>
      </lib-expansion-panel>`,
      { onToggle },
    );
    const details = fixture.nativeElement.querySelector('[data-testid="expansion-panel"]') as HTMLDetailsElement;
    const summary = fixture.nativeElement.querySelector('[data-testid="expansion-panel-toggle"]') as HTMLElement;
    const body = fixture.nativeElement.querySelector('[data-testid="panel-body"]') as HTMLElement;

    expect(details.open).toBe(false);
    expect(summary.textContent).toContain('Resumo');
    expect(summary.contains(body)).toBe(false);
    expect(details.contains(body)).toBe(true);

    summary.click();
    await flushToggle();
    fixture.detectChanges();

    expect(details.open).toBe(true);
    expect(onToggle).toHaveBeenNthCalledWith(1, true);

    summary.click();
    await flushToggle();
    fixture.detectChanges();

    expect(details.open).toBe(false);
    expect(onToggle).toHaveBeenNthCalledWith(2, false);
  });

  it('supports two-way [(expanded)] binding and programmatic updates without duplicate emissions', async () => {
    const fixture = MockRender(TwoWayHostComponent);
    const host = fixture.point.componentInstance;
    const details = fixture.nativeElement.querySelector('[data-testid="expansion-panel"]') as HTMLDetailsElement;
    const summary = fixture.nativeElement.querySelector('[data-testid="expansion-panel-toggle"]') as HTMLElement;

    expect(details.open).toBe(false);

    summary.click();
    await flushToggle();
    fixture.detectChanges();

    expect(host.expanded()).toBe(true);
    expect(details.open).toBe(true);

    host.expanded.set(false);
    fixture.detectChanges();
    await flushToggle();

    expect(details.open).toBe(false);
  });

  it('honors expanded input and suppresses redundant emissions for matching state', async () => {
    const onToggle = jest.fn();
    const fixture = MockRender(
      `<lib-expansion-panel [expanded]="expanded" (expandedChange)="onToggle($event)">
        <span libExpansionPanelSummary>Resumo</span>
        Conteúdo
      </lib-expansion-panel>`,
      { expanded: true, onToggle },
    );
    const details = fixture.nativeElement.querySelector('details') as HTMLDetailsElement;

    expect(details.open).toBe(true);

    await flushToggle();
    expect(onToggle).not.toHaveBeenCalled();

    details.open = false;
    details.dispatchEvent(new Event('toggle'));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
