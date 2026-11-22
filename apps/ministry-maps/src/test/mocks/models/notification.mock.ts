import { EMPTY, Observable } from 'rxjs';

import { NotificationRepository } from '../../../app/repositories/notification.repository';
import { NotificationCategoryEnum } from '../../../models/enums/notification-category';
import { NotificationStatusEnum } from '../../../models/enums/notification-status';
import {
  Notification,
  NotificationAcknowledgmentEntry,
  NotificationAcknowledgmentsSummary,
  UserNotification,
} from '../../../models/notification';

export class NotificationRepositoryMock implements NotificationRepository {
  getAll(): Observable<Notification[]> {
    return EMPTY;
  }

  getActive(_role?: RoleEnum): Observable<Notification[]> {
    return EMPTY;
  }

  getAcknowledgedIds(_userId: string, _notificationIds: string[]): Observable<string[]> {
    return EMPTY;
  }

  getUserHistory(
    _userId: string,
    _pageSize?: number,
    _startAfterAcknowledgedAt?: Date,
  ): Observable<UserNotification[]> {
    return EMPTY;
  }

  acknowledge(
    _userId: string,
    _notification: UserNotification,
    _entry: NotificationAcknowledgmentEntry,
  ): Observable<void> {
    return EMPTY;
  }

  getById(_id: string): Observable<Notification | undefined> {
    return EMPTY;
  }

  getAcknowledgmentsSummary(_notificationId: string): Observable<NotificationAcknowledgmentsSummary | undefined> {
    return EMPTY;
  }

  add(_notification: Omit<Notification, 'id'>): Observable<void> {
    return EMPTY;
  }

  updateStatus(_id: string, _status: NotificationStatusEnum): Observable<void> {
    return EMPTY;
  }

  delete(_id: string): Observable<void> {
    return EMPTY;
  }
}

export const notificationMockBuilder = (partial: Partial<Notification> = {}): Notification => ({
  id: 'NOTIFICATION-1',
  title: 'Atualização dos termos de uso',
  content: 'Leia com atenção.',
  category: NotificationCategoryEnum.INFO,
  actionLabel: 'Entendi',
  status: NotificationStatusEnum.ACTIVE,
  createdAt: new Date(2026, 8, 1, 12, 0, 0),
  ...partial,
});
