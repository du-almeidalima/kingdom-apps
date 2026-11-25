import { inject, Injectable } from '@angular/core';
import { map, MonoTypeOperatorFunction, Observable, of, switchMap, tap } from 'rxjs';

import { NotificationRepository } from '../../../../repositories/notification.repository';
import { LoggerService } from '../../../../shared/services/logger/logger.service';
import { NotificationStatusEnum } from '../../../../../models/enums/notification-status';
import { RoleEnum } from '../../../../../models/enums/role';
import {
  Notification,
  NotificationAcknowledgmentEntry,
  NotificationAcknowledgmentsSummary,
  NotificationContent,
  UserNotification,
} from '../../../../../models/notification';
import { User } from '../../../../../models/user';

export type NotificationDraft = NotificationContent & { actionLabel: string; targetRoles?: RoleEnum[] };

@Injectable({ providedIn: 'root' })
export class NotificationBO {
  static readonly HISTORY_PAGE_SIZE = 5;

  private readonly notificationRepository = inject(NotificationRepository);
  private readonly loggerService = inject(LoggerService);

  getAll(): Observable<Notification[]> {
    return this.notificationRepository.getAll().pipe(this.logFailure('Error loading notifications'));
  }

  getById(id: string): Observable<Notification | undefined> {
    return this.notificationRepository.getById(id).pipe(this.logFailure('Error loading notification'));
  }

  getAcknowledgments(notificationId: string): Observable<NotificationAcknowledgmentEntry[]> {
    return this.notificationRepository.getAcknowledgmentsSummary(notificationId).pipe(
      this.logFailure('Error loading notification acknowledgments'),
      map((summary) => NotificationBO.acknowledgmentsNewestFirst(summary)),
    );
  }

  /** Active Notifications visible to the user's role that they have not acknowledged, oldest first. Reads no user data when none are visible. */
  getUnread(user: User): Observable<Notification[]> {
    return this.notificationRepository.getActive(user.role).pipe(
      switchMap((active) =>
        active.length === 0
          ? of([])
          : this.notificationRepository
              .getAcknowledgedIds(
                user.id,
                active.map((notification) => notification.id),
              )
              .pipe(
                map((acknowledgedIds) => active.filter((notification) => !acknowledgedIds.includes(notification.id))),
              ),
      ),
      map((unread) => unread.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())),
      this.logFailure('Error loading unread notifications'),
    );
  }

  acknowledge(notification: Notification, user: User): Observable<void> {
    const acknowledgedAt = new Date();

    return this.notificationRepository
      .acknowledge(
        user.id,
        {
          id: notification.id,
          notificationId: notification.id,
          title: notification.title,
          content: notification.content,
          category: notification.category,
          actionLabel: notification.actionLabel,
          acknowledgedAt,
        },
        {
          userId: user.id,
          name: user.name,
          congregationName: user.congregation?.name ?? '',
          role: user.role,
          acknowledgedAt,
        },
      )
      .pipe(this.logFailure('Error recording notification acknowledgment'));
  }

  /** The first page of the User's acknowledged Notifications, or every older one after `startAfterAcknowledgedAt`. */
  getHistory(userId: string, startAfterAcknowledgedAt?: Date): Observable<UserNotification[]> {
    const history = startAfterAcknowledgedAt
      ? this.notificationRepository.getUserHistory(userId, undefined, startAfterAcknowledgedAt)
      : this.notificationRepository.getUserHistory(userId, NotificationBO.HISTORY_PAGE_SIZE);

    return history.pipe(this.logFailure('Error loading notification history'));
  }

  publish(draft: NotificationDraft): Observable<void> {
    return this.notificationRepository
      .add({
        ...draft,
        status: NotificationStatusEnum.ACTIVE,
        createdAt: new Date(),
      })
      .pipe(this.logFailure('Error publishing notification'));
  }

  toggleStatus(notification: Notification): Observable<void> {
    const next =
      notification.status === NotificationStatusEnum.ACTIVE
        ? NotificationStatusEnum.INACTIVE
        : NotificationStatusEnum.ACTIVE;

    return this.notificationRepository
      .updateStatus(notification.id, next)
      .pipe(this.logFailure('Error toggling notification status'));
  }

  delete(id: string): Observable<void> {
    return this.notificationRepository.delete(id).pipe(this.logFailure('Error deleting notification'));
  }

  /** Logs the failure and rethrows it, so the pages still show their own error toasts. */
  private logFailure<T>(message: string): MonoTypeOperatorFunction<T> {
    return tap({ error: (error) => this.loggerService.error(message + ': ' + error) });
  }

  private static acknowledgmentsNewestFirst(
    summary: NotificationAcknowledgmentsSummary | undefined,
  ): NotificationAcknowledgmentEntry[] {
    return Object.values(summary?.users ?? {}).sort((a, b) => b.acknowledgedAt.getTime() - a.acknowledgedAt.getTime());
  }
}
