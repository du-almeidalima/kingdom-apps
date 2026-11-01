import { Component } from '@angular/core';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { ChipComponent } from './chip.component';
import { ChipListComponent } from './chip-list/chip-list.component';

@Component({
  template: `
    <lib-chip-list ariaLabel="Cidades selecionadas">
      <lib-chip label="São Paulo" [removable]="true" />
      <lib-chip label="Osasco" />
    </lib-chip-list>
  `,
  imports: [ChipListComponent, ChipComponent],
})
class ChipListHostComponent {}

describe('ChipComponent & ChipListComponent', () => {
  beforeEach(() => MockBuilder([ChipComponent, ChipListComponent, ChipListHostComponent]));

  it('renders the chip label and hides the remove button by default', () => {
    const fixture = MockRender(ChipComponent, { label: 'São Paulo' });
    const host = fixture.point.nativeElement as HTMLElement;

    expect(host.getAttribute('role')).toBe('listitem');
    expect(host.querySelector('[data-testid="chip-label"]')?.textContent?.trim()).toBe('São Paulo');
    expect(host.querySelector('[data-testid="chip-remove"]')).toBeNull();
  });

  it('renders a native button with an accessible label and emits removed when removable is true', () => {
    const removedSpy = jest.fn();
    const fixture = MockRender(
      `<lib-chip [label]="label" [removable]="true" (removed)="onRemoved()" />`,
      { label: 'São Paulo', onRemoved: removedSpy },
    );

    const removeBtn = ngMocks.find(fixture, '[data-testid="chip-remove"]').nativeElement as HTMLButtonElement;
    expect(removeBtn.tagName).toBe('BUTTON');
    expect(removeBtn.type).toBe('button');
    expect(removeBtn.getAttribute('aria-label')).toBe('Remover São Paulo');
    expect(removeBtn.disabled).toBe(false);

    removeBtn.click();
    expect(removedSpy).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard activation on the remove button', () => {
    const removedSpy = jest.fn();
    const fixture = MockRender(
      `<lib-chip label="Campinas" [removable]="true" (removed)="onRemoved()" />`,
      { onRemoved: removedSpy },
    );

    const removeBtn = ngMocks.find(fixture, '[data-testid="chip-remove"]');
    ngMocks.trigger(removeBtn, 'keydown.enter');
    expect(removedSpy).toHaveBeenCalledTimes(1);
  });

  it('uses custom removeAriaLabel when provided', () => {
    const fixture = MockRender(ChipComponent, {
      label: 'Guarulhos',
      removable: true,
      removeAriaLabel: 'Excluir cidade Guarulhos',
    });

    const removeBtn = ngMocks.find(fixture, '[data-testid="chip-remove"]').nativeElement as HTMLButtonElement;
    expect(removeBtn.getAttribute('aria-label')).toBe('Excluir cidade Guarulhos');
  });

  it('disables the remove button and prevents removal when disabled is true', () => {
    const removedSpy = jest.fn();
    const fixture = MockRender(
      `<lib-chip label="Santos" [removable]="true" [disabled]="true" (removed)="onRemoved()" />`,
      { onRemoved: removedSpy },
    );

    const chipEl = ngMocks.find(fixture, '[data-testid="chip"]').nativeElement as HTMLElement;
    const removeBtn = ngMocks.find(fixture, '[data-testid="chip-remove"]').nativeElement as HTMLButtonElement;

    expect(chipEl.classList.contains('chip--disabled')).toBe(true);
    expect(removeBtn.disabled).toBe(true);

    removeBtn.click();
    ngMocks.trigger(ngMocks.find(fixture, '[data-testid="chip-remove"]'), 'keydown.enter');
    expect(removedSpy).not.toHaveBeenCalled();
  });

  it('renders a semantic list container in ChipListComponent with projected chips', () => {
    const fixture = MockRender(ChipListHostComponent);
    const listEl = ngMocks.find(fixture, '[data-testid="chip-list"]').nativeElement as HTMLElement;
    const chips = ngMocks.findAll(fixture, ChipComponent);

    expect(listEl.getAttribute('role')).toBe('list');
    expect(listEl.getAttribute('aria-label')).toBe('Cidades selecionadas');
    expect(chips).toHaveLength(2);
  });
});
