import { DialogRef } from '@angular/cdk/dialog';
import { Component } from '@angular/core';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { DialogFooterComponent } from './dialog-footer/dialog-footer.component';
import { DialogComponent } from './dialog.component';

@Component({
  template: `
    <lib-dialog>
      <div dialogHeader data-testid="dialog-custom-header">Cabeçalho customizado</div>
      <p data-testid="dialog-body">Conteúdo</p>
      <lib-dialog-footer>
        <button data-testid="dialog-accept">Aceitar</button>
      </lib-dialog-footer>
    </lib-dialog>
  `,
  imports: [DialogComponent, DialogFooterComponent],
})
class CustomHeaderHostComponent {}

describe('DialogComponent', () => {
  beforeEach(() => {
    return MockBuilder([DialogComponent, DialogFooterComponent, CustomHeaderHostComponent]).mock(DialogRef);
  });

  it('renders the title in the header when provided', () => {
    const fixture = MockRender(DialogComponent, { title: 'Editar' });
    const dialog = ngMocks.find(fixture, '[data-testid="dialog"]').nativeElement as HTMLElement;

    expect(dialog.querySelector('.dialog__header-title')?.textContent?.trim()).toBe('Editar');
  });

  it('projects custom dialogHeader content into the header', () => {
    const fixture = MockRender(CustomHeaderHostComponent);
    const dialog = ngMocks.find(fixture, '[data-testid="dialog"]').nativeElement as HTMLElement;

    expect(dialog.querySelector('[data-testid="dialog-custom-header"]')).not.toBeNull();
    expect(dialog.querySelector('.dialog__header-title')).toBeNull();
  });

  it('hides the close button when closable is false', () => {
    const fixture = MockRender(DialogComponent, { closable: false });

    expect(ngMocks.findAll(fixture, '[data-testid="dialog-close"]')).toHaveLength(0);
  });
});
