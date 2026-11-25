import { inject, Injectable } from '@angular/core';
import {
  and,
  collection,
  CollectionReference,
  doc,
  DocumentReference,
  getDoc,
  getDocs,
  limit,
  or,
  orderBy,
  query,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { defer, forkJoin, from, map, Observable, of } from 'rxjs';

import { NotificationStatusEnum } from '../../../models/enums/notification-status';
import { RoleEnum } from '../../../models/enums/role';
import {
  Notification,
  NOTIFICATION_ACKNOWLEDGMENTS_DOC_ID,
  NotificationAcknowledgmentEntry,
  NotificationAcknowledgmentsSummary,
  UserNotification,
} from '../../../models/notification';
import {
  FirebaseNotificationAcknowledgmentsSummaryModel,
  FirebaseNotificationModel,
  FirebaseUserNotificationModel,
} from '../../../models/firebase/firebase-notification-model';
import { firebaseEntityConverterFactory } from '../../shared/utils/firebase-entity-converter';
import { NotificationRepository } from '../notification.repository';
import { FirebaseUserDatasourceService } from './firebase-user-datasource.service';
import { collectionData$, docData$ } from './firebase-rxjs-interop';
import { FIRESTORE } from './firebase-providers';

const convertNotificationFirebaseTimestampsToDate = (data: FirebaseNotificationModel): Notification => ({
  ...data,
  createdAt: data.createdAt.toDate(),
});

const convertAcknowledgmentsSummaryFirebaseTimestampsToDate = (
  data: FirebaseNotificationAcknowledgmentsSummaryModel,
): NotificationAcknowledgmentsSummary => ({
  ...data,
  users: Object.fromEntries(
    Object.entries(data.users ?? {}).map(([userId, entry]) => [
      userId,
      { ...entry, acknowledgedAt: entry.acknowledgedAt.toDate() },
    ]),
  ),
});

const convertUserNotificationFirebaseTimestampsToDate = (data: FirebaseUserNotificationModel): UserNotification => ({
  ...data,
  acknowledgedAt: data.acknowledgedAt.toDate(),
});

@Injectable({ providedIn: 'root' })
export class FirebaseNotificationDatasourceService implements NotificationRepository {
  static readonly COLLECTION_NAME = 'notifications';
  static readonly ACKNOWLEDGMENTS_SUBCOLLECTION_NAME = 'acknowledgments';
  static readonly USER_NOTIFICATIONS_SUBCOLLECTION_NAME = 'notifications';

  private readonly firestore = inject(FIRESTORE);

  private readonly notificationsCollection: CollectionReference<Notification> = collection(
    this.firestore,
    FirebaseNotificationDatasourceService.COLLECTION_NAME,
  ).withConverter<Notification>(firebaseEntityConverterFactory(convertNotificationFirebaseTimestampsToDate));

  getAll(): Observable<Notification[]> {
    return collectionData$(query(this.notificationsCollection, orderBy('createdAt', 'desc')));
  }

  getActive(role?: RoleEnum): Observable<Notification[]> {
    return defer(() => {
      // The query() typings only accept a composite filter as the leading constraint,
      // so the status equality repeats inside each or() arm.
      const q =
        role === undefined
          ? query(this.notificationsCollection, where('status', '==', NotificationStatusEnum.ACTIVE))
          : query(
              this.notificationsCollection,
              or(
                and(
                  where('status', '==', NotificationStatusEnum.ACTIVE),
                  where('targetRoles', 'array-contains', role),
                ),
                // targetRoles: null marks an app-wide notification.
                and(where('status', '==', NotificationStatusEnum.ACTIVE), where('targetRoles', '==', null)),
              ),
            );
      return from(getDocs(q));
    }).pipe(map((snapshot) => snapshot.docs.map((item) => item.data())));
  }

  getAcknowledgedIds(userId: string, notificationIds: string[]): Observable<string[]> {
    if (notificationIds.length === 0) return of([]);

    return forkJoin(
      notificationIds.map((id) =>
        defer(() => from(getDoc(doc(this.userNotificationsCollection(userId), id)))).pipe(
          map((snapshot) => (snapshot.exists() ? id : null)),
        ),
      ),
    ).pipe(map((ids) => ids.filter((id): id is string => id !== null)));
  }

  getUserHistory(userId: string, pageSize?: number, startAfterAcknowledgedAt?: Date): Observable<UserNotification[]> {
    return defer(() => {
      const q = query(
        this.userNotificationsCollection(userId),
        orderBy('acknowledgedAt', 'desc'),
        ...(startAfterAcknowledgedAt ? [startAfter(Timestamp.fromDate(startAfterAcknowledgedAt))] : []),
        ...(pageSize ? [limit(pageSize)] : []),
      );
      return from(getDocs(q));
    }).pipe(map((snapshot) => snapshot.docs.map((item) => item.data())));
  }

  getById(id: string): Observable<Notification | undefined> {
    return docData$(doc(this.notificationsCollection, id));
  }

  getAcknowledgmentsSummary(notificationId: string): Observable<NotificationAcknowledgmentsSummary | undefined> {
    return defer(() => getDoc(this.acknowledgmentsSummaryRef(notificationId))).pipe(map((snapshot) => snapshot.data()));
  }

  acknowledge(
    userId: string,
    notification: UserNotification,
    entry: NotificationAcknowledgmentEntry,
  ): Observable<void> {
    return defer(() => {
      const batch = writeBatch(this.firestore);
      batch.set(doc(this.userNotificationsCollection(userId), notification.id), notification);
      batch.set(
        this.acknowledgmentsSummaryRef(notification.id),
        { id: NOTIFICATION_ACKNOWLEDGMENTS_DOC_ID, notificationId: notification.id, users: { [userId]: entry } },
        { merge: true },
      );
      return from(batch.commit());
    });
  }

  add(notification: Omit<Notification, 'id'>): Observable<void> {
    return defer(() => {
      const ref = doc(this.notificationsCollection);
      const { targetRoles, ...rest } = notification;
      return from(setDoc(ref, { ...rest, targetRoles: targetRoles?.length ? targetRoles : null, id: ref.id }));
    });
  }

  updateStatus(id: string, status: NotificationStatusEnum): Observable<void> {
    return defer(() => from(updateDoc(doc(this.notificationsCollection, id), { status })));
  }

  delete(id: string): Observable<void> {
    return defer(() => {
      const batch = writeBatch(this.firestore);
      batch.delete(doc(this.notificationsCollection, id));
      batch.delete(this.acknowledgmentsSummaryRef(id));
      return from(batch.commit());
    });
  }

  private userNotificationsCollection(userId: string): CollectionReference<UserNotification> {
    return collection(
      this.firestore,
      FirebaseUserDatasourceService.COLLECTION_NAME,
      userId,
      FirebaseNotificationDatasourceService.USER_NOTIFICATIONS_SUBCOLLECTION_NAME,
    ).withConverter<UserNotification>(firebaseEntityConverterFactory(convertUserNotificationFirebaseTimestampsToDate));
  }

  private acknowledgmentsSummaryRef(notificationId: string): DocumentReference<NotificationAcknowledgmentsSummary> {
    return doc(
      this.firestore,
      FirebaseNotificationDatasourceService.COLLECTION_NAME,
      notificationId,
      FirebaseNotificationDatasourceService.ACKNOWLEDGMENTS_SUBCOLLECTION_NAME,
      NOTIFICATION_ACKNOWLEDGMENTS_DOC_ID,
    ).withConverter<NotificationAcknowledgmentsSummary>(
      firebaseEntityConverterFactory(convertAcknowledgmentsSummaryFirebaseTimestampsToDate),
    );
  }
}
