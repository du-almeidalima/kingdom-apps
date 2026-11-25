import { Dialog } from '@angular/cdk/dialog';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { ButtonComponent, ConfirmDialogComponent, ExpansionPanelComponent, ToasterService } from '@kingdom-apps/common-ui';
import { MockBuilder, MockedComponentFixture, MockInstance, MockRender, ngMocks } from 'ng-mocks';
import { of, Subject } from 'rxjs';

import { NotificationCategoryEnum } from '../../../../../models/enums/notification-category';
import { NotificationStatusEnum } from '../../../../../models/enums/notification-status';
import { RoleEnum } from '../../../../../models/enums/role';
import { Notification, NotificationAcknowledgmentEntry } from '../../../../../models/notification';
import { notificationMockBuilder } from '../../../../../test/mocks';
import { NotificationBO } from '../../bo/notification/notification.bo';
import { NotificationDialogComponent } from '../../components/notification-dialog/notification-dialog.component';
import { NotificationStatusBadgeComponent } from '../../components/notification-status-badge/notification-status-badge.component';
import { NotificationDetailsPageComponent } from './notification-details-page.component';

describe('NotificationDetailsPageComponent', () => {
  beforeEach(() =>
    MockBuilder(NotificationDetailsPageComponent)
      .keep(DatePipe)
      .keep(ButtonComponent)
      .keep(ExpansionPanelComponent)
      .keep(NotificationStatusBadgeComponent)
      .mock(NotificationBO)
      .mock(Dialog)
      .mock(Router)
      .mock(ToasterService)
      .provide({
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ notificationId: 'N1' }) } },
      }),
  );
  MockInstance.scope();

  const notification = notificationMockBuilder({
    id: 'N1',
    title: 'Termos atualizados',
    content: '## Termos',
    category: NotificationCategoryEnum.WARNING,
    status: NotificationStatusEnum.ACTIVE,
    createdAt: new Date(2026, 8, 1, 12, 0, 0),
  });

  const acknowledgment = (overrides: Partial<NotificationAcknowledgmentEntry>): NotificationAcknowledgmentEntry => ({
    userId: 'U1',
    name: 'Ana Souza',
    congregationName: 'Central',
    role: RoleEnum.ELDER,
    acknowledgedAt: new Date(2026, 9, 2, 8, 30, 0),
    ...overrides,
  });

  const text = (fixture: MockedComponentFixture<NotificationDetailsPageComponent>, testId: string): string =>
    ngMocks.find(fixture, `[data-testid="${testId}"]`).nativeElement.textContent.trim();

  const renderWith = (value: Notification | undefined, acknowledgments: NotificationAcknowledgmentEntry[] = []) => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.getById).mockReturnValue(of(value));
      jest.mocked(instance.getAcknowledgments).mockReturnValue(of(acknowledgments));
      jest.mocked(instance.toggleStatus).mockReturnValue(of(undefined));
      jest.mocked(instance.delete).mockReturnValue(of(undefined));
    });
    return MockRender(NotificationDetailsPageComponent);
  };

  it('shows the title, category, status and creation date of the notification', () => {
    const fixture = renderWith(notification);

    expect(text(fixture, 'notification-details-title')).toBe('Termos atualizados');
    expect(text(fixture, 'notification-details-category')).toBe('ATENÇÃO');
    expect(text(fixture, 'notification-status-badge')).toBe('Ativa');
    expect(text(fixture, 'notification-details-created-at')).toContain('01/09/2026');
  });

  it('shows a spinner until the notification has loaded', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.getById).mockReturnValue(new Subject());
      jest.mocked(instance.getAcknowledgments).mockReturnValue(of([]));
    });

    const fixture = MockRender(NotificationDetailsPageComponent);

    expect(ngMocks.find(fixture, '[data-testid="notification-details-loading"]')).toBeTruthy();
  });

  it('says so when the notification no longer exists', () => {
    const fixture = renderWith(undefined);

    expect(text(fixture, 'notification-details-not-found')).toBe('Notificação não encontrada.');
  });

  it.each([
    [NotificationStatusEnum.ACTIVE, 'Encerrar'],
    [NotificationStatusEnum.INACTIVE, 'Ativar'],
  ])('offers to switch a %s notification with the %s action', (status, action) => {
    const fixture = renderWith({ ...notification, status });

    expect(text(fixture, 'notification-details-toggle-status')).toBe(action);
  });

  it('switches the status of the notification from the toggle action', () => {
    const fixture = renderWith(notification);

    ngMocks.click(ngMocks.find(fixture, '[data-testid="notification-details-toggle-status"]'));

    expect(ngMocks.get(NotificationBO).toggleStatus).toHaveBeenCalledWith(notification);
  });

  it('previews the saved notification in the viewer', () => {
    const fixture = renderWith(notification);

    ngMocks.click(ngMocks.find(fixture, '[data-testid="notification-details-preview"]'));

    expect(ngMocks.get(Dialog).open).toHaveBeenCalledWith(NotificationDialogComponent, {
      data: {
        category: NotificationCategoryEnum.WARNING,
        title: 'Termos atualizados',
        content: '## Termos',
      },
    });
  });

  it('deletes the notification after confirmation and returns to the list', () => {
    const fixture = renderWith(notification);
    jest.mocked(ngMocks.get(Dialog).open).mockReturnValue({ closed: of(true) } as never);

    ngMocks.click(ngMocks.find(fixture, '[data-testid="notification-details-delete"]'));

    expect(ngMocks.get(Dialog).open).toHaveBeenCalledWith(
      ConfirmDialogComponent,
      expect.objectContaining({ data: expect.objectContaining({ title: 'Excluir Notificação' }) }),
    );
    expect(ngMocks.get(NotificationBO).delete).toHaveBeenCalledWith('N1');
    expect(ngMocks.get(Router).navigate).toHaveBeenCalledWith(['/', 'notifications']);
  });

  it('keeps the notification when the deletion is cancelled', () => {
    const fixture = renderWith(notification);
    jest.mocked(ngMocks.get(Dialog).open).mockReturnValue({ closed: of(false) } as never);

    ngMocks.click(ngMocks.find(fixture, '[data-testid="notification-details-delete"]'));

    expect(ngMocks.get(NotificationBO).delete).not.toHaveBeenCalled();
  });

  it('groups acknowledgments by congregation with the number of people in each group', () => {
    const fixture = renderWith(notification, [
      acknowledgment({}),
      acknowledgment({ userId: 'U2', name: 'Bruno Lima', congregationName: 'Norte' }),
      acknowledgment({ userId: 'U3', name: 'Carla Santos' }),
    ]);

    const groups = ngMocks.findAll(fixture, '[data-testid="notification-acknowledgment-group-toggle"]');
    const counts = ngMocks.findAll(fixture, '[data-testid="notification-acknowledgment-group-count"]');

    expect(groups).toHaveLength(2);
    expect(groups[0].nativeElement.textContent).toContain('Central');
    expect(groups[1].nativeElement.textContent).toContain('Norte');
    expect(counts.map((count) => count.nativeElement.textContent.trim())).toEqual(['2 pessoas', '1 pessoa']);
  });

  it('expands a congregation to show each person with role and acknowledgment date', async () => {
    const fixture = renderWith(notification, [
      acknowledgment({}),
      acknowledgment({ userId: 'U2', name: 'Bruno Lima', congregationName: 'Norte' }),
    ]);
    const panels = ngMocks.findAll(fixture, '[data-testid="expansion-panel"]');
    const toggles = ngMocks.findAll(fixture, '[data-testid="notification-acknowledgment-group-toggle"]');
    const firstDetails = panels[0].nativeElement as HTMLDetailsElement;
    const secondDetails = panels[1].nativeElement as HTMLDetailsElement;

    expect(firstDetails.open).toBe(false);
    expect(secondDetails.open).toBe(false);

    toggles[0].nativeElement.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(firstDetails.open).toBe(true);
    expect(secondDetails.open).toBe(false);
    const item = text(fixture, 'notification-acknowledgment-item');
    expect(item).toContain('Ana Souza');
    expect(item).toContain('Ancião');
    expect(item).toContain('Confirmada em 02/10/2026 08:30');

    toggles[0].nativeElement.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(firstDetails.open).toBe(false);
  });

  it('says when nobody has acknowledged the notification yet', () => {
    const fixture = renderWith(notification, []);

    expect(text(fixture, 'notification-acknowledgments-empty')).toBe('Nenhuma confirmação registrada.');
  });
});
