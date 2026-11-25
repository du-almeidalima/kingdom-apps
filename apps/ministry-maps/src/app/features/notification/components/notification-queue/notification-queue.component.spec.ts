import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  BottomSheetComponent,
  ButtonComponent,
  DialogComponent,
  DialogFooterComponent,
  MarkdownComponent,
  ResponsiveDialogComponent,
  ToasterService,
} from '@kingdom-apps/common-ui';
import { MockBuilder, MockInstance, MockRender, ngMocks } from 'ng-mocks';
import { of, throwError } from 'rxjs';

import { NotificationCategoryEnum } from '../../../../../models/enums/notification-category';
import { notificationMockBuilder, userMockBuilder } from '../../../../../test/mocks';
import { NotificationBO } from '../../bo/notification/notification.bo';
import { NotificationDialogComponent } from '../notification-dialog/notification-dialog.component';
import { NotificationQueueComponent, NotificationQueueData } from './notification-queue.component';

describe('NotificationQueueComponent', () => {
  let notifyIntersection: (isIntersecting: boolean) => void;

  const user = userMockBuilder({});
  const first = notificationMockBuilder({
    id: 'N1',
    title: 'Termos atualizados',
    actionLabel: 'Aceitar e continuar',
  });
  const second = notificationMockBuilder({
    id: 'N2',
    title: 'Manutenção no sábado',
    category: NotificationCategoryEnum.WARNING,
    actionLabel: 'Entendi',
  });

  const render = (notifications: NotificationQueueData['notifications']) =>
    MockRender(
      NotificationQueueComponent,
      {},
      { providers: [{ provide: DIALOG_DATA, useValue: { user, notifications } satisfies NotificationQueueData }] },
    );

  const text = (fixture: ReturnType<typeof render>, testId: string): string =>
    ngMocks.find(fixture, `[data-testid="${testId}"]`).nativeElement.textContent.trim();

  const actionButton = (fixture: ReturnType<typeof render>) =>
    ngMocks.find<HTMLButtonElement>(fixture, '[data-testid="notification-dialog-action"]').nativeElement;

  beforeEach(() => {
    class IntersectionObserverStub {
      observe = jest.fn();
      disconnect = jest.fn();

      constructor(callback: IntersectionObserverCallback) {
        notifyIntersection = (isIntersecting) =>
          callback([{ isIntersecting }] as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
      }
    }
    window.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver;

    return MockBuilder(NotificationQueueComponent)
      .keep(NotificationDialogComponent)
      .keep(ResponsiveDialogComponent)
      .keep(BottomSheetComponent)
      .keep(DialogComponent)
      .keep(ButtonComponent)
      .keep(DialogFooterComponent)
      .keep(MarkdownComponent)
      .mock(DialogRef)
      .mock(NotificationBO)
      .mock(ToasterService);
  });

  it('shows the title and Markdown body of the first queued notification, without a close control', () => {
    const fixture = render([first]);

    expect(text(fixture, 'notification-dialog-title')).toBe('Termos atualizados');
    expect(ngMocks.find(fixture, '[data-testid="markdown"]')).toBeTruthy();
    expect(ngMocks.findAll(fixture, '[data-testid="bottom-sheet-close"]')).toHaveLength(0);
  });

  it('omits the position counter for a single notification', () => {
    const fixture = render([first]);

    expect(ngMocks.findAll(fixture, '[data-testid="notification-dialog-counter"]')).toHaveLength(0);
  });

  it('shows the position counter when several notifications are queued', () => {
    const fixture = render([first, second]);

    expect(text(fixture, 'notification-dialog-counter')).toBe('1 de 2');
  });

  it('keeps the action disabled until the reader reaches the end of the content', () => {
    const fixture = render([first]);

    notifyIntersection(false);
    fixture.detectChanges();
    expect(actionButton(fixture).disabled).toBe(true);
    expect(actionButton(fixture).textContent?.trim()).toBe('Role até o fim para continuar');

    notifyIntersection(true);
    fixture.detectChanges();
    expect(actionButton(fixture).disabled).toBe(false);
    expect(actionButton(fixture).textContent?.trim()).toBe('Aceitar e continuar');
  });

  it('records the acknowledgment and moves to the next notification with the reading gate reset', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.acknowledge).mockReturnValue(of(undefined));
    });
    const fixture = render([first, second]);
    notifyIntersection(true);
    fixture.detectChanges();

    ngMocks.click(ngMocks.find(fixture, '[data-testid="notification-dialog-action"]'));
    fixture.detectChanges();

    expect(ngMocks.get(NotificationBO).acknowledge).toHaveBeenCalledWith(first, user);
    expect(text(fixture, 'notification-dialog-title')).toBe('Manutenção no sábado');
    expect(text(fixture, 'notification-dialog-counter')).toBe('2 de 2');
    expect(actionButton(fixture).disabled).toBe(true);
  });

  it('closes the dialog after the last queued notification is acknowledged', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.acknowledge).mockReturnValue(of(undefined));
    });
    const fixture = render([first]);
    notifyIntersection(true);
    fixture.detectChanges();

    ngMocks.click(ngMocks.find(fixture, '[data-testid="notification-dialog-action"]'));

    expect(ngMocks.get(DialogRef).close).toHaveBeenCalledTimes(1);
  });

  it('keeps the notification open and reports the error when the acknowledgment fails', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.acknowledge).mockReturnValue(throwError(() => new Error('offline')));
    });
    const fixture = render([first]);
    notifyIntersection(true);
    fixture.detectChanges();

    ngMocks.click(ngMocks.find(fixture, '[data-testid="notification-dialog-action"]'));
    fixture.detectChanges();

    expect(ngMocks.get(ToasterService).error).toHaveBeenCalledWith(
      'Não foi possível registrar a confirmação. Tente novamente.',
    );
    expect(ngMocks.get(DialogRef).close).not.toHaveBeenCalled();
    expect(text(fixture, 'notification-dialog-title')).toBe('Termos atualizados');
  });
});
