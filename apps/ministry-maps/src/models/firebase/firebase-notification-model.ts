import { Timestamp } from 'firebase/firestore';

import {
  Notification,
  NotificationAcknowledgmentEntry,
  NotificationAcknowledgmentsSummary,
  UserNotification,
} from '../notification';

export type FirebaseNotificationModel = Omit<Notification, 'createdAt'> & { createdAt: Timestamp };

export type FirebaseUserNotificationModel = Omit<UserNotification, 'acknowledgedAt'> & { acknowledgedAt: Timestamp };

export type FirebaseNotificationAcknowledgmentEntry = Omit<NotificationAcknowledgmentEntry, 'acknowledgedAt'> & {
  acknowledgedAt: Timestamp;
};

export type FirebaseNotificationAcknowledgmentsSummaryModel = Omit<NotificationAcknowledgmentsSummary, 'users'> & {
  users?: Record<string, FirebaseNotificationAcknowledgmentEntry>;
};
