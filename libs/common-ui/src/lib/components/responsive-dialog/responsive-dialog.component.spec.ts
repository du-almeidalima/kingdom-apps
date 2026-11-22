import { DialogRef } from '@angular/cdk/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import { Component } from '@angular/core';
import { MockBuilder, MockInstance, MockRender, ngMocks } from 'ng-mocks';
import { of } from 'rxjs';

import { BottomSheetComponent } from '../bottom-sheet/bottom-sheet.component';
import { DialogFooterComponent } from '../dialog/dialog-footer/dialog-footer.component';
import { DialogComponent } from '../dialog/dialog.component';
import { DESKTOP_DIALOG_BREAKPOINT, ResponsiveDialogComponent } from './responsive-dialog.component';

@Component({
  template: `
    <lib-responsive-dialog [closable]="false">
      <div dialogHeader data-testid="responsive-header">Cabeçalho</div>
      <p data-testid="responsive-body">Conteúdo</p>
      <lib-dialog-footer>
        <button data-testid="responsive-action">Confirmar</button>
      </lib-dialog-footer>
    </lib-responsive-dialog>
  `,
  imports: [ResponsiveDialogComponent, DialogFooterComponent],
})
class HostComponent {}

describe('ResponsiveDialogComponent', () => {
  beforeEach(() => {
    return MockBuilder(HostComponent)
      .keep(ResponsiveDialogComponent)
      .keep(BottomSheetComponent)
      .keep(DialogComponent)
      .keep(DialogFooterComponent)
      .keep(NgTemplateOutlet)
      .mock(DialogRef)
      .mock(BreakpointObserver);
  });

  it('renders lib-bottom-sheet with projected header, body, and footer on mobile viewports', () => {
    const fixture = MockRender(HostComponent);

    expect(ngMocks.findAll(fixture, '[data-testid="bottom-sheet"]')).toHaveLength(1);
    expect(ngMocks.findAll(fixture, '[data-testid="dialog"]')).toHaveLength(0);
    expect(ngMocks.find(fixture, '[data-testid="responsive-header"]')).toBeTruthy();
    expect(ngMocks.find(fixture, '[data-testid="responsive-body"]')).toBeTruthy();
    expect(ngMocks.find(fixture, '[data-testid="responsive-action"]')).toBeTruthy();
  });

  it('renders lib-dialog with projected header, body, and footer on desktop viewports', () => {
    MockInstance(BreakpointObserver, (instance) => {
      jest
        .mocked(instance.observe)
        .mockReturnValue(of({ matches: true, breakpoints: { [DESKTOP_DIALOG_BREAKPOINT]: true } }));
      jest.mocked(instance.isMatched).mockReturnValue(true);
    });

    const fixture = MockRender(HostComponent);

    expect(ngMocks.findAll(fixture, '[data-testid="dialog"]')).toHaveLength(1);
    expect(ngMocks.findAll(fixture, '[data-testid="bottom-sheet"]')).toHaveLength(0);
    expect(ngMocks.find(fixture, '[data-testid="responsive-header"]')).toBeTruthy();
    expect(ngMocks.find(fixture, '[data-testid="responsive-body"]')).toBeTruthy();
    expect(ngMocks.find(fixture, '[data-testid="responsive-action"]')).toBeTruthy();
  });

  it('renders the default dialog title header when title is provided on desktop', () => {
    MockInstance(BreakpointObserver, (instance) => {
      jest
        .mocked(instance.observe)
        .mockReturnValue(of({ matches: true, breakpoints: { [DESKTOP_DIALOG_BREAKPOINT]: true } }));
      jest.mocked(instance.isMatched).mockReturnValue(true);
    });

    const fixture = MockRender(ResponsiveDialogComponent, { title: 'Editar' });
    const dialog = ngMocks.find(fixture, '[data-testid="dialog"]').nativeElement as HTMLElement;

    expect(dialog.querySelector('.dialog__header-title')?.textContent?.trim()).toBe('Editar');
  });
});
