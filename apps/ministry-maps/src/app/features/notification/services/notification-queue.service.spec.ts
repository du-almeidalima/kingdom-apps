import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { of, throwError } from 'rxjs';

import { userMockBuilder, notificationMockBuilder } from '../../../../test/mocks';
import { UserStateService } from '../../../state/user.state.service';
import { NotificationBO } from '../bo/notification/notification.bo';
import { NotificationQueueComponent } from '../components/notification-queue/notification-queue.component';
import { NotificationQueueService } from './notification-queue.service';

describe('NotificationQueueService', () => {
  let service: NotificationQueueService;
  let userState: UserStateService;
  let bo: jest.Mocked<NotificationBO>;
  let dialog: jest.Mocked<Dialog>;

  const user = userMockBuilder({});
  const unread = [notificationMockBuilder({ id: 'N1' })];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NotificationQueueService,
        UserStateService,
        MockProvider(NotificationBO, { getUnread: jest.fn().mockReturnValue(of(unread)) }),
        MockProvider(Dialog, { open: jest.fn() }),
      ],
    });
    service = TestBed.inject(NotificationQueueService);
    userState = TestBed.inject(UserStateService);
    bo = TestBed.inject(NotificationBO) as jest.Mocked<NotificationBO>;
    dialog = TestBed.inject(Dialog) as jest.Mocked<Dialog>;
  });

  describe('authenticated-user transition effect', () => {
    it('opens the queue when the user signs in', () => {
      userState.setUser(user);
      TestBed.tick();

      expect(bo.getUnread).toHaveBeenCalledWith(user);
      expect(dialog.open).toHaveBeenCalledWith(NotificationQueueComponent, {
        data: { user, notifications: unread },
        disableClose: true,
      });
    });

    it('opens nothing while signed out', () => {
      TestBed.tick();

      expect(bo.getUnread).not.toHaveBeenCalled();
      expect(dialog.open).not.toHaveBeenCalled();
    });

    it('does not re-open when the server refresh re-emits the same user', () => {
      userState.setUser(user);
      TestBed.tick();
      userState.setUser({ ...user });
      TestBed.tick();

      expect(bo.getUnread).toHaveBeenCalledTimes(1);
    });

    it('re-opens after a logout and sign-in cycle', () => {
      userState.setUser(user);
      TestBed.tick();
      userState.setUser(null);
      TestBed.tick();
      userState.setUser(user);
      TestBed.tick();

      expect(bo.getUnread).toHaveBeenCalledTimes(2);
    });
  });

  it('opens the unread notifications in one non-dismissible queue', () => {
    service.openUnread(user);

    expect(bo.getUnread).toHaveBeenCalledWith(user);
    expect(dialog.open).toHaveBeenCalledWith(NotificationQueueComponent, {
      data: { user, notifications: unread },
      disableClose: true,
    });
  });

  it('opens nothing when every active notification was already acknowledged', () => {
    bo.getUnread.mockReturnValue(of([]));

    service.openUnread(user);

    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('opens nothing and does not throw when the unread lookup fails', () => {
    bo.getUnread.mockReturnValue(throwError(() => new Error('offline')));

    expect(() => service.openUnread(user)).not.toThrow();
    expect(dialog.open).not.toHaveBeenCalled();
  });
});
