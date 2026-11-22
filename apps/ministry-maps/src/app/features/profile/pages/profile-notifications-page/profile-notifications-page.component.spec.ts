import { Dialog } from '@angular/cdk/dialog';
import { DatePipe } from '@angular/common';
import { ButtonComponent, SpinnerComponent, ToasterService } from '@kingdom-apps/common-ui';
import { MockBuilder, MockInstance, MockRender, ngMocks } from 'ng-mocks';
import { of, throwError } from 'rxjs';

import { NotificationCategoryEnum } from '../../../../../models/enums/notification-category';
import { UserNotification } from '../../../../../models/notification';
import { userMockBuilder } from '../../../../../test/mocks';
import { UserStateService } from '../../../../state/user.state.service';
import { NotificationBO } from '../../../notification/bo/notification/notification.bo';
import { NotificationDialogComponent } from '../../../notification/components/notification-dialog/notification-dialog.component';
import { NotificationListItemComponent } from '../../../notification/components/notification-list-item/notification-list-item.component';
import { ProfileNotificationsPageComponent } from './profile-notifications-page.component';

describe('ProfileNotificationsPageComponent', () => {
  MockInstance.scope();

  const acknowledged = (index: number): UserNotification => ({
    id: `N${index}`,
    notificationId: `N${index}`,
    title: `Comunicado ${index}`,
    content: `Corpo ${index}`,
    category: NotificationCategoryEnum.INFO,
    actionLabel: 'Entendi',
    acknowledgedAt: new Date(Date.UTC(2026, 10, 20 - index)),
  });
  const firstPage = [1, 2, 3, 4, 5].map(acknowledged);

  const render = () =>
    MockRender(
      ProfileNotificationsPageComponent,
      {},
      { providers: [{ provide: UserStateService, useValue: { currentUser: userMockBuilder({ id: 'U1' }) } }] },
    );

  const titles = (fixture: ReturnType<typeof render>) =>
    ngMocks
      .findAll(fixture, '[data-testid="notification-list-item-title"]')
      .map((item) => item.nativeElement.textContent.trim());

  beforeEach(() =>
    MockBuilder(ProfileNotificationsPageComponent)
      .keep(ButtonComponent)
      .keep(SpinnerComponent)
      .keep(NotificationListItemComponent)
      .keep(DatePipe)
      .mock(NotificationBO)
      .mock(Dialog)
      .mock(ToasterService),
  );

  it('loads the five most recently acknowledged notifications of the signed-in user first', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.getHistory).mockReturnValue(of(firstPage));
    });

    const fixture = render();

    expect(ngMocks.get(NotificationBO).getHistory).toHaveBeenCalledWith('U1');
    expect(titles(fixture)).toEqual(['Comunicado 1', 'Comunicado 2', 'Comunicado 3', 'Comunicado 4', 'Comunicado 5']);
  });

  it('labels every acknowledged notification with its category', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.getHistory).mockReturnValue(of(firstPage));
    });

    const fixture = render();

    const labels = ngMocks
      .findAll(fixture, '[data-testid="notification-list-item-category"]')
      .map((item) => item.nativeElement.textContent.trim());
    expect(labels).toEqual(Array(5).fill('INFORMAÇÃO'));
  });

  it('offers to load every older notification when a full first page is shown', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.getHistory).mockReturnValue(of(firstPage));
    });

    const fixture = render();

    expect(ngMocks.find(fixture, '[data-testid="profile-notifications-load-all"]')).toBeTruthy();
  });

  it('appends every older notification after the last one shown when asked to load all', () => {
    MockInstance(NotificationBO, (instance) => {
      jest
        .mocked(instance.getHistory)
        .mockReturnValueOnce(of(firstPage))
        .mockReturnValueOnce(of([acknowledged(6)]));
    });
    const fixture = render();

    ngMocks.click(ngMocks.find(fixture, '[data-testid="profile-notifications-load-all"]'));
    fixture.detectChanges();

    expect(ngMocks.get(NotificationBO).getHistory).toHaveBeenLastCalledWith('U1', firstPage[4].acknowledgedAt);
    expect(titles(fixture)).toHaveLength(6);
    expect(titles(fixture).at(-1)).toBe('Comunicado 6');
    expect(ngMocks.findAll(fixture, '[data-testid="profile-notifications-load-all"]')).toHaveLength(0);
  });

  it('opens an acknowledged notification read-only in the viewer', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.getHistory).mockReturnValue(of([firstPage[0]]));
    });
    const fixture = render();

    ngMocks.click(ngMocks.find(fixture, '[data-testid="profile-notification-item"]'));

    expect(ngMocks.get(Dialog).open).toHaveBeenCalledWith(NotificationDialogComponent, {
      data: { category: NotificationCategoryEnum.INFO, title: 'Comunicado 1', content: 'Corpo 1' },
    });
  });

  it('says so when no notification was acknowledged yet', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.getHistory).mockReturnValue(of([]));
    });

    const fixture = render();

    expect(ngMocks.find(fixture, '[data-testid="profile-notifications-empty"]').nativeElement.textContent.trim()).toBe(
      'Nenhuma notificação confirmada.',
    );
  });

  it('reports a failed load instead of showing an empty history', () => {
    MockInstance(NotificationBO, (instance) => {
      jest.mocked(instance.getHistory).mockReturnValue(throwError(() => new Error('offline')));
    });

    render();

    expect(ngMocks.get(ToasterService).error).toHaveBeenCalledWith(
      'Não foi possível carregar o histórico de notificações.',
    );
  });
});
