import { TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { lastValueFrom, of, throwError } from 'rxjs';

import { NotificationRepository } from '../../../../repositories/notification.repository';
import { LoggerService } from '../../../../shared/services/logger/logger.service';
import { NotificationCategoryEnum } from '../../../../../models/enums/notification-category';
import { NotificationStatusEnum } from '../../../../../models/enums/notification-status';
import { RoleEnum } from '../../../../../models/enums/role';
import { NotificationAcknowledgmentsSummary } from '../../../../../models/notification';
import { User } from '../../../../../models/user';
import { congregationMock, notificationMockBuilder } from '../../../../../test/mocks';
import { NotificationBO } from './notification.bo';

describe('NotificationBO', () => {
  let bo: NotificationBO;
  let repository: jest.Mocked<NotificationRepository>;

  const acknowledgedBy = (userId: string, acknowledgedAt: string) => ({
    userId,
    name: `Pessoa ${userId}`,
    congregationName: 'Central',
    role: RoleEnum.PUBLISHER,
    acknowledgedAt: new Date(acknowledgedAt),
  });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-10T15:00:00Z'));
    TestBed.configureTestingModule({
      providers: [
        NotificationBO,
        MockProvider(LoggerService),
        MockProvider(NotificationRepository, {
          add: jest.fn().mockReturnValue(of(undefined)),
          updateStatus: jest.fn().mockReturnValue(of(undefined)),
          delete: jest.fn().mockReturnValue(of(undefined)),
          getAcknowledgmentsSummary: jest.fn().mockReturnValue(of(undefined)),
          getActive: jest.fn(),
          getAcknowledgedIds: jest.fn(),
          getUserHistory: jest.fn(),
          acknowledge: jest.fn(),
        }),
      ],
    });
    bo = TestBed.inject(NotificationBO);
    repository = TestBed.inject(NotificationRepository) as jest.Mocked<NotificationRepository>;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('publishes a draft as an ACTIVE notification created now', async () => {
    await lastValueFrom(
      bo.publish({
        title: 'Manutenção',
        content: '## Sábado',
        category: NotificationCategoryEnum.WARNING,
        actionLabel: 'Aceitar e continuar',
      }),
    );

    expect(repository.add).toHaveBeenCalledWith({
      title: 'Manutenção',
      content: '## Sábado',
      category: NotificationCategoryEnum.WARNING,
      actionLabel: 'Aceitar e continuar',
      status: NotificationStatusEnum.ACTIVE,
      createdAt: new Date('2026-11-10T15:00:00Z'),
    });
  });

  it.each([
    [NotificationStatusEnum.ACTIVE, NotificationStatusEnum.INACTIVE],
    [NotificationStatusEnum.INACTIVE, NotificationStatusEnum.ACTIVE],
  ])('toggles a %s notification to %s', async (current, next) => {
    await lastValueFrom(bo.toggleStatus(notificationMockBuilder({ id: 'N1', status: current })));

    expect(repository.updateStatus).toHaveBeenCalledWith('N1', next);
  });

  it('lists acknowledgments newest first from the single summary document', async () => {
    const summary: NotificationAcknowledgmentsSummary = {
      id: 'summary',
      notificationId: 'N1',
      users: {
        U1: acknowledgedBy('U1', '2026-11-02T08:00:00Z'),
        U2: acknowledgedBy('U2', '2026-11-04T09:00:00Z'),
        U3: acknowledgedBy('U3', '2026-11-03T10:00:00Z'),
      },
    };
    repository.getAcknowledgmentsSummary.mockReturnValue(of(summary));

    const entries = await lastValueFrom(bo.getAcknowledgments('N1'));

    expect(repository.getAcknowledgmentsSummary).toHaveBeenCalledWith('N1');
    expect(entries.map((entry) => entry.userId)).toEqual(['U2', 'U3', 'U1']);
  });

  it('returns no acknowledgments before the summary document exists', async () => {
    expect(await lastValueFrom(bo.getAcknowledgments('N1'))).toEqual([]);
  });

  it('deletes a notification by id through the repository', async () => {
    await lastValueFrom(bo.delete('N1'));

    expect(repository.delete).toHaveBeenCalledWith('N1');
  });

  it('logs a failed publish and rethrows it so the page can report it', async () => {
    repository.add.mockReturnValue(throwError(() => new Error('offline')));
    const loggerError = jest.mocked(TestBed.inject(LoggerService).error);

    await expect(
      lastValueFrom(
        bo.publish({
          title: 'Manutenção',
          content: '## Sábado',
          category: NotificationCategoryEnum.WARNING,
          actionLabel: 'Entendi',
        }),
      ),
    ).rejects.toThrow('offline');
    expect(loggerError).toHaveBeenCalledWith(expect.stringContaining('Error publishing notification'));
  });

  describe('login queue', () => {
    const active = (id: string, createdAt: string) =>
      notificationMockBuilder({ id, createdAt: new Date(createdAt), status: NotificationStatusEnum.ACTIVE });
    const user: User = {
      id: 'U1',
      name: 'Ana Souza',
      email: 'ana@email.com',
      role: RoleEnum.ELDER,
      congregation: congregationMock,
    };

    it('reads no user notifications when no notification is ACTIVE', async () => {
      repository.getActive.mockReturnValue(of([]));

      expect(await lastValueFrom(bo.getUnread(user))).toEqual([]);
      expect(repository.getAcknowledgedIds).not.toHaveBeenCalled();
    });

    it('keeps the ACTIVE notifications the user has not acknowledged, oldest first', async () => {
      repository.getActive.mockReturnValue(
        of([
          active('N2', '2026-11-05T12:00:00Z'),
          active('N1', '2026-11-01T12:00:00Z'),
          active('N3', '2026-11-08T12:00:00Z'),
        ]),
      );
      repository.getAcknowledgedIds.mockReturnValue(of(['N3']));

      const unread = await lastValueFrom(bo.getUnread(user));

      expect(repository.getActive).toHaveBeenCalledWith(user.role);
      expect(repository.getAcknowledgedIds).toHaveBeenCalledWith('U1', ['N2', 'N1', 'N3']);
      expect(unread.map((notification) => notification.id)).toEqual(['N1', 'N2']);
    });

    it('records the acknowledgment for the user and the notification in one call', async () => {
      repository.acknowledge.mockReturnValue(of(undefined));

      await lastValueFrom(bo.acknowledge(notificationMockBuilder({ id: 'N1' }), user));

      const acknowledgedAt = new Date('2026-11-10T15:00:00Z');
      expect(repository.acknowledge).toHaveBeenCalledWith(
        'U1',
        {
          id: 'N1',
          notificationId: 'N1',
          title: 'Atualização dos termos de uso',
          content: 'Leia com atenção.',
          category: NotificationCategoryEnum.INFO,
          actionLabel: 'Entendi',
          acknowledgedAt,
        },
        {
          userId: 'U1',
          name: 'Ana Souza',
          congregationName: 'LS Test Congregation',
          role: RoleEnum.ELDER,
          acknowledgedAt,
        },
      );
    });

    it('loads the five most recently acknowledged notifications first', async () => {
      repository.getUserHistory.mockReturnValue(of([]));

      await lastValueFrom(bo.getHistory('U1'));

      expect(repository.getUserHistory).toHaveBeenCalledWith('U1', 5);
    });

    it('loads every older acknowledgment after the last one already shown', async () => {
      repository.getUserHistory.mockReturnValue(of([]));
      const lastShown = new Date('2026-11-02T08:00:00Z');

      await lastValueFrom(bo.getHistory('U1', lastShown));

      expect(repository.getUserHistory).toHaveBeenCalledWith('U1', undefined, lastShown);
    });
  });
});
