import { TestBed } from '@angular/core/testing';
import {
  and,
  collection,
  doc,
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
import { lastValueFrom, of } from 'rxjs';

import { NotificationCategoryEnum } from '../../../models/enums/notification-category';
import { NotificationStatusEnum } from '../../../models/enums/notification-status';
import { RoleEnum } from '../../../models/enums/role';
import { Notification, NotificationAcknowledgmentEntry, UserNotification } from '../../../models/notification';
import { FirebaseNotificationDatasourceService } from './firebase-notification-datasource.service';
import { FIRESTORE } from './firebase-providers';
import { collectionData$, docData$ } from './firebase-rxjs-interop';

jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  limit: jest.fn(),
  and: jest.fn(),
  or: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  setDoc: jest.fn(),
  startAfter: jest.fn(),
  updateDoc: jest.fn(),
  where: jest.fn(),
  writeBatch: jest.fn(),
}));
jest.mock('./firebase-rxjs-interop', () => ({
  ...jest.requireActual('./firebase-rxjs-interop'),
  collectionData$: jest.fn(),
  docData$: jest.fn(),
}));

const refAt = (path: string) => ({
  id: path.split('/').at(-1),
  path,
  withConverter: jest.fn((converter: unknown) => ({ id: path.split('/').at(-1), path, converter })),
});

