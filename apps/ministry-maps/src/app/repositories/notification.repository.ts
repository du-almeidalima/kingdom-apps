import { Observable } from 'rxjs';

import { RoleEnum } from '../../models/enums/role';
import { NotificationStatusEnum } from '../../models/enums/notification-status';
import {
  Notification,
  NotificationAcknowledgmentEntry,
  NotificationAcknowledgmentsSummary,
  UserNotification,
} from '../../models/notification';

export abstract class NotificationRepository {
  /** Live list of every Notification, newest first. */
  abstract getAll(): Observable<Notification[]>;
  /** One-shot list of the ACTIVE Notifications visible to the given role; every one when omitted. */
  abstract getActive(role?: RoleEnum): Observable<Notification[]>;
  /** Of the given Notification ids, those the User already acknowledged. */
  abstract getAcknowledgedIds(userId: string, notificationIds: string[]): Observable<string[]>;
  /** The User's acknowledged Notifications, newest acknowledgment first. Omitting `pageSize` loads everything after the cursor. */
  abstract getUserHistory(
    userId: string,
    pageSize?: number,
    startAfterAcknowledgedAt?: Date,
  ): Observable<UserNotification[]>;
  /** Records an Acknowledgment: the User's snapshot and the summary entry in one batch. */
  abstract acknowledge(
    userId: string,
    notification: UserNotification,
    entry: NotificationAcknowledgmentEntry,
  ): Observable<void>;
  /** Live Notification document (`undefined` when missing). */
  abstract getById(id: string): Observable<Notification | undefined>;
  /** Live acknowledgments summary (`undefined` until the first Acknowledgment is recorded). */
  abstract getAcknowledgmentsSummary(
    notificationId: string,
  ): Observable<NotificationAcknowledgmentsSummary | undefined>;
  /** Creates a Notification under a fresh id. Authenticated App Admin only. */
  abstract add(notification: Omit<Notification, 'id'>): Observable<void>;
  abstract updateStatus(id: string, status: NotificationStatusEnum): Observable<void>;
  /** Deletes the Notification and its acknowledgments summary in one batch. */
  abstract delete(id: string): Observable<void>;
}
