import { NotificationCategoryEnum } from './enums/notification-category';
import { NotificationStatusEnum } from './enums/notification-status';
import { RoleEnum } from './enums/role';

/** Fixed id of the single acknowledgments document inside `notifications/{id}/acknowledgments`. */
export const NOTIFICATION_ACKNOWLEDGMENTS_DOC_ID = 'summary';

/** App-wide message broadcast by the App Admin. `content` is Markdown. */
export type Notification = {
  id: string;
  title: string;
  content: string;
  category: NotificationCategoryEnum;
  /** Label of the primary confirmation button. */
  actionLabel: string;
  status: NotificationStatusEnum;
  /** Roles the Notification is visible to; null means every role. */
  targetRoles?: RoleEnum[] | null;
  createdAt: Date;
};

/** What the notification dialog renders, shared by saved and not-yet-published notifications. */
export type NotificationContent = Pick<Notification, 'title' | 'content' | 'category'>;

/** Snapshot of a Notification the User acknowledged, stored under `users/{userId}/notifications`. */
export type UserNotification = Pick<Notification, 'id' | 'title' | 'content' | 'category' | 'actionLabel'> & {
  notificationId: string;
  acknowledgedAt: Date;
};

export type NotificationAcknowledgmentEntry = {
  userId: string;
  name: string;
  congregationName: string;
  role: RoleEnum;
  acknowledgedAt: Date;
};

export type NotificationAcknowledgmentsSummary = {
  id: string;
  notificationId: string;
  users: Record<string, NotificationAcknowledgmentEntry>;
};
