import { By } from '@angular/platform-browser';
import { ToasterService } from '@kingdom-apps/common-ui';
import { MockBuilder, MockInstance, MockRender, ngMocks } from 'ng-mocks';
import { EMPTY, Subject, of, throwError } from 'rxjs';

import { Notification } from '../../../../../models/notification';
import { notificationMockBuilder } from '../../../../../test/mocks';
import { NotificationBO } from '../../bo/notification/notification.bo';
import { NotificationListItemComponent } from '../../components/notification-list-item/notification-list-item.component';
import { NotificationStatusBadgeComponent } from '../../components/notification-status-badge/notification-status-badge.component';
import { NotificationsPageComponent } from './notifications-page.component';

describe('NotificationsPageComponent', () => {
  beforeEach(() => MockBuilder(NotificationsPageComponent).mock(NotificationBO).mock(ToasterService));
  MockInstance.scope();

  const newestFirst: Notification[] = [
    notificationMockBuilder({ id: 'N3', title: 'Terceira', createdAt: new Date(2026, 9, 3) }),
    notificationMockBuilder({ id: 'N2', title: 'Segunda', createdAt: new Date(2026, 9, 2) }),
    notificationMockBuilder({ id: 'N1', title: 'Primeira', createdAt: new Date(2026, 9, 1) }),
  ];

  it('lists every notification in the order the business object returns them', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.getAll).mockReturnValue(of(newestFirst));
    });

    const fixture = MockRender(NotificationsPageComponent);
    const items = ngMocks.findAll(fixture, NotificationListItemComponent);
    const badges = ngMocks.findAll(fixture, NotificationStatusBadgeComponent);

    expect(items.map((item) => ngMocks.input(item, 'title'))).toEqual(['Terceira', 'Segunda', 'Primeira']);
    expect(items.map((item) => ngMocks.input(item, 'date'))).toEqual(
      newestFirst.map((notification) => notification.createdAt),
    );
    expect(items.map((item) => ngMocks.input(item, 'category'))).toEqual(
      newestFirst.map((notification) => notification.category),
    );
    expect(badges.map((badge) => ngMocks.input(badge, 'status'))).toEqual(
      newestFirst.map((notification) => notification.status),
    );
  });

  it('links each listed notification to its details page', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.getAll).mockReturnValue(of(newestFirst));
    });

    const fixture = MockRender(NotificationsPageComponent);
    const links = fixture.debugElement.queryAll(By.css('[data-testid="notification-list-item"]'));

    expect(links.map((link) => ngMocks.input(link, 'routerLink'))).toEqual([
      ['/', 'notifications', 'N3'],
      ['/', 'notifications', 'N2'],
      ['/', 'notifications', 'N1'],
    ]);
  });

  it('shows the empty state when there are no notifications', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.getAll).mockReturnValue(of([]));
    });

    const fixture = MockRender(NotificationsPageComponent);

    expect(ngMocks.find(fixture, '[data-testid="notifications-empty"]')).toBeTruthy();
    expect(ngMocks.findAll(fixture, '[data-testid="notifications-list"]')).toHaveLength(0);
  });

  it('shows a spinner until the notifications arrive', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.getAll).mockReturnValue(new Subject<Notification[]>());
    });

    const fixture = MockRender(NotificationsPageComponent);

    expect(ngMocks.find(fixture, '[data-testid="notifications-loading"]')).toBeTruthy();
  });

  it('warns and shows the empty state when loading fails', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.getAll).mockReturnValue(throwError(() => new Error('offline')));
    });

    const fixture = MockRender(NotificationsPageComponent);

    expect(ngMocks.get(ToasterService).error).toHaveBeenCalledWith(expect.stringContaining('carregar'));
    expect(ngMocks.find(fixture, '[data-testid="notifications-empty"]')).toBeTruthy();
  });

  it('opens the creation page from the Nova Notificação action', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.getAll).mockReturnValue(EMPTY);
    });

    const fixture = MockRender(NotificationsPageComponent);
    const action = fixture.debugElement.query(By.css('[data-testid="notifications-new-button"]'));

    expect(ngMocks.input(action, 'routerLink')).toEqual(['/', 'notifications', 'new']);
  });
});
