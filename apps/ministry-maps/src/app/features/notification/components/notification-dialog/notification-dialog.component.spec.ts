import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  BottomSheetComponent,
  ButtonComponent,
  DialogComponent,
  DialogFooterComponent,
  MarkdownComponent,
  ResponsiveDialogComponent,
} from '@kingdom-apps/common-ui';
import { MockBuilder, MockRender, ngMocks } from 'ng-mocks';

import { NotificationCategoryEnum } from '../../../../../models/enums/notification-category';
import { NotificationContent } from '../../../../../models/notification';
import { NotificationDialogComponent } from './notification-dialog.component';

describe('NotificationDialogComponent', () => {
  let notifyIntersection: (isIntersecting: boolean) => void;
  let disconnectObserver: jest.Mock;

  const content: NotificationContent = {
    title: 'Atualização dos termos de uso',
    content: '## Termos\n\nLeia **com atenção** antes de continuar.',
    category: NotificationCategoryEnum.INFO,
  };

  const render = (data: NotificationContent = content) =>
    MockRender(NotificationDialogComponent, {}, { providers: [{ provide: DIALOG_DATA, useValue: data }] });

  beforeEach(() => {
    disconnectObserver = jest.fn();

    class IntersectionObserverStub {
      observe = jest.fn();
      disconnect = disconnectObserver;

      constructor(callback: IntersectionObserverCallback) {
        notifyIntersection = (isIntersecting) =>
          callback([{ isIntersecting }] as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
      }
    }
    window.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver;

    return MockBuilder(NotificationDialogComponent)
      .keep(ResponsiveDialogComponent)
      .keep(BottomSheetComponent)
      .keep(DialogComponent)
      .keep(ButtonComponent)
      .keep(DialogFooterComponent)
      .keep(MarkdownComponent)
      .mock(DIALOG_DATA, content)
      .mock(DialogRef);
  });

  it('renders the title and the Markdown content inside the responsive dialog', () => {
    const fixture = render();

    expect(ngMocks.find(fixture, '[data-testid="bottom-sheet"]')).toBeTruthy();
    expect(ngMocks.find(fixture, '[data-testid="notification-dialog-title"]').nativeElement.textContent.trim()).toBe(
      'Atualização dos termos de uso',
    );
    expect(ngMocks.find(fixture, '[data-testid="markdown"] h2').nativeElement.textContent).toBe('Termos');
    expect(ngMocks.find(fixture, '[data-testid="markdown"] strong').nativeElement.textContent).toBe('com atenção');
  });

  it.each([
    [NotificationCategoryEnum.INFO, 'INFORMAÇÃO'],
    [NotificationCategoryEnum.WARNING, 'ATENÇÃO'],
  ])('shows the uppercase label of the %s category', (category, label) => {
    const fixture = render({ ...content, category });

    expect(ngMocks.find(fixture, '[data-testid="notification-dialog-category"]').nativeElement.textContent.trim()).toBe(
      label,
    );
  });

  it('closes the dialog from the Fechar button when opened via DIALOG_DATA', () => {
    const fixture = render();

    ngMocks.click(ngMocks.find(fixture, '[data-testid="notification-dialog-action"]'));

    expect(ngMocks.get(DialogRef).close).toHaveBeenCalledTimes(1);
  });

  it('gates the action button on scrollGate until the sentinel intersects and latches once reached', () => {
    const fixture = MockRender(NotificationDialogComponent, {
      notification: content,
      scrollGate: true,
      actionLabel: 'Entendi',
    });
    const button = ngMocks.find<HTMLButtonElement>(fixture, '[data-testid="notification-dialog-action"]').nativeElement;

    notifyIntersection(false);
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
    expect(button.textContent?.trim()).toBe('Role até o fim para continuar');

    notifyIntersection(true);
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
    expect(button.textContent?.trim()).toBe('Entendi');

    notifyIntersection(false);
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
  });
});