describe('FirebaseNotificationDatasourceService', () => {
  let service: FirebaseNotificationDatasourceService;
  let collectionRef: { path: string; withConverter: jest.Mock };
  let batch: { delete: jest.Mock; set: jest.Mock; commit: jest.Mock };

  const notification: Notification = {
    id: 'N1',
    title: 'Termos de uso atualizados',
    content: '## Termos',
    category: NotificationCategoryEnum.INFO,
    actionLabel: 'Entendi',
    status: NotificationStatusEnum.ACTIVE,
    createdAt: new Date('2026-11-01T12:00:00Z'),
  };

  const acknowledgedAt = new Date('2026-11-02T08:30:00Z');
  const userNotification: UserNotification = {
    id: 'N1',
    notificationId: 'N1',
    title: notification.title,
    content: notification.content,
    category: notification.category,
    actionLabel: notification.actionLabel,
    acknowledgedAt,
  };
  const entry: NotificationAcknowledgmentEntry = {
    userId: 'U1',
    name: 'Ana',
    congregationName: 'Central',
    role: RoleEnum.ELDER,
    acknowledgedAt,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: FIRESTORE, useValue: {} }] });
    collectionRef = { path: 'notifications', withConverter: jest.fn().mockReturnThis() };
    batch = { delete: jest.fn(() => batch), set: jest.fn(() => batch), commit: jest.fn().mockResolvedValue(undefined) };
    (collection as jest.Mock).mockImplementation((_firestore: unknown, ...segments: string[]) =>
      segments.length === 1 ? collectionRef : refAt(segments.join('/')),
    );
    (doc as jest.Mock).mockImplementation((parent: { path?: string }, ...segments: string[]) =>
      refAt([parent.path, ...(segments.length ? segments : ['NEW-ID'])].filter(Boolean).join('/')),
    );
    (query as jest.Mock).mockReturnValue('QUERY');
    (orderBy as jest.Mock).mockReturnValue('ORDER');
    (and as jest.Mock).mockReturnValue('AND');
    (or as jest.Mock).mockReturnValue('OR');
    (where as jest.Mock).mockReturnValue('WHERE');
    (limit as jest.Mock).mockReturnValue('LIMIT');
    (startAfter as jest.Mock).mockReturnValue('START_AFTER');
    (getDocs as jest.Mock).mockResolvedValue({ docs: [] });
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    (writeBatch as jest.Mock).mockReturnValue(batch);
    (collectionData$ as jest.Mock).mockReturnValue(of([notification]));
    (docData$ as jest.Mock).mockReturnValue(of(undefined));
    (getDoc as jest.Mock).mockResolvedValue({ data: () => undefined });
    service = TestBed.inject(FirebaseNotificationDatasourceService);
  });

  afterEach(() => jest.clearAllMocks());

  it('streams every notification ordered newest first', async () => {
    const result = await lastValueFrom(service.getAll());

    expect(collection).toHaveBeenCalledWith({}, 'notifications');
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(query).toHaveBeenCalledWith(collectionRef, 'ORDER');
    expect(collectionData$).toHaveBeenCalledWith('QUERY');
    expect(result).toEqual([notification]);
  });

  it('reads every ACTIVE notification when no role is given', async () => {
    await lastValueFrom(service.getActive());

    expect(where).toHaveBeenCalledWith('status', '==', NotificationStatusEnum.ACTIVE);
    expect(where).not.toHaveBeenCalledWith('targetRoles', 'array-contains', expect.anything());
    expect(and).not.toHaveBeenCalled();
    expect(or).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(collectionRef, 'WHERE');
    expect(getDocs).toHaveBeenCalledWith('QUERY');
  });

  it('reads the ACTIVE notifications that target the given role or no role at all', async () => {
    await lastValueFrom(service.getActive(RoleEnum.ELDER));

    expect(where).toHaveBeenCalledWith('status', '==', NotificationStatusEnum.ACTIVE);
    expect(where).toHaveBeenCalledWith('targetRoles', 'array-contains', RoleEnum.ELDER);
    expect(where).toHaveBeenCalledWith('targetRoles', '==', null);
    expect(and).toHaveBeenCalledWith('WHERE', 'WHERE');
    expect(and).toHaveBeenCalledTimes(2);
    expect(or).toHaveBeenCalledWith('AND', 'AND');
    expect(query).toHaveBeenCalledWith(collectionRef, 'OR');
    expect(getDocs).toHaveBeenCalledWith('QUERY');
  });

  it('streams one notification document by id', async () => {
    (docData$ as jest.Mock).mockReturnValue(of(notification));

    const result = await lastValueFrom(service.getById('N1'));

    expect(docData$).toHaveBeenCalledWith(expect.objectContaining({ path: 'notifications/N1' }));
    expect(result).toBe(notification);
  });

  it('reads the acknowledgments summary document once, without a live listener', async () => {
    const summary = { id: 'summary', notificationId: 'N1', users: {} };
    (getDoc as jest.Mock).mockResolvedValue({ data: () => summary });

    expect(await lastValueFrom(service.getAcknowledgmentsSummary('N1'))).toBe(summary);
    expect(doc).toHaveBeenCalledWith({}, 'notifications', 'N1', 'acknowledgments', 'summary');
    expect(getDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'notifications/N1/acknowledgments/summary' }));
    expect(docData$).not.toHaveBeenCalled();
  });

  it('writes a new notification under a generated id only once subscribed', async () => {
    const write$ = service.add({
      title: notification.title,
      content: notification.content,
      category: notification.category,
      actionLabel: notification.actionLabel,
      status: NotificationStatusEnum.ACTIVE,
      createdAt: notification.createdAt,
    });

    expect(setDoc).not.toHaveBeenCalled();

    await lastValueFrom(write$);

    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'notifications/NEW-ID' }),
      expect.objectContaining({ id: 'NEW-ID', title: notification.title, status: NotificationStatusEnum.ACTIVE }),
    );
  });

  it('persists an untargeted notification as visible to every role', async () => {
    await lastValueFrom(
      service.add({
        title: notification.title,
        content: notification.content,
        category: notification.category,
        actionLabel: notification.actionLabel,
        status: NotificationStatusEnum.ACTIVE,
        createdAt: notification.createdAt,
      }),
    );

    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'notifications/NEW-ID' }),
      expect.objectContaining({ targetRoles: null }),
    );
  });

  it('persists an empty role selection as visible to every role', async () => {
    await lastValueFrom(
      service.add({
        title: notification.title,
        content: notification.content,
        category: notification.category,
        actionLabel: notification.actionLabel,
        status: NotificationStatusEnum.ACTIVE,
        createdAt: notification.createdAt,
        targetRoles: [],
      }),
    );

    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'notifications/NEW-ID' }),
      expect.objectContaining({ targetRoles: null }),
    );
  });

  it('persists the given target roles as selected', async () => {
    await lastValueFrom(
      service.add({
        title: notification.title,
        content: notification.content,
        category: notification.category,
        actionLabel: notification.actionLabel,
        status: NotificationStatusEnum.ACTIVE,
        createdAt: notification.createdAt,
        targetRoles: [RoleEnum.ELDER],
      }),
    );

    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'notifications/NEW-ID' }),
      expect.objectContaining({ targetRoles: [RoleEnum.ELDER] }),
    );
  });

  it('updates only the status field of a notification', async () => {
    await lastValueFrom(service.updateStatus('N1', NotificationStatusEnum.INACTIVE));

    expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'notifications/N1' }), {
      status: NotificationStatusEnum.INACTIVE,
    });
  });

  it('deletes the notification and its acknowledgments summary in one batch commit', async () => {
    await lastValueFrom(service.delete('N1'));

    expect(batch.delete.mock.calls.map(([ref]) => ref.path)).toEqual([
      'notifications/N1',
      'notifications/N1/acknowledgments/summary',
    ]);
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });

  it('converts notification timestamps to dates', () => {
    const converter = collectionRef.withConverter.mock.calls[0][0];

    const converted = converter.fromFirestore({
      id: 'N1',
      data: () => ({ ...notification, createdAt: Timestamp.fromDate(notification.createdAt) }),
    });

    expect(converted).toEqual(notification);
  });

  it('converts acknowledgment timestamps and defaults a missing users map to empty', () => {
    service.getAcknowledgmentsSummary('N1').subscribe();
    const converter = (getDoc as jest.Mock).mock.calls[0][0].converter;
    const acknowledgedAt = new Date('2026-11-02T08:30:00Z');

    const converted = converter.fromFirestore({
      id: 'summary',
      data: () => ({
        notificationId: 'N1',
        users: {
          U1: {
            userId: 'U1',
            name: 'Ana',
            congregationName: 'Central',
            role: RoleEnum.ELDER,
            acknowledgedAt: Timestamp.fromDate(acknowledgedAt),
          },
        },
      }),
    });
    const empty = converter.fromFirestore({ id: 'summary', data: () => ({ notificationId: 'N1' }) });

    expect(converted).toEqual({
      id: 'summary',
      notificationId: 'N1',
      users: { U1: expect.objectContaining({ name: 'Ana', acknowledgedAt }) },
    });
    expect(empty.users).toEqual({});
  });

  it('streams only the ACTIVE notifications for the login check', async () => {
    (getDocs as jest.Mock).mockResolvedValue({ docs: [{ id: 'N1', data: () => notification }] });

    const result = await lastValueFrom(service.getActive());

    expect(where).toHaveBeenCalledWith('status', '==', NotificationStatusEnum.ACTIVE);
    expect(getDocs).toHaveBeenCalledWith('QUERY');
    expect(result).toEqual([notification]);
  });

  it('reports which of the given notifications a user already acknowledged', async () => {
    (getDoc as jest.Mock).mockImplementation((ref: { id: string }) =>
      Promise.resolve({ id: ref.id, exists: () => ref.id === 'N1' }),
    );

    const result = await lastValueFrom(service.getAcknowledgedIds('U1', ['N1', 'N2']));

    expect(getDoc).toHaveBeenCalledTimes(2);
    expect(getDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/U1/notifications/N2' }));
    expect(result).toEqual(['N1']);
  });

  it('reads nothing when there are no notifications to check', async () => {
    const result = await lastValueFrom(service.getAcknowledgedIds('U1', []));

    expect(getDoc).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('loads the five most recently acknowledged notifications first', async () => {
    (getDocs as jest.Mock).mockResolvedValue({ docs: [{ id: 'N1', data: () => userNotification }] });

    const result = await lastValueFrom(service.getUserHistory('U1', 5));

    expect(orderBy).toHaveBeenCalledWith('acknowledgedAt', 'desc');
    expect(limit).toHaveBeenCalledWith(5);
    expect(startAfter).not.toHaveBeenCalled();
    expect(result).toEqual([userNotification]);
  });

  it('loads every older acknowledgment after the cursor without a page limit', async () => {
    await lastValueFrom(service.getUserHistory('U1', undefined, acknowledgedAt));

    expect(startAfter).toHaveBeenCalledWith(Timestamp.fromDate(acknowledgedAt));
    expect(limit).not.toHaveBeenCalled();
  });

  it('converts user notification timestamps to dates', async () => {
    await lastValueFrom(service.getUserHistory('U1', 5));
    const converter = (query as jest.Mock).mock.calls[0][0].converter;

    const converted = converter.fromFirestore({
      id: 'N1',
      data: () => ({ ...userNotification, acknowledgedAt: Timestamp.fromDate(acknowledgedAt) }),
    });

    expect(converted).toEqual(userNotification);
  });

  it('records an acknowledgment in the user subcollection and the summary in one batch', async () => {
    await lastValueFrom(service.acknowledge('U1', userNotification, entry));

    expect(batch.set).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ path: 'users/U1/notifications/N1' }),
      userNotification,
    );
    expect(batch.set).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ path: 'notifications/N1/acknowledgments/summary' }),
      { id: 'summary', notificationId: 'N1', users: { U1: entry } },
      { merge: true },
    );
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });
});
