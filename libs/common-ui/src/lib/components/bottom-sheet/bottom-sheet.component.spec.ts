import { DialogRef } from '@angular/cdk/dialog';
import { Component } from '@angular/core';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { BottomSheetComponent } from './bottom-sheet.component';
import { DialogFooterComponent } from '../dialog/dialog-footer/dialog-footer.component';

@Component({
  template: `
    <lib-bottom-sheet>
      <div dialogHeader data-testid="sheet-custom-header">Cabeçalho</div>
      <p data-testid="sheet-body">Conteúdo</p>
      <lib-dialog-footer>
        <button data-testid="sheet-accept">Aceitar</button>
      </lib-dialog-footer>
    </lib-bottom-sheet>
  `,
  imports: [BottomSheetComponent, DialogFooterComponent],
})
class HostComponent {}

describe('BottomSheetComponent', () => {
  beforeEach(() => {
    return MockBuilder([BottomSheetComponent, DialogFooterComponent, HostComponent]).mock(DialogRef);
  });

  it('projects header, body, and sticky footer content into their dedicated slots', () => {
    const fixture = MockRender(HostComponent);
    const sheet = ngMocks.find(fixture, '[data-testid="bottom-sheet"]').nativeElement as HTMLElement;
    const content = ngMocks.find(fixture, '[data-testid="bottom-sheet-content"]').nativeElement as HTMLElement;
    const footer = ngMocks.find(fixture, 'lib-dialog-footer').nativeElement as HTMLElement;

    expect(sheet.querySelector('[data-testid="sheet-custom-header"]')).not.toBeNull();
    expect(sheet.querySelector('.bottom-sheet__title')).toBeNull();
    expect(content.querySelector('[data-testid="sheet-body"]')).not.toBeNull();
    expect(footer.querySelector('[data-testid="sheet-accept"]')).not.toBeNull();
    expect(content.contains(footer)).toBe(false);
  });

  it('closes its DialogRef from the close button', () => {
    const fixture = MockRender(BottomSheetComponent);

    ngMocks.click(ngMocks.find(fixture, '[data-testid="bottom-sheet-close"]'));

    expect(ngMocks.get(DialogRef).close).toHaveBeenCalledTimes(1);
  });

  it('hides the close button when the sheet is not closable', () => {
    const fixture = MockRender(BottomSheetComponent, { closable: false });

    expect(ngMocks.findAll(fixture, '[data-testid="bottom-sheet-close"]')).toHaveLength(0);
  });
});
